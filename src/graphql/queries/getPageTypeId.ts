import { gql } from "@apollo/client"

export const GET_TESTIMONIAL_PAGE_TYPE = gql`
  query PageTypeList {
    pageTypes(first: 100, filter: { slugs: "testimonial" }) {
      edges {
        node {
          id
          slug
        }
      }
    }
  }
`

export const GET_PROMOTION_PAGE_TYPE = gql`
  query PageTypeList {
    pageTypes(first: 100, filter: { slugs: "promotion" }) {
      edges {
        node {
          id
          slug
        }
      }
    }
  }
`
