import { gql } from "@apollo/client"

export const GET_TESTIMONIALS = gql`
  query Testimonials($pageTypeId: ID!, $first: Int = 100, $after: String) {
    pages(
      first: $first
      after: $after
      filter: { pageTypes: [$pageTypeId] }
      sortBy: { field: PUBLICATION_DATE, direction: DESC }
    ) {
      edges {
        node {
          id
          attributes {
            attribute { slug }
            values {
              name
              value
            }
          }
        }
      }
    }
  }
`
