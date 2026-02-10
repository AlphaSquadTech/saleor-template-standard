import { MetadataRoute } from 'next'

interface SitemapProduct {
  id: string
  slug: string
  updated_at?: string
}

interface SitemapCategory {
  id: string
  value: string
  slug: string
  count: number
  children?: SitemapCategory[]
}

interface SitemapBrand {
  id: string
  value: string
  count: number
}

// Dynamic content: blog posts (/blog/[slug]), products (/product/[slug]), categories (/category/[slug]), and brands (/brand/[slug])
export async function generateDynamicPagesSitemap(): Promise<MetadataRoute.Sitemap> {
  const dynamicPages: MetadataRoute.Sitemap = []

  try {
    // Get all dynamic content in parallel to avoid waterfalls during build/runtime.
    const [blogPosts, products, categories, brands] = await Promise.all([
      getBlogSitemapEntries(),
      getProductSitemapEntries(),
      getCategorySitemapEntries(),
      getBrandSitemapEntries(),
    ])

    dynamicPages.push(...blogPosts, ...products, ...categories, ...brands)
  } catch (error) {
    console.error('Error generating dynamic sitemap:', error)
  }

  return dynamicPages
}

export async function getBlogSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    // Import blog posts from the constant file
    const { blogPosts } = await import('../app/blog/constant')

    return blogPosts.map(post => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
  } catch (error) {
    console.error('Error fetching blog posts for sitemap:', error)
    return []
  }
}

export async function getProductSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const apiBaseUrl = process.env.NEXT_PUBLIC_PARTSLOGIC_URL
    if (!apiBaseUrl) {
      console.warn('PARTSLOGIC_URL not configured, skipping products sitemap')
      return []
    }

    // Fetch all products from the new API
    const allProducts: SitemapProduct[] = []
    let page = 1
    let totalPages = 1

    // Fetch products with pagination
    while (page <= totalPages) {
      const params = new URLSearchParams({
        page: String(page),
        per_page: '100',
        order_by: 'desc'
      })

      const response = await fetch(
        `${apiBaseUrl}/api/search/products?${params.toString()}`,
        {
          headers: {
            accept: 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch products')
      }

      const data = await response.json()
      allProducts.push(...(data.products || []))
      totalPages = data.pagination?.total_pages || 1
      page++

      // Limit to avoid too many requests
      if (page > 10) break
    }

    return allProducts.map((product) => ({
      url: `${baseUrl}/product/${encodeURIComponent(product.slug)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  } catch (error) {
    console.error('Error fetching products for sitemap:', error)
    return []
  }
}

export async function getCategorySitemapEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const apiBaseUrl = process.env.NEXT_PUBLIC_PARTSLOGIC_URL 
    if (!apiBaseUrl) {
      console.warn('PARTSLOGIC_URL not configured, skipping categories sitemap')
      return []
    }

    // Fetch categories from facets
    const params = new URLSearchParams({
      page: '1',
      per_page: '1',
    })

    const response = await fetch(
      `${apiBaseUrl}/api/search/products?${params.toString()}`,
      {
        headers: {
          accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch categories')
    }

    const data = await response.json()
    const categories = data.facets?.categories || []

    // Flatten hierarchical categories
    const flattenCategories = (cats: SitemapCategory[]): SitemapCategory[] => {
      const result: SitemapCategory[] = []
      cats.forEach((cat) => {
        if (cat.count > 0) {
          result.push(cat)
        }
        if (cat.children) {
          result.push(...flattenCategories(cat.children))
        }
      })
      return result
    }

    const allCategories = flattenCategories(categories)

    return allCategories.map((category) => ({
      url: `${baseUrl}/category/${encodeURIComponent(category.slug)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch (error) {
    console.error('Error fetching categories for sitemap:', error)
    return []
  }
}

export async function getBrandSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const apiBaseUrl = process.env.NEXT_PUBLIC_PARTSLOGIC_URL 
    if (!apiBaseUrl) {
      console.warn('PARTSLOGIC_URL not configured, skipping brands sitemap')
      return []
    }

    // Fetch brands from facets
    const params = new URLSearchParams({
      page: '1',
      per_page: '1',
    })

    const response = await fetch(
      `${apiBaseUrl}/api/search/products?${params.toString()}`,
      {
        headers: {
          accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch brands')
    }

    const data = await response.json()
    const brands: SitemapBrand[] = data.facets?.brands || []

    // Filter brands that have products and use their slugs
    return brands
      .filter((brand) => brand.count > 0)
      .map((brand) => ({
        url: `${baseUrl}/brand/${encodeURIComponent(brand.value.toLowerCase().replace(/\s+/g, '-'))}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
  } catch (error) {
    console.error('Error fetching brands for sitemap:', error)
    return []
  }
}
