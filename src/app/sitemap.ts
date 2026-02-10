import { MetadataRoute } from 'next'
import { generateStaticPagesSitemap } from '../sitemaps/static-pages-sitemap'
import { generateDynamicPagesSitemap } from '../sitemaps/dynamic-pages-sitemap'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = generateStaticPagesSitemap()
  const dynamicPages = await generateDynamicPagesSitemap()
  
  return [...staticPages, ...dynamicPages]
}