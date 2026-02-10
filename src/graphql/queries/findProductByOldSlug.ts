import { gql } from "@apollo/client";

/**
 * Query to search for products with metadata.
 * This fetches products with their metadata so we can search for old slugs client-side.
 * Uses pagination to handle large product catalogs (100 per batch, matching API limit).
 */
export const FIND_PRODUCT_BY_OLD_SLUG = gql`
  query FindProductByOldSlug($channel: String!, $first: Int = 100, $after: String) {
    products(first: $first, channel: $channel, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          slug
          name
          metadata {
            key
            value
          }
        }
      }
    }
  }
`;

// --- Types ---

export interface ProductMetadata {
  key: string;
  value: string;
}

export interface FindProductByOldSlugData {
  products: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    edges: Array<{
      node: {
        id: string;
        slug: string;
        name: string;
        metadata: ProductMetadata[];
      };
    }>;
  };
}

export interface FindProductByOldSlugVars {
  channel: string;
  first?: number;
  after?: string | null;
}
