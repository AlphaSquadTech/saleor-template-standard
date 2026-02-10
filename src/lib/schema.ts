/**
 * Schema.org structured data utilities
 * Generate JSON-LD markup for SEO
 */

interface Product {
  id: string;
  name: string;
  description?: string;
  image?: string | string[];
  price?: number;
  currency?: string;
  availability?: string;
  sku?: string;
  brand?: string;
  rating?: number;
  reviewCount?: number;
  category?: {
    id: string;
    name: string;
  };
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

function getBaseUrl(fallback?: string) {
  return (process.env.NEXT_PUBLIC_SITE_URL || fallback || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

/**
 * Generate Organization schema for homepage
 */
export function generateOrganizationSchema(
  siteName: string,
  siteUrl: string,
  logoUrl?: string,
  socialLinks?: string[]
) {
  const baseUrl = getBaseUrl(siteUrl);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: baseUrl,
    logo: logoUrl
      ? {
          "@type": "ImageObject",
          url: `${baseUrl}${logoUrl}`,
        }
      : undefined,
    sameAs: socialLinks || [],
  };
}

/**
 * Generate WebSite schema with search action
 */
export function generateWebsiteSchema(
  siteName: string,
  siteUrl: string,
  searchUrl?: string
) {
  const baseUrl = getBaseUrl(siteUrl);

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: baseUrl,
    potentialAction: searchUrl
      ? {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${baseUrl}${searchUrl}?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        }
      : undefined,
  };
}

/**
 * Generate Product schema
 */
export function generateProductSchema(product: Product) {
  const baseUrl = getBaseUrl();

  const images = Array.isArray(product.image)
    ? product.image
    : product.image
    ? [product.image]
    : [];

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || "",
    image: images.map((img) =>
      img.startsWith("http") ? img : `${baseUrl}${img}`
    ),
    sku: product.sku || product.id,
    category: product.category?.name,
    offers: {
      "@type": "Offer",
      price: product.price?.toString() || "0",
      priceCurrency: product.currency || "USD",
      availability: product.availability
        ? `https://schema.org/${product.availability}`
        : "https://schema.org/InStock",
      url: `${baseUrl}/product/${product.id}`,
    },
    brand: product.brand
      ? {
          "@type": "Brand",
          name: product.brand,
        }
      : undefined,
    aggregateRating:
      product.rating && product.reviewCount
        ? {
            "@type": "AggregateRating",
            ratingValue: product.rating.toString(),
            reviewCount: product.reviewCount.toString(),
          }
        : undefined,
  };
}

/**
 * Generate ItemList schema for product listings
 */
export function generateItemListSchema(products: Product[], listName: string) {
  const baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: product.name,
        url: `${baseUrl}/product/${product.id}`,
        image: Array.isArray(product.image)
          ? product.image[0]
          : product.image || "",
        category: product.category?.name,
        offers: {
          "@type": "Offer",
          price: product.price?.toString() || "0",
          priceCurrency: product.currency || "USD",
        },
      },
    })),
  };
}

/**
 * Generate BreadcrumbList schema
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  const baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${baseUrl}${item.url}`,
    })),
  };
}

/**
 * Generate CollectionPage schema for category/collection pages
 */
export function generateCollectionPageSchema(
  name: string,
  description: string,
  url: string
) {
  const baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: url.startsWith("http") ? url : `${baseUrl}${url}`,
  };
}

/**
 * Generate WebPage schema for product category pages with ItemList
 */
export function generateProductCategoryPageSchema(
  name: string,
  description: string,
  url: string
) {
  const baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${name} - Product Category`,
    description,
    url: url.startsWith("http") ? url : `${baseUrl}${url}`,
    breadcrumb: {
      "@type": "BreadcrumbList",
    },
  };
}

/**
 * Generate Blog schema for blog listing pages
 */
export function generateBlogSchema(
  name: string,
  description: string,
  url: string
) {
  const baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name,
    description,
    url: url.startsWith("http") ? url : `${baseUrl}${url}`,
  };
}

/**
 * Generate BlogPosting schema for blog posts
 */
export function generateBlogPostingSchema(
  title: string,
  description: string,
  url: string,
  datePublished: string,
  dateModified?: string,
  authorName?: string,
  image?: string
) {
  const baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    url: url.startsWith("http") ? url : `${baseUrl}${url}`,
    datePublished,
    dateModified: dateModified || datePublished,
    author: authorName
      ? {
          "@type": "Person",
          name: authorName,
        }
      : undefined,
    image: image
      ? image.startsWith("http")
        ? image
        : `${baseUrl}${image}`
      : undefined,
  };
}
