import { gql } from "@apollo/client"

export const GET_PAGE_METADATA_BY_SLUG = gql`
  query PageMetadataBySlug($slug: String!) {
    page(slug: $slug) {
      metadata {
        key
        value
      }
    }
  }
`

export type PageMetadataItem = {
  key: string
  value: string | null
}

export type PageMetadataResponse = {
  page: {
    metadata: PageMetadataItem[] | null
  } | null
}
