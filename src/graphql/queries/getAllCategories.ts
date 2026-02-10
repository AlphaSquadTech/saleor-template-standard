import { gql } from "@apollo/client";

export const GET_ALL_CATEGORIES = gql`
query GetAllCategories($first: Int!) {
  categories(
    first: $first
    level: 0
    filter: {metadata: {key: "wsm_hidden", value: "0"}}
  ) {
    edges {
      node {
        id
        name
        slug
        backgroundImage {
          url
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
  backgroundImage?: { url: string } | null;
}

export interface GetAllCategoriesData {
  categories: {
    totalCount: number;
    edges: { node: CategoryNode }[];
  };
}

export interface GetAllCategoriesVars {
  first: number;
}
