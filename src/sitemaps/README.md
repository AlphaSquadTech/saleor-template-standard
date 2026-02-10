# Sitemap Integration

Complete sitemap setup for all pages including static and dynamic content for Google, Yahoo, and Bing.

## Files Structure

```
src/sitemaps/
├── static-pages-sitemap.ts    # All static pages sitemap
├── dynamic-pages-sitemap.ts   # Dynamic content (products, categories, etc.)
├── sitemap-index.ts          # Configuration and search engine URLs
└── README.md                 # This documentation

src/app/
├── sitemap.ts                # Main sitemap endpoint (combines all)
└── sitemap-index.xml/        # Sitemap index route
    └── route.ts

public/robots.txt             # Search engine crawler instructions
```

## Available URLs

- **Main Sitemap**: `http://localhost:3000/sitemap.xml`
- **Sitemap Index**: `http://localhost:3000/sitemap-index.xml`
- **Robots.txt**: `http://localhost:3000/robots.txt`

## Current Pages in Sitemap

### Static Pages (22 pages):
- **Main Pages**: Homepage, About, Contact, Shop, Categories, Products, Blog
- **Account Pages**: Login, Register, Password Reset, Account Dashboard, Orders, Settings, Addresses
- **Legal Pages**: Privacy Policy, Terms & Conditions, Warranty, Shipping & Returns
- **Support Pages**: FAQ, Store Locator
- **E-commerce**: Cart, Checkout, Order Confirmation

### Dynamic Pages (Ready for implementation):
- **Products**: `/product/[id]` - Product detail pages
- **Categories**: `/category/[slug]` - Category listing pages  
- **Brands**: `/brand/[id]` - Brand pages
- **Blog Posts**: `/blog/[slug]` - Individual blog posts
- **Dynamic Pages**: `/[slug]` - CMS-managed pages

## Google Search Console Setup

1. **Add Property**: Go to [Google Search Console](https://search.google.com/search-console) and add your domain
2. **Verify Ownership**: Follow verification steps (HTML file upload, DNS, or meta tag)
3. **Submit Sitemaps**: 
   - Go to "Sitemaps" in the left menu
   - Add sitemaps:
     - `https://yourdomain.com/sitemap.xml` (main sitemap)
     - `https://yourdomain.com/sitemap-index.xml` (sitemap index)
   - Click "Submit"

## Other Search Engines

### Bing Webmaster Tools
1. Visit [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Add your site and verify ownership
3. Submit both sitemaps in "Sitemaps" section

### Yahoo Search
Yahoo uses Bing's index, so submitting to Bing covers Yahoo as well.

### Manual Ping (Optional)
Search engines can be notified directly:
- Google: `https://www.google.com/ping?sitemap=https://yourdomain.com/sitemap.xml`
- Bing: `https://www.bing.com/ping?sitemap=https://yourdomain.com/sitemap.xml`

## Production Setup

1. Update `NEXT_PUBLIC_SITE_URL` in your environment variables
2. Update robots.txt with your actual domain
3. Implement dynamic content fetching in `dynamic-pages-sitemap.ts`
4. Submit sitemaps to search engines using your production URL

## Adding Dynamic Content

To populate dynamic pages, implement the helper functions in `dynamic-pages-sitemap.ts`:

```typescript
// Example: Connect to your GraphQL API
export async function getProductSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const { data } = await client.query({ query: GET_ALL_PRODUCTS })
  
  return data.products.map(product => ({
    url: `${baseUrl}/product/${product.id}`,
    lastModified: new Date(product.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))
}
```

## SEO Priority Guidelines

- **Priority 1.0**: Homepage
- **Priority 0.9**: Shop, Main category pages
- **Priority 0.8**: About, Product pages, Category pages, Blog
- **Priority 0.7**: Contact, Brand pages
- **Priority 0.6**: FAQ, Blog posts, Store locator
- **Priority 0.5**: Legal pages, Dynamic CMS pages
- **Priority 0.4**: Account pages (login, register)
- **Priority 0.3**: Password reset, OTP pages