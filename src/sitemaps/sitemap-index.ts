import { MetadataRoute } from 'next'

export function generateSitemapIndex(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  
  return [
    {
      url: `${baseUrl}/sitemap.xml`,
      lastModified: new Date(),
    },
  ]
}

export const sitemapConfig = {
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  searchEngineUrls: {
    google: 'https://www.google.com/ping?sitemap=',
    bing: 'https://www.bing.com/ping?sitemap=',
    yahoo: 'https://search.yahooapis.com/SiteExplorerService/V1/ping?sitemap=',
  }
}