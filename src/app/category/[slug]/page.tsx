import CategoryPageClient from "./CategoryPageClient";
import {
  generateProductCategoryPageSchema,
  generateBreadcrumbSchema,
} from "@/lib/schema";
import { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Helper function to normalize GraphQL URL
function normalizeGraphqlUrl(raw?: string): string {
  if (!raw) return "/api/graphql";
  let url = raw.trim();
  const lower = url.toLowerCase();
  const hasGraphql = lower.endsWith("/graphql") || lower.endsWith("/graphql/");
  if (!hasGraphql) {
    url = url.replace(/\/+$/, "") + "/graphql/";
  }
  return url;
}

// TypeScript types for GraphQL response
interface MetadataItem {
  key: string;
  value: string;
}

interface CategoryNode {
  id: string;
  slug: string;
  name: string;
  metadata?: MetadataItem[];
}

interface CategoryEdge {
  node: CategoryNode;
}

interface CategoryData {
  categories: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    edges: CategoryEdge[];
  };
}

// GraphQL query string for finding categories by old slug
const FIND_CATEGORY_BY_OLD_SLUG_QUERY = `
  query FindCategoryByOldSlug($first: Int = 100, $after: String) {
    categories(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          slug
          name
          metadata {
            key
            value
          }
        }
      }
    }
  }
`;

// Helper function to check if a category matches the slug
// For categories, historic URLs are stored in the "redirects" metadata field as an array
function checkCategoryMatch(edge: CategoryEdge, slug: string): boolean {
  const redirectsMeta = edge.node.metadata?.find(
    (meta: MetadataItem) => meta.key === "redirects"
  );

  if (!redirectsMeta) {
    return false;
  }

  try {
    let redirects: string[] = [];
    let redirectsValue = redirectsMeta.value.trim();

    // Handle JSON array format or comma-separated format
    if (redirectsValue.startsWith("[")) {
      try {
        // Try to parse as JSON array
        redirectsValue = redirectsValue.replace(/\[([^"[])/g, '["$1');
        redirectsValue = redirectsValue.replace(/([^"\]])\]/g, '$1"]');
        redirects = JSON.parse(redirectsValue);
      } catch {
        // Fallback: parse as comma-separated values inside brackets
        redirects = redirectsValue
          .replace(/^\[|\]$/g, "")
          .split(",")
          .map((s: string) => s.trim().replace(/^["']|["']$/g, ""));
      }
    } else {
      // Handle comma-separated format without brackets
      redirects = redirectsValue
        .split(",")
        .map((s: string) => s.trim().replace(/^["']|["']$/g, ""));
    }

    // Check if the current slug matches any redirect in the array
    return Array.isArray(redirects) && redirects.some((r) => r === slug);
  } catch {
    return false;
  }
}

// Server-side function to check for category redirects with pagination
async function checkCategoryRedirect(
  slug: string
): Promise<string | null> {
  const apiUrl = normalizeGraphqlUrl(process.env.NEXT_PUBLIC_API_URL);
  let after: string | null = null;
  let hasNextPage = true;

  try {
    // Keep fetching batches until we find a match or run out of pages
    while (hasNextPage) {
      const response: Response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: FIND_CATEGORY_BY_OLD_SLUG_QUERY,
          variables: { first: 100, after },
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        return null;
      }

      const { data }: { data: CategoryData } = await response.json();

      if (!data?.categories?.edges) {
        return null;
      }

      // Check current batch for matching category
      const categoryWithRedirect = data.categories.edges.find((edge: CategoryEdge) =>
        checkCategoryMatch(edge, slug)
      )?.node || null;

      if (categoryWithRedirect) {
        return categoryWithRedirect.slug;
      }

      // Check if there are more pages to fetch
      hasNextPage = data.categories.pageInfo?.hasNextPage || false;
      after = data.categories.pageInfo?.endCursor || null;
    }

    return null;
  } catch (error) {
    console.error("Error checking category redirect:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const categoryName = decodedSlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return {
    title: `${categoryName} | Shop`,
    description: `Browse our ${categoryName} collection. Find the best products in ${categoryName} category.`,
    keywords: `${categoryName}, shop, products, buy online`,
    openGraph: {
      title: `${categoryName} | Shop`,
      description: `Browse our ${categoryName} collection`,
      type: "website",
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const decodedSlug = decodeURIComponent(slug);
  const categoryName = decodedSlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  // Server-side redirect check for old slugs
  const newSlug = await checkCategoryRedirect(slug);
  if (newSlug && newSlug !== slug) {
    // Preserve query parameters when redirecting
    const queryString = new URLSearchParams(
      resolvedSearchParams as Record<string, string>
    ).toString();
    const newUrl = `/category/${newSlug}${queryString ? `?${queryString}` : ""}`;
    redirect(newUrl);
  }

  // Generate schema.org structured data
  const categoryPageSchema = generateProductCategoryPageSchema(
    categoryName,
    `Browse our ${categoryName} collection. Find the best products in ${categoryName} category.`,
    `/category/${slug}`
  );

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Categories", url: "/category" },
    { name: categoryName, url: `/category/${slug}` },
  ]);

  return (
    <>
      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(categoryPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Suspense>
        <CategoryPageClient slug={slug} />
      </Suspense>
    </>
  );
}
