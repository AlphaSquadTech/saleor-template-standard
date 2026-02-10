import { gql } from "@apollo/client"

export const GET_CHECKOUT_TERMS_AND_CONDITIONS = gql`
  query CheckoutTermsAndConditions($slug: String!) {
    page(slug: $slug) {
      id
      title
      slug
      content
      seoTitle
      seoDescription
      isPublished
      metadata {
        key
        value
      }
    }
  }
`

export type CheckoutTermsAndConditionsPage = {
  id: string
  title: string | null
  slug: string | null
  content: string | null
  seoTitle: string | null
  seoDescription: string | null
  isPublished: boolean
  metadata: Array<{
    key: string
    value: string
  }> | null
}

export type CheckoutTermsAndConditionsResponse = { 
  page: CheckoutTermsAndConditionsPage | null 
}