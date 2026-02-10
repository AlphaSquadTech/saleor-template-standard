import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";

const createApolloServerClient = () => {
  try {
    // Use a default URL if not configured to prevent client creation errors
    const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/graphql";
    console.log(`[APOLLO] Creating client with URL: ${raw}`);

    const normalizeGraphqlUrl = (input: string) => {
      let url = input.trim();
      const lower = url.toLowerCase();
      const hasGraphql = lower.endsWith('/graphql') || lower.endsWith('/graphql/');
      if (!hasGraphql) {
        url = url.replace(/\/+$/, '') + '/graphql/';
      }
      return url;
    };

    const apiUrl = normalizeGraphqlUrl(raw);
    console.log(`[APOLLO] Normalized URL: ${apiUrl}`);
    
    const httpLink = createHttpLink({
      uri: apiUrl,
    });

    const client = new ApolloClient({
      link: httpLink,
      cache: new InMemoryCache(),
      ssrMode: true, // Important for SSR safety
      defaultOptions: {
        query: {
          errorPolicy: 'ignore',
          fetchPolicy: 'no-cache',
        },
      },
    });

    console.log(`[APOLLO] Client created successfully`);
    return client;
  } catch (error) {
    console.error(`[APOLLO] Failed to create Apollo client:`, error);
    // Return a minimal client that will fail gracefully
    const fallbackHttpLink = createHttpLink({
      uri: 'http://localhost:3000/api/graphql',
    });

    return new ApolloClient({
      link: fallbackHttpLink,
      cache: new InMemoryCache(),
      ssrMode: true,
    });
  }
};

export default createApolloServerClient;
