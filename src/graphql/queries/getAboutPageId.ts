import { gql } from "@apollo/client"

export const GET_ABOUT_PAGE_ID = gql`
  query AboutPageId {
    pages(first: 10, filter: { slugs: "about" }) {
      edges { node { id } }
    }
  }
`
