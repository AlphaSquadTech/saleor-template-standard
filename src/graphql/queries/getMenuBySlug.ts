import { gql } from "@apollo/client";
import createApolloServerClient from "../server-client";

export const GET_MENU_BY_SLUG = gql`
  query GetMenuBySlug($slug: String!) {
    menu(slug: $slug) {
      id
      name
      slug
      items {
        id
        level
        name
        url
        metadata {
          key
          value
        }
        children {
          id
          name
          level
          url
          metadata {
            key
            value
          }
          children {
            id
            name
            level
            url
            metadata {
              key
              value
            }
            children {
              id
              name
              level
              url
              metadata {
                key
                value
              }
            }
          }
        }
      }
    }
  }
`;

export const fetchMenuBySlug = async (slug: "navbar" | "footer") => {
  // Check if API URL is configured
  if (!process.env.NEXT_PUBLIC_API_URL) {
    console.warn(`API URL not configured, skipping menu fetch for [${slug}]`);
    return null;
  }

  try {
    const client = createApolloServerClient();
    
    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Menu fetch timeout')), 5000);
    });
    
    const queryPromise = client.query({
      query: GET_MENU_BY_SLUG,
      variables: { slug },
      fetchPolicy: 'network-only', // Don't use cache for menus
      errorPolicy: 'ignore', // Ignore GraphQL errors and return null
    });

    const result = await Promise.race([queryPromise, timeoutPromise]) as { data: { menu: unknown } };
    const { data } = result;
    return data?.menu || null;
  } catch (err) {
    console.warn(`Failed to fetch menu [${slug}]:`, err instanceof Error ? err.message : 'Unknown error');
    // Return null instead of undefined to prevent destructuring errors
    return null;
  }
};
