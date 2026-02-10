import { gql } from "@apollo/client";

export const GET_CATEGORIES = gql`
  query GetCategories($first: Int!) {
    categories(first: $first) {
      edges {
        node {
          id
          name
          description
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
