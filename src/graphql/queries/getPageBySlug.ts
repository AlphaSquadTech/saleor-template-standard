import { gql } from "@apollo/client"
import createApolloServerClient from "../server-client"

export const GET_PAGE_BY_SLUG = gql`
  query PageBySlug($slug: String!) {
    page(slug: $slug) {
      id
      seoTitle
      seoDescription
      content
    }
  }
`

export type AncillaryPage = {
  id: string
  seoTitle: string | null
  seoDescription: string | null
  content: string | null
}

type PageBySlugResponse = { page: AncillaryPage | null }

export async function fetchPageBySlug(slug: string): Promise<AncillaryPage | null> {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    console.warn("API URL not configured, skipping page fetch")
    return null
  }

  try {
    const client = createApolloServerClient()
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Page fetch timeout")), 5000)
    )

    const queryPromise = client.query<PageBySlugResponse>({
      query: GET_PAGE_BY_SLUG,
      variables: { slug },
      fetchPolicy: "network-only",
      errorPolicy: "ignore",
    })

    const result = await Promise.race([queryPromise, timeoutPromise])
    return result?.data?.page ?? null
  } catch (err) {
    console.warn(
      "Failed to fetch page by slug:",
      err instanceof Error ? err.message : "Unknown error"
    )
    return null
  }
}
