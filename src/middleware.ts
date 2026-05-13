import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';
import { fetchConfigurationDirect, isFeatureActive } from '@/app/utils/configurationService';
import { setAuthCookies } from '@/lib/auth/cookies';
import { refreshSaleorToken } from '@/lib/auth/saleorAuth';

type JwtPayload = { exp?: number };

const TOKEN_VALIDATION_TTL_MS = 10 * 1000;
const tokenValidationCache = new Map<string, { valid: boolean; ts: number }>();

function normalizeGraphqlUrl(raw?: string): string | null {
  if (!raw) return null;
  let url = raw.trim();
  if (!url) return null;
  const lower = url.toLowerCase();
  const hasGraphql = lower.endsWith('/graphql') || lower.endsWith('/graphql/');
  if (!hasGraphql) {
    url = url.replace(/\/+$/, '') + '/graphql/';
  }
  return url;
}

async function validateTokenWithSaleor(token: string): Promise<boolean> {
  const cached = tokenValidationCache.get(token);
  if (cached && Date.now() - cached.ts < TOKEN_VALIDATION_TTL_MS) {
    return cached.valid;
  }

  const apiUrl = normalizeGraphqlUrl(process.env.NEXT_PUBLIC_API_URL);
  if (!apiUrl) {
    tokenValidationCache.set(token, { valid: false, ts: Date.now() });
    return false;
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `JWT ${token}`,
      },
      body: JSON.stringify({
        query: `query TokenCheck { me { id } }`,
      }),
    });

    if (!res.ok) {
      tokenValidationCache.set(token, { valid: false, ts: Date.now() });
      return false;
    }

    const json = (await res.json()) as {
      data?: { me?: { id?: string } | null } | null;
      errors?: unknown;
    };

    const valid = Boolean(json?.data?.me?.id) && !json?.errors;
    tokenValidationCache.set(token, { valid, ts: Date.now() });
    return valid;
  } catch {
    // If Saleor is unreachable, treat as logged out for route protection.
    tokenValidationCache.set(token, { valid: false, ts: Date.now() });
    return false;
  }
}

const AUTH_ROUTES = [
  '/account/login',
  '/account/register',
  '/account/forgot-password',
  '/account/reset-password',
];

const PROTECTED_PREFIXES = ['/account', '/orders', '/settings'];

// Feature route mappings
const FEATURE_ROUTES = {
  '/locator': 'dealer_locator',
} as const;

// Configuration is now handled by the centralized service

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const normalizedPath =
    pathname.endsWith('/') && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;

  // Handle redirects for category and product slugs at root level
  // If URL is /<slug> where slug starts with 'c-', redirect to /category/<slug>
  // If URL is /<slug> where slug starts with 'i-', redirect to /product/<slug>
  const pathSegments = normalizedPath.split('/').filter(Boolean);
  if (pathSegments.length === 1) {
    const slug = pathSegments[0];

    if (slug.startsWith('c-')) {
      const categoryUrl = new URL(`/category/${slug}`, req.url);
      // Preserve query parameters
      req.nextUrl.searchParams.forEach((value: string, key: string) => {
        categoryUrl.searchParams.set(key, value);
      });
      return NextResponse.redirect(categoryUrl);
    }

    if (slug.startsWith('i-')) {
      const productUrl = new URL(`/product/${slug}`, req.url);
      // Preserve query parameters
      req.nextUrl.searchParams.forEach((value: string, key: string) => {
        productUrl.searchParams.set(key, value);
      });
      return NextResponse.redirect(productUrl);
    }
  }

  // Check feature route protection first
  const featureName = FEATURE_ROUTES[normalizedPath as keyof typeof FEATURE_ROUTES];
  if (featureName) {
    try {
      const configuration = await fetchConfigurationDirect();
      const isActive = isFeatureActive(configuration, featureName);
      
      if (!isActive) {
        // Redirect to home page if feature is not active
        const homeUrl = new URL('/', req.url);
        const response = NextResponse.redirect(homeUrl);
        
        const isProd = process.env.NODE_ENV === 'production';
        if (!isProd) {
          response.headers.set('x-middleware-redirect', `home:feature-disabled:${featureName}`);
        }
        return response;
      }
    } catch (error) {
      console.error('Error checking feature configuration:', error);
      // Allow access if there's an error (fail open)
    }
  }

  const tokenCookie = req.cookies.get('token');
  const refreshCookie = req.cookies.get('refreshToken');

  const isAuthRoute = AUTH_ROUTES.some(
    route => normalizedPath === route || normalizedPath.startsWith(route + '/')
  );

  const isProtectedRoute =
    PROTECTED_PREFIXES.some(
      prefix => normalizedPath === prefix || normalizedPath.startsWith(prefix + '/')
    ) && !isAuthRoute;

  const token = tokenCookie?.value || null;

  let isExpired = false;
  if (token) {
    try {
      const { exp } = jwtDecode<JwtPayload>(token);
      isExpired = !!exp && exp * 1000 <= Date.now();
    } catch {
      // If token can't be decoded, treat it as expired/invalid for protection logic.
      isExpired = true;
    }
  }

  // Only verify with Saleor when we need the answer for routing decisions.
  const shouldVerify = Boolean(token) && !isExpired && (isAuthRoute || isProtectedRoute);
  const tokenVerified = shouldVerify && token ? await validateTokenWithSaleor(token) : null;

  const isLoggedIn = Boolean(token) && !isExpired && (tokenVerified ?? true);

  // Debug headers only in non-prod and NEVER include token value
  const isProd = process.env.NODE_ENV === 'production';
  const debugHeaders: Record<string, string> = {
    'x-pathname': normalizedPath,
    'x-has-token': tokenCookie ? '1' : '0',
    'x-has-refresh': refreshCookie ? '1' : '0',
    'x-is-logged-in': isLoggedIn ? '1' : '0',
    'x-token-verified': tokenVerified === null ? 'skip' : tokenVerified ? '1' : '0',
    'x-is-auth-route': isAuthRoute ? '1' : '0',
    'x-is-protected-route': isProtectedRoute ? '1' : '0',
  };

  // If token exists but is expired/invalid, clear cookies first.
  if (tokenCookie && isExpired) {
    if (refreshCookie?.value) {
      try {
        const refreshed = await refreshSaleorToken(refreshCookie.value);
        if (refreshed.token) {
          const response = NextResponse.redirect(req.nextUrl);
          setAuthCookies(response, {
            token: refreshed.token,
            refreshToken: refreshed.refreshToken || refreshCookie.value,
          });
          if (!isProd) {
            response.headers.set('x-middleware-redirect', 'refresh:token-expired');
            Object.entries(debugHeaders).forEach(([k, v]) => response.headers.set(k, v));
          }
          return response;
        }
      } catch {
        // Fall through to clearing cookies below.
      }
    }

    const clearUrl = new URL('/api/auth/clear-cookies', req.url);
    clearUrl.searchParams.set('redirect', '/account/login');
    clearUrl.searchParams.set('reason', 'token-expired');
    const response = NextResponse.redirect(clearUrl);
    if (!isProd) {
      response.headers.set('x-middleware-redirect', 'login:token-expired');
      Object.entries(debugHeaders).forEach(([k, v]) => response.headers.set(k, v));
    }
    return response;
  }

  if (isLoggedIn && isAuthRoute) {
    const res = NextResponse.redirect(new URL('/', req.url));
    if (!isProd) {
      res.headers.set('x-middleware-redirect', 'home:auth-while-logged-in');
      Object.entries(debugHeaders).forEach(([k, v]) => res.headers.set(k, v));
    }
    return res;
  }

  // If we verified a token and it's invalid, treat it as logged out (clear cookies).
  if (tokenVerified === false && tokenCookie) {
    if (isProtectedRoute) {
      const loginUrl = new URL('/account/login', req.url);
      loginUrl.searchParams.set('next', normalizedPath);

      const clearUrl = new URL('/api/auth/clear-cookies', req.url);
      clearUrl.searchParams.set('redirect', loginUrl.pathname + loginUrl.search);
      clearUrl.searchParams.set('reason', 'token-invalid');

      const res = NextResponse.redirect(clearUrl);
      if (!isProd) {
        res.headers.set('x-middleware-redirect', 'login:token-invalid');
        Object.entries(debugHeaders).forEach(([k, v]) => res.headers.set(k, v));
      }
      return res;
    }

    const clearUrl = new URL('/api/auth/clear-cookies', req.url);
    clearUrl.searchParams.set('redirect', normalizedPath);
    clearUrl.searchParams.set('reason', 'token-invalid');
    const res = NextResponse.redirect(clearUrl);
    if (!isProd) {
      res.headers.set('x-middleware-redirect', 'clear:token-invalid');
      Object.entries(debugHeaders).forEach(([k, v]) => res.headers.set(k, v));
    }
    return res;
  }

  if (!isLoggedIn && isProtectedRoute) {
    const loginUrl = new URL('/account/login', req.url);
    loginUrl.searchParams.set('next', normalizedPath);
    const res = NextResponse.redirect(loginUrl);
    if (!isProd) {
      res.headers.set('x-middleware-redirect', 'login:protected-while-logged-out');
      Object.entries(debugHeaders).forEach(([k, v]) => res.headers.set(k, v));
    }
    return res;
  }

  const res = NextResponse.next();
  if (!isProd) {
    res.headers.set('x-middleware-hit', '1');
    Object.entries(debugHeaders).forEach(([k, v]) => res.headers.set(k, v));
  }
  return res;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images|manifest.webmanifest|sitemap.xml|robots.txt).*)',
  ],
};
