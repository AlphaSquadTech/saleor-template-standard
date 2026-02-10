'use client';

import { ApolloClient, InMemoryCache, createHttpLink, from } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { Observable } from "@apollo/client/utilities";
import type { GraphQLFormattedError } from "graphql";

declare global {
  interface Window {
    __APOLLO_CLIENT__?: ApolloClient<unknown>;
  }
}

interface GraphQLErrorExtensions {
  code?: string;
  exception?: {
    code?: string;
    stacktrace?: string[];
  };
  [key: string]: unknown;
}

interface TypedGraphQLError {
  message: string;
  extensions?: GraphQLErrorExtensions;
  path?: readonly (string | number)[];
}

function normalizeGraphqlUrl(raw?: string) {
  if (!raw) return undefined;
  let url = raw.trim();
  // If the user passed the Saleor base URL, append /graphql/
  const lower = url.toLowerCase();
  const hasGraphql = lower.endsWith('/graphql') || lower.endsWith('/graphql/');
  if (!hasGraphql) {
    url = url.replace(/\/+$/, '') + '/graphql/';
    if (typeof window !== 'undefined') {
      console.warn('[Apollo] NEXT_PUBLIC_API_URL did not include /graphql. Using:', url);
    }
  }
  return url;
}

const httpLink = createHttpLink({
  // Keep builds/template bootable even when NEXT_PUBLIC_API_URL isn't configured yet.
  uri: normalizeGraphqlUrl(process.env.NEXT_PUBLIC_API_URL) || "/api/graphql",
});

// Attach JWT from localStorage for client-side requests
const authLink = setContext((_, { headers }) => {
  if (typeof window === "undefined") {
    return { headers };
  }
  const token = localStorage.getItem("token");
  return {
    headers: {
      ...headers,
      authorization: token ? `JWT ${token}` : "",
    },
  };
});

// --- Token Refresh Logic ---
let isRefreshing = false;
let pendingRequests: Array<(token: string | null) => void> = [];

const resolvePendingRequests = (newToken: string | null) => {
  pendingRequests.forEach((cb) => cb(newToken));
  pendingRequests = [];
};

async function performTokenRefresh(endpoint: string): Promise<{ token: string | null; refreshToken: string | null }> {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
  if (!refreshToken) {
    console.log('No refresh token available');
    throw new Error('No refresh token');
  }
  
  console.log('Attempting token refresh...');
  
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `mutation TokenRefresh($refreshToken: String!) { 
          tokenRefresh(refreshToken: $refreshToken) { 
            token 
            refreshToken 
            errors { 
              field
              message 
              code
            } 
          } 
        }`,
        variables: { refreshToken },
      }),
    });
    
    if (!res.ok) {
      console.error('Token refresh HTTP error:', res.status, res.statusText);
      throw new Error(`tokenRefresh failed: ${res.status}`);
    }
    
    const json = await res.json();
    console.log('Token refresh response:', json);
    
    const payload = json?.data?.tokenRefresh;
    const errors = json.errors || payload?.errors || [];
    
    if (errors.length) {
      console.error('Token refresh errors:', errors);
      throw new Error(errors[0]?.message || 'Token refresh failed');
    }
    
    if (!payload?.token) {
      console.error('No token in refresh response');
      throw new Error('No token in refresh response');
    }
    
    console.log('Token refresh successful');
    return { 
      token: payload.token, 
      refreshToken: payload.refreshToken || null 
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
}

// Helper function to handle logout and redirect
async function forceLogout() {
  console.log("forceLogout called");

  if (typeof window === "undefined") return;

  try {
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");

    // Call server to clear cookies
    await fetch("/api/auth/clear", {
      method: "POST",
      credentials: "include",
    });

    // Clear Apollo cache
    if (window.__APOLLO_CLIENT__) {
      await window.__APOLLO_CLIENT__.clearStore().catch((e) =>
        console.error("Error clearing Apollo cache:", e)
      );
    }

    // Redirect to login
    const currentPath = window.location.pathname;
    const loginUrl = new URL("/account/login", window.location.origin);

    if (currentPath !== "/account/login") {
      loginUrl.searchParams.set("next", currentPath);
    }

    loginUrl.searchParams.set("sessionExpired", "true");
    window.location.assign(loginUrl.toString());
  } catch (error) {
    console.error("Error in forceLogout:", error);
    window.location.href = "/account/login?sessionExpired=true";
  }
}


const errorLink = onError(({ graphQLErrors, operation, forward }) => {
  // If we don't have graphQLErrors or we're on the server, do nothing
  if (!graphQLErrors || typeof window === 'undefined') {
    return;
  }

  // Type assertion for graphQLErrors
  const errors: TypedGraphQLError[] = graphQLErrors.map((e: GraphQLFormattedError) => ({
    message: e.message,
    extensions: e.extensions as GraphQLErrorExtensions | undefined,
    path: e.path
  }));

  const authError = errors.find((e) => {
    const extensions = e.extensions;
    const errorCode = extensions?.exception?.code || extensions?.code;
    const isUnauthenticated = errorCode === 'UNAUTHENTICATED' || errorCode === 'ExpiredSignatureError';
    const isTokenExpired = e.message?.includes('signature has expired') || 
                          e.message?.includes('Token is invalid or expired');
    return isUnauthenticated || isTokenExpired;
  });

  // Debug log
  console.log('Auth error detected:', { 
    hasAuthError: !!authError, 
    graphQLErrors: errors.map(e => ({
      message: e.message,
      path: e.path,
      code: e.extensions?.exception?.code || e.extensions?.code,
    })),
    isServer: typeof window === 'undefined',
    authError: authError ? {
      message: authError.message,
      code: authError.extensions?.exception?.code || authError.extensions?.code,
      path: authError.path
    } : undefined
  });

  // If not an auth error or running on server, do nothing
  if (!authError || typeof window === 'undefined') {
    return;
  }

  const endpoint = normalizeGraphqlUrl(process.env.NEXT_PUBLIC_API_URL) || "/api/graphql";

  // If we're not already refreshing, start the refresh process
  if (!isRefreshing) {
    isRefreshing = true;
    performTokenRefresh(endpoint)
      .then(({ token, refreshToken }) => {
        if (token && refreshToken) {
          // Save new tokens
          localStorage.setItem('token', token);
          localStorage.setItem('refreshToken', refreshToken);
          resolvePendingRequests(token);
        } else {
          // If no new tokens, log out
          forceLogout();
        }
      })
      .catch((error) => {
        console.error('Token refresh failed:', error);
        forceLogout();
      })
      .finally(() => {
        isRefreshing = false;
      });
  }

  // Return observable to handle the operation after token refresh
  return new Observable((observer) => {
    pendingRequests.push((newToken) => {
      if (!newToken) {
        // If no new token, the refresh failed
        forceLogout();
        observer.error(authError);
        return;
      }

      // Retry the operation with the new token
      const oldHeaders = operation.getContext().headers || {};
      operation.setContext({
        headers: {
          ...oldHeaders,
          authorization: `JWT ${newToken}`,
        },
      });

      const subscriber = {
        next: observer.next.bind(observer),
        error: (err: Error) => {
          // If we get another auth error after refresh, force logout
          if (err.message?.includes('signature has expired') || 
              ('graphQLErrors' in err && Array.isArray((err as { graphQLErrors?: GraphQLFormattedError[] }).graphQLErrors) && 
               (err as { graphQLErrors: GraphQLFormattedError[] }).graphQLErrors.some((e: GraphQLFormattedError) => 
                 e.extensions?.code === 'UNAUTHENTICATED'))) {
            forceLogout();
          }
          observer.error(err);
        },
        complete: observer.complete.bind(observer),
      };

      const subscriberHandle = forward(operation).subscribe(subscriber);
      
      return () => {
        subscriberHandle.unsubscribe();
      };
    });
    
    return () => {
      // Clean up pending requests if the observable is unsubscribed
      pendingRequests = [];
    };
  });
});

// Create the Apollo client instance
const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

// Store the client on the window for debugging and forceLogout access
if (typeof window !== 'undefined') {
  window.__APOLLO_CLIENT__ = client;
}

export default client;
