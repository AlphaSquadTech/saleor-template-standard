import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export type Theme = "asphalt";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// utils/function.ts

export const EXTENSIONS = ["webp", "png", "jpeg", "jpg"] as const;

/** Remove trailing slashes */
export function trimSlash(s?: string | null): string {
  return (s || "").replace(/\/+$/, "");
}

/** Strip known image extensions from a URL */
export function stripImageExt(url: string): string {
  return url.replace(/\.(webp|png|jpe?g)$/i, "");
}

export type SrcRoot =
  | string
  | {
      basePath: string;
      fileName: string; // without extension
    };

/**
 * Build candidate URLs in preferred extension order.
 */
export function getImageCandidates(
  input: SrcRoot,
  extensions: readonly string[] = EXTENSIONS
): string[] {
  if (typeof input === "string") {
    const root = stripImageExt(input);
    return extensions.map((ext) => `${root}.${ext}`);
  }

  const basePath = trimSlash(input.basePath);
  const fileRoot = `${basePath}/${input.fileName}`;
  return extensions.map((ext) => `${fileRoot}.${ext}`);
}

/**
 * Normalize a Saleor product slug for URL display by replacing multiple consecutive dashes with single dash.
 *
 * Saleor often generates slugs with multiple dashes (e.g., --- or --) that should be
 * displayed as single dashes in URLs for better readability.
 *
 * @example normalizeSlugForUrl("aero-exhaust---blue-flame-dual-tip---30")
 * // Returns: "aero-exhaust-blue-flame-dual-tip-30"
 */
export function normalizeSlugForUrl(slug: string): string {
  if (!slug) return "";

  // Replace 2 or more consecutive dashes with a single dash
  return slug.replace(/-{2,}/g, "-");
}

/**
 * Denormalize a URL slug back to Saleor's format for API queries.
 *
 * Since we normalized the slug by replacing multiple consecutive dashes with single dashes,
 * we simply return the slug as-is because Saleor should be able to match it.
 *
 * If Saleor can't match the normalized slug, consider using product ID for queries instead.
 *
 * @example denormalizeSlugForApi("aero-exhaust-blue-flame-dual-tip-30-outlet-30497695")
 * // Returns: "aero-exhaust-blue-flame-dual-tip-30-outlet-30497695" (as-is)
 */
export function denormalizeSlugForApi(urlSlug: string): string {
  if (!urlSlug) return "";

  // Return the slug as-is. Saleor's GraphQL API should handle slug matching
  // flexibly enough to match both normalized and non-normalized formats.
  return urlSlug;
}

/**
 * Create an SEO-friendly product URL with normalized slug + product ID.
 * Format: /product/{normalized-slug}-{product-id}
 * @example createProductUrl("aero-exhaust---turbine", "UHJvZHVjdDozMDQ5NzYwNg==")
 * Returns: "aero-exhaust-turbine-UHJvZHVjdDozMDQ5NzYwNg"
 */
export function createProductUrl(slug: string, productId: string): string {
  const normalizedSlug = normalizeSlugForUrl(slug);
  // Append product ID to the end for reliable querying
  return `${normalizedSlug}-${productId}`;
}

/**
 * Extract product ID from a Saleor slug that has numeric ID at the end.
 * Saleor slugs often end with the product ID number.
 * @example extractProductIdFromSlug("aero-exhaust---turbine-30497612")
 * Returns: "30497612"
 */
export function extractProductIdFromSlug(slug: string): string | null {
  if (!slug) return null;

  // Match numeric ID at the end of the slug
  const match = slug.match(/-(\d+)$/);

  if (match && match[1]) {
    return match[1];
  }

  return null;
}

/**
 * Remove the product ID from the end of a Saleor slug.
 * @example removeProductIdFromSlug("aero-exhaust---turbine-30497612")
 * Returns: "aero-exhaust---turbine"
 */
export function removeProductIdFromSlug(slug: string): string {
  if (!slug) return "";

  // Remove numeric ID from the end
  return slug.replace(/-\d+$/, "");
}

/**
 * Ensures image URL has the S3 base URL if it's a relative path
 * @param imageUrl - The image URL (can be relative or absolute)
 * @returns Full image URL with S3 base if needed
 */
export function getFullImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return "";

  // If already has protocol (http:// or https://), return as is
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  if (imageUrl.endsWith("/no-image-avail-large.png")) {
    return imageUrl;
  }

  // If it's a relative path, prepend S3 base URL
  const S3_BASE_URL = "https://wsm-saleor-assets.s3.us-west-2.amazonaws.com";
  const cleanPath = imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl;
  return `${S3_BASE_URL}/${cleanPath}`;
}
