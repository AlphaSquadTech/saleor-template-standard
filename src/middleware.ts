import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchConfigurationDirect, isFeatureActive } from '@/app/utils/configurationService';
import {
  getSdkStorageKey,
  SDK_ACCESS_TOKEN_SUFFIX,
  SDK_REFRESH_TOKEN_SUFFIX,
} from '@/lib/auth/cookies';
import {
  refreshSaleorAuthTokens,
  setRefreshedAuthCookies,
} from '@/lib/auth/middlewareRefresh';

function normalizeGraphqlUrl(raw?: string): string | null {
  if (!raw) return null;
  let url = raw.trim();
  if (!url) return null;
  const lower = url.toLowerCase();
  const hasGraphql = lower.endsWith('/graphql') || lower.endsWith('/graphql/');
  if (!hasGraphql) {
    url = url.replace(/\/+$/, '') + '/graphql/';
  } else if (!url.endsWith('/')) {
    url = `${url}/`;
  }
  return url;
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

  // Legacy legal routes now live as Saleor-driven pages. Permanently (308)
  // redirect the old static paths to their canonical Saleor slugs, preserving
  // any query string.
  const LEGAL_REDIRECTS: Record<string, string> = {
    '/privacy': '/privacy-policy',
    '/terms': '/terms-and-conditions',
  };
  const legalTarget = LEGAL_REDIRECTS[normalizedPath];
  if (legalTarget) {
    const target = new URL(legalTarget, req.url);
    target.search = req.nextUrl.search;
    return NextResponse.redirect(target, 308);
  }

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

  const saleorApiUrl = normalizeGraphqlUrl(process.env.NEXT_PUBLIC_API_URL);
  const accessCookieName = saleorApiUrl
    ? getSdkStorageKey(saleorApiUrl, SDK_ACCESS_TOKEN_SUFFIX)
    : null;
  const refreshCookieName = saleorApiUrl
    ? getSdkStorageKey(saleorApiUrl, SDK_REFRESH_TOKEN_SUFFIX)
    : null;
  const tokenCookie = accessCookieName ? req.cookies.get(accessCookieName) : undefined;
  const refreshCookie = refreshCookieName ? req.cookies.get(refreshCookieName) : undefined;

  const isAuthRoute = AUTH_ROUTES.some(
    route => normalizedPath === route || normalizedPath.startsWith(route + '/')
  );

  const isProtectedRoute =
    PROTECTED_PREFIXES.some(
      prefix => normalizedPath === prefix || normalizedPath.startsWith(prefix + '/')
    ) && !isAuthRoute;

  const hasAccessToken = Boolean(tokenCookie);
  const canAttemptAuthenticatedRequest = hasAccessToken || Boolean(refreshCookie);
  let refreshedAccessToken: string | null = null;
  let refreshedRefreshToken: string | null = null;

  if (!hasAccessToken && refreshCookie?.value && saleorApiUrl) {
    const refreshed = await refreshSaleorAuthTokens(saleorApiUrl, refreshCookie.value).catch(
      () => null,
    );
    if (refreshed?.token) {
      refreshedAccessToken = refreshed.token;
      refreshedRefreshToken = refreshed.refreshToken ?? null;
    }
  }

  // Debug headers only in non-prod and NEVER include token value
  const isProd = process.env.NODE_ENV === 'production';
  const debugHeaders: Record<string, string> = {
    'x-pathname': normalizedPath,
    'x-has-token': tokenCookie || refreshedAccessToken ? '1' : '0',
    'x-has-refresh': refreshCookie ? '1' : '0',
    'x-is-logged-in': canAttemptAuthenticatedRequest ? '1' : '0',
    'x-token-verified': 'sdk-storage',
    'x-is-auth-route': isAuthRoute ? '1' : '0',
    'x-is-protected-route': isProtectedRoute ? '1' : '0',
  };

  if ((hasAccessToken || refreshedAccessToken) && isAuthRoute) {
    const res = NextResponse.redirect(new URL('/', req.url));
    if (saleorApiUrl) {
      setRefreshedAuthCookies(res, {
        saleorApiUrl,
        accessCookieName,
        refreshCookieName,
        accessToken: refreshedAccessToken,
        refreshToken: refreshedRefreshToken,
      });
    }
    if (!isProd) {
      res.headers.set('x-middleware-redirect', 'home:auth-while-logged-in');
      Object.entries(debugHeaders).forEach(([k, v]) => res.headers.set(k, v));
    }
    return res;
  }

  if (!canAttemptAuthenticatedRequest && !refreshedAccessToken && isProtectedRoute) {
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
  if (saleorApiUrl) {
    setRefreshedAuthCookies(res, {
      saleorApiUrl,
      accessCookieName,
      refreshCookieName,
      accessToken: refreshedAccessToken,
      refreshToken: refreshedRefreshToken,
    });
  }
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
