import { gql } from "@apollo/client";
import createApolloServerClient from "../server-client";

export const GET_DYNAMIC_PAGE_BY_SLUG = gql`
  query DynamicPageBySlug($slug: String!) {
    page(slug: $slug) {
      id
      title
      seoTitle
      seoDescription
      content
      pageType {
        id
        name
        slug
      }
      slug
      isPublished
      publicationDate
      metadata {
        key
        value
      }
    }
    shop {
      id
      metadata {
        key
        value
      }
    }
  }
`;

export type DynamicPageData = {
  id: string;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  content: string | null;
  pageType: {
    id: string;
    name: string;
    slug: string;
  } | null;
  slug: string;
  isPublished: boolean;
  publicationDate: string | null;
  metadata: Array<{
    key: string;
    value: string;
  }>;
  excerpt?: string; // Computed field for preview
};

type DynamicPageResponse = { 
  page: DynamicPageData | null;
  shop: {
    id: string;
    metadata: Array<{
      key: string;
      value: string;
    }>;
  } | null;
};

export async function fetchDynamicPageBySlug(slug: string): Promise<DynamicPageData | null> {
  // Check if we're in a build context and skip API calls
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
    console.log('[DEBUG] Build time detected, skipping API call');
    return null;
  }

  console.log(`[DEBUG] Fetching page with slug: "${slug}"`);
  
  // Get API URL at runtime
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  console.log(`[DEBUG] API URL: ${apiUrl}`);
  
  if (!apiUrl) {
    console.warn("[DYNAMIC PAGES] API URL not configured, skipping dynamic page fetch");
    return null;
  }

  try {
    console.log(`[DEBUG] Creating Apollo client...`);
    const client = createApolloServerClient();
    console.log(`[DEBUG] Apollo client created successfully`);
    
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Dynamic page fetch timeout")), 5000)
    );

    const queryPromise = client.query<DynamicPageResponse>({
      query: GET_DYNAMIC_PAGE_BY_SLUG,
      variables: { slug },
      fetchPolicy: "network-only",
      errorPolicy: "ignore",
    });

    console.log(`[DEBUG] Executing GraphQL query...`);
    const result = await Promise.race([queryPromise, timeoutPromise]);
    console.log(`[DEBUG] Query result:`, JSON.stringify(result?.data, null, 2));
    
    let pageData = result?.data?.page;

    // If no page found, check for HTML widgets in shop metadata
    if (!pageData || !pageData.isPublished) {
      console.log(`[DEBUG] No published page found for slug: "${slug}", checking HTML widgets in metadata...`);
      
      const shopMetadata = result?.data?.shop?.metadata || [];
      console.log(`[DEBUG] Shop metadata items found: ${shopMetadata.length}`);
      
      // Find widget with matching slug
      let matchingWidget = null;
      for (const metadataItem of shopMetadata) {
        const widget = parseHtmlWidgetFromMetadata(metadataItem.key, metadataItem.value);
        if (widget && widget.slug === slug && widget.isActive) {
          matchingWidget = widget;
          console.log(`[DEBUG] Found matching widget: "${widget.name}" with slug: "${widget.slug}"`);
          break;
        }
      }
      
      if (matchingWidget) {
        // Convert widget to page data format
        pageData = convertWidgetToPageData(matchingWidget);
        console.log(`[DEBUG] Converted widget to page data: "${pageData.title}"`);
      } else {
        console.log(`[DEBUG] No matching HTML widget found for slug: "${slug}"`);
        return null;
      }
    } else {
      console.log(`[DEBUG] Successfully fetched published page: "${pageData.title}"`);
    }

    // Add computed excerpt if content exists
    if (pageData.content) {
      const textContent = pageData.content.replace(/<[^>]*>/g, ""); // Strip HTML
      pageData.excerpt = textContent.substring(0, 160) + (textContent.length > 160 ? "..." : "");
    }

    return pageData;
  } catch (err) {
    console.error(
      `[DEBUG] Failed to fetch dynamic page by slug "${slug}":`,
      err instanceof Error ? err.message : "Unknown error"
    );
    console.error(`[DEBUG] Full error details:`, JSON.stringify(err, null, 2));
    
    // Don't throw the error - return null to handle gracefully
    return null;
  }
}

// Utility function to get page type from metadata or pageType
export function getPageTypeFromData(pageData: DynamicPageData): string {
  // Check pageType first
  if (pageData.pageType?.slug) {
    return pageData.pageType.slug;
  }

  // Check metadata for page type
  const pageTypeMetadata = pageData.metadata.find(item => item.key === "pageType");
  if (pageTypeMetadata?.value) {
    return pageTypeMetadata.value;
  }

  // Default to landing page
  return "landing";
}

// Utility function to parse HTML widget from shop metadata
function parseHtmlWidgetFromMetadata(key: string, value: string) {
  const HTML_WIDGET_PREFIX = "html_widget_";
  
  if (!key.startsWith(HTML_WIDGET_PREFIX)) {
    return null;
  }

  try {
    const data = JSON.parse(value);
    const id = key.replace(HTML_WIDGET_PREFIX, "");
    
    return {
      id,
      name: data.name || "",
      description: data.description || "",
      slug: data.slug || "",
      html: data.html || "",
      javascript: data.javascript || "",
      css: data.css || "",
      type: data.type || "WIDGET",
      isActive: data.isActive !== false,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  } catch (error) {
    console.error("Failed to parse HTML widget metadata:", error);
    return null;
  }
}

// Convert HTML widget to DynamicPageData format
function convertWidgetToPageData(widget: { html?: string; css?: string; js?: string; title?: string; id?: string; type?: string; javascript?: string; name?: string; description?: string; slug?: string; isActive?: boolean; createdAt?: string }): DynamicPageData {
  // Extract content from HTML if it's a full document
  let extractedContent = widget.html || '';
  let extractedStyles = widget.css || '';
  
  // If HTML contains full document structure, extract body content
  if (extractedContent.includes('<!DOCTYPE html>') || extractedContent.includes('<html>')) {
    console.log(`[DEBUG] Extracting body content from full HTML document`);
    
    // Parse the HTML to extract body content
    const bodyMatch = extractedContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      extractedContent = bodyMatch[1];
      console.log(`[DEBUG] Extracted body content, length: ${extractedContent.length}`);
    }
    
    // Also extract any styles from head if not already in CSS field
    if (!widget.css || widget.css.trim() === '') {
      const styleMatches = widget.html?.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      if (styleMatches) {
        const extractedStylesFromHead = styleMatches.map(match => {
          const styleContent = match.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
          return styleContent ? styleContent[1] : '';
        }).join('\n');
        
        extractedStyles = extractedStylesFromHead;
        console.log(`[DEBUG] Extracted styles from head, length: ${extractedStyles.length}`);
      }
    }
  }

  // Keep original CSS with minimal modifications to preserve dashboard design
  const scopedStyles = extractedStyles || '';

  // Create clean content structure without interfering with original design
  const content = `
${extractedContent}

${scopedStyles ? `<style>
${scopedStyles}
</style>` : ''}

${widget.javascript ? `<script>(function() { ${widget.javascript} })();</script>` : ''}
  `.trim();

  // Map widget type to page type
  const pageTypeSlug = widget.type === 'CALCULATOR' ? 'calculator' : 
                      widget.type === 'LANDING_PAGE' ? 'landing' :
                      'widget';

  return {
    id: `widget_${widget.id}`,
    title: widget.name || widget.title || 'Widget',
    seoTitle: `${widget.name || widget.title || 'Widget'} | Your Site`,
    seoDescription: widget.description || `${widget.name || widget.title || 'Widget'} - Interactive ${widget.type?.toLowerCase() || 'widget'}`,
    content,
    pageType: {
      id: `type_${widget.type || 'widget'}`,
      name: widget.type || 'widget',
      slug: pageTypeSlug,
    },
    slug: widget.slug || `widget-${widget.id}`,
    isPublished: widget.isActive ?? true,
    publicationDate: widget.createdAt || null,
    metadata: [
      { key: 'widgetType', value: widget.type || 'widget' },
      { key: 'widgetId', value: widget.id || 'unknown' },
      { key: 'isHtmlWidget', value: 'true' },
      { key: 'pageType', value: pageTypeSlug },
    ],
    excerpt: widget.description || "",
  };
}