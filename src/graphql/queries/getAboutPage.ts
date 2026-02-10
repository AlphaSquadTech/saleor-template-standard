import { gql } from "@apollo/client"

export const GET_ABOUT_PAGE = gql`
  query AboutPage($id: ID!) {
    page(id: $id) {
      id
      title
      slug
      seoTitle
      seoDescription
      isPublished
      content
      attributes {
        attribute { slug name }
        values {
          value
          name
          richText
          file { url }
        }
      }
    }
  }
`
