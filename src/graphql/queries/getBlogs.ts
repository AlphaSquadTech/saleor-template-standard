import { gql } from "@apollo/client"
import createApolloServerClient from "../server-client"

// Query to get the page type ID for articles-blogs
export const GET_BLOG_PAGE_TYPE = gql`
  query GetBlogPageType {
    pageTypes(first: 100, filter: { slugs: "articles-blogs" }) {
      edges {
        node {
          id
          name
          slug
        }
      }
    }
  }
`

// Query to get all blog pages by page type ID
export const GET_BLOG_PAGES = gql`
  query GetBlogPages($pageTypeId: [ID!], $first: Int = 100) {
    pages(first: $first, filter: { pageTypes: $pageTypeId }) {
      edges {
        node {
          id
          title
          slug
          content
          created
          metadata {
            key
            value
          }
          pageType {
            id
            name
            slug
          }
        }
      }
    }
  }
`

export type BlogPage = {
  id: string
  title?: string | null
  slug?: string | null
  content?: string | null
  created?: string | null
  metadata?: Array<{ key?: string | null; value?: string | null } | null> | null
  pageType?: {
    id: string
    name?: string | null
    slug?: string | null
  } | null
}

export type BlogPageTypeResponse = {
  pageTypes?: {
    edges?: Array<{
      node?: {
        id: string
        name?: string | null
        slug?: string | null
      } | null
    } | null>
  }
}

export type BlogPagesResponse = {
  pages?: {
    edges?: Array<{ node?: BlogPage | null } | null>
  }
}

// Helper function to extract first paragraph or generate excerpt from content
function getExcerpt(content?: string | null): string {
  if (!content) return ""

  try {
    const parsed = JSON.parse(content)
    const blocks = Array.isArray(parsed?.blocks) ? parsed.blocks : []

    // Find the first paragraph block
    const firstParagraph = blocks.find((block: { type?: string; data?: { text?: string } }) => block?.type === "paragraph")
    if (firstParagraph?.data?.text) {
      // Strip HTML tags and limit length
      const text = firstParagraph.data.text.replace(/<[^>]*>/g, "").trim()
      return text.length > 150 ? text.substring(0, 150) + "..." : text
    }
  } catch {
    // Ignore parsing errors
  }

  return ""
}

// Fetch all blog pages
export async function fetchBlogPages(): Promise<Array<{
  id: string
  title: string
  slug: string
  excerpt: string
  date: string
}>> {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    console.warn("API URL not configured, skipping blog fetch")
    return []
  }

  try {
    const client = createApolloServerClient()

    // First, get the page type ID for articles-blogs
    const pageTypeResponse = await client.query<BlogPageTypeResponse>({
      query: GET_BLOG_PAGE_TYPE,
      fetchPolicy: "cache-first",
      errorPolicy: "all",
      context: {
        fetchOptions: {
          next: { revalidate: 600 }, // Cache for 10 minutes
        },
      },
    })

    const pageTypeId = pageTypeResponse.data?.pageTypes?.edges?.[0]?.node?.id

    if (!pageTypeId) {
      console.warn("Blog page type 'articles-blogs' not found")
      return []
    }

    // Then fetch all pages with this page type
    const pagesResponse = await client.query<BlogPagesResponse>({
      query: GET_BLOG_PAGES,
      variables: { pageTypeId: [pageTypeId], first: 100 },
      fetchPolicy: "cache-first",
      errorPolicy: "all",
      context: {
        fetchOptions: {
          next: { revalidate: 600 }, // Cache for 10 minutes
        },
      },
    })

    const pages = pagesResponse.data?.pages?.edges || []

    return pages
      .map((edge) => {
        const node = edge?.node
        if (!node || !node.slug || !node.title) return null

        return {
          id: node.id,
          title: node.title,
          slug: node.slug,
          excerpt: getExcerpt(node.content),
          date: node.created ? new Date(node.created).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
          }) : "",
        }
      })
      .filter((blog): blog is NonNullable<typeof blog> => blog !== null)
  } catch (err) {
    console.warn(
      "Failed to fetch blog pages:",
      err instanceof Error ? err.message : "Unknown error"
    )
    return []
  }
}

// Fetch a single blog page by slug
export async function fetchBlogBySlug(slug: string): Promise<BlogPage | null> {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    console.warn("API URL not configured, skipping blog fetch")
    return null
  }

  try {
    const client = createApolloServerClient()

    const BLOG_BY_SLUG = gql`
      query GetBlogBySlug($slug: String!) {
        page(slug: $slug) {
          id
          title
          slug
          content
          created
          metadata {
            key
            value
          }
          pageType {
            id
            name
            slug
          }
        }
      }
    `

    const response = await client.query({
      query: BLOG_BY_SLUG,
      variables: { slug },
      fetchPolicy: "network-only",
      errorPolicy: "ignore",
    })

    return response?.data?.page ?? null
  } catch (err) {
    console.warn(
      "Failed to fetch blog by slug:",
      err instanceof Error ? err.message : "Unknown error"
    )
    return null
  }
}
