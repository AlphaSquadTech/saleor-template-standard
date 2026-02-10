import { gql } from "@apollo/client";

export const GET_ALL_CATEGORIES_TREE = gql`
  query GetAllCategoriesTree($first: Int!, $childrenFirst: Int!, $channel: String!) {
  categories(first: $first, filter: {metadata: {key: "wsm_hidden", value: "0"}}) {
    edges {
      node {
        id
        name
        slug
        parent {
          id
        }
        backgroundImage {
          url
        }
        products(channel: $channel) {
          totalCount
        }
        children(first: $childrenFirst) {
          edges {
            node {
              id
              name
              slug
              parent {
                id
              }
              backgroundImage {
                url
              }
              products(channel: $channel) {
                totalCount
              }
            }
          }
        }
      }
    }
    totalCount
  }
}
`;

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parent: { id: string } | null;
  metadata?: { key: string; value: string }[];
  backgroundImage?: { url: string } | null;
  products: { totalCount: number };
  children: { edges: { node: { id: string; name: string; slug: string; parent: { id: string } | null; metadata?: { key: string; value: string }[]; backgroundImage?: { url: string } | null; products: { totalCount: number } } }[] };
}

export interface GetAllCategoriesTreeData {
  categories: {
    totalCount: number;
    edges: { node: CategoryNode }[];
  };
}

export interface GetAllCategoriesTreeVars {
  first: number;
  childrenFirst: number;
  channel: string;
}
