import { gql } from "@apollo/client";

export const GET_PRODUCTS = gql`
  query GetProducts(
    $channel: String!
    $first: Int!
    $after: String
    $categoryIds: [ID!]
    $search: String
  ) {
    products(
      filter: { categories: $categoryIds, search: $search }
      channel: $channel
      first: $first
      after: $after
    ) {
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        node {
          id
          name
          slug
          media { id url alt }
          category { id name }
          pricing {
            onSale
            priceRange {
              start { gross { amount currency } }
              stop { gross { amount currency } }
            }
          }
        }
      }
    }
  }
`;

export interface GetProductsData {
  products: {
    totalCount: number;
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor: string | null;
      endCursor: string | null;
    };
    edges: Array<{
      node: {
        id: string;
        name: string;
        slug: string;
        media: Array<{ id: string; url: string; alt: string | null }>;
        category: { id: string; name: string } | null;
        pricing: {
          onSale: boolean | null;
          priceRange: {
            start: { gross: { amount: number; currency: string } } | null;
            stop: { gross: { amount: number; currency: string } } | null;
          } | null;
        } | null;
      };
    }>;
  };
}

export interface GetProductsVars {
  channel: string;
  first: number;
  after?: string | null;
  categoryIds?: string[];
  search?: string;
}
