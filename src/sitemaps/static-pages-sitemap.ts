import { MetadataRoute } from 'next'

export function generateStaticPagesSitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  
  const staticPages = [
    // Main pages
    { url: '', priority: 1.0, changeFrequency: 'daily' as const },
    { url: '/about', priority: 0.8, changeFrequency: 'monthly' as const },
    { url: '/contact', priority: 0.7, changeFrequency: 'monthly' as const },
    { url: '/contact-us', priority: 0.7, changeFrequency: 'monthly' as const },
    
    // Shop pages
    { url: '/products/all', priority: 0.9, changeFrequency: 'daily' as const },
    { url: '/category', priority: 0.8, changeFrequency: 'daily' as const },
    { url: '/product', priority: 0.8, changeFrequency: 'daily' as const },
    { url: '/cart', priority: 0.6, changeFrequency: 'never' as const },
    { url: '/checkout', priority: 0.5, changeFrequency: 'never' as const },
    
    // Blog
    { url: '/blog', priority: 0.8, changeFrequency: 'weekly' as const },
    
    // Auth pages (public)
    { url: '/account/login', priority: 0.4, changeFrequency: 'monthly' as const },
    { url: '/account/register', priority: 0.4, changeFrequency: 'monthly' as const },
    { url: '/account/forgot-password', priority: 0.3, changeFrequency: 'monthly' as const },
    { url: '/account/otp', priority: 0.3, changeFrequency: 'monthly' as const },
    { url: '/account/reset-password', priority: 0.3, changeFrequency: 'monthly' as const },
    
    // Legal pages
    { url: '/privacy-policy', priority: 0.5, changeFrequency: 'yearly' as const },
    { url: '/privacy', priority: 0.5, changeFrequency: 'yearly' as const },
    { url: '/terms-and-conditions', priority: 0.5, changeFrequency: 'yearly' as const },
    { url: '/terms', priority: 0.5, changeFrequency: 'yearly' as const },
    { url: '/warranty', priority: 0.5, changeFrequency: 'yearly' as const },
    { url: '/shipping-returns', priority: 0.5, changeFrequency: 'yearly' as const },
    
    // Support pages
    { url: '/frequently-asked-questions', priority: 0.6, changeFrequency: 'monthly' as const },
    { url: '/locator', priority: 0.6, changeFrequency: 'monthly' as const },
  ]

  return staticPages.map(page => ({
    url: `${baseUrl}${page.url}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))
}