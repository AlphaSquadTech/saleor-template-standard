import { gql } from "@apollo/client"

export const GET_BRANDS = gql`
  query GetBrands($first: Int!, $key: String!, $value: String!) {
    productTypes(
      first: $first
      filter: { metadata: { key: $key, value: $value } }
    ) {
      edges {
        node {
          name
          metafields
        }
      }
    }
  }
`
