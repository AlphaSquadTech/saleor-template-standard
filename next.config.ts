import type { NextConfig } from "next";

function uniq<T>(items: T[]) {
  return Array.from(new Set(items));
}

function toHost(urlOrHost?: string | null): string | null {
  if (!urlOrHost) return null;
  const raw = urlOrHost.trim();
  if (!raw) return null;

  // Allow passing a bare hostname (e.g. "cdn.example.com") or a URL.
  try {
    if (/^https?:\/\//i.test(raw)) return new URL(raw).hostname;
  } catch {
    // fall through
  }
  return raw.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
}

function getRemoteImageHosts(): string[] {
  // Built-in hosts used by the default template content.
  // Keep this list small and prefer env-based allowlisting for tenant-specific assets.
  const builtInHosts = [
    "images.unsplash.com",
    // Saleor/WMS common asset buckets (seen in template seed content).
    "wsm-saleor-assets.s3.us-west-2.amazonaws.com",
    "wsmsaleormedia.s3.us-east-1.amazonaws.com",
  ];

  const envHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((h) => toHost(h))
    .filter((h): h is string => Boolean(h));

  // Common: allow images from the Saleor API hostname (media URLs).
  const saleorHost = toHost(process.env.NEXT_PUBLIC_API_URL);

  // Common: allow images served from an assets CDN/base URL.
  const assetsHost = toHost(process.env.NEXT_PUBLIC_ASSETS_BASE_URL);

  return uniq([saleorHost, assetsHost, ...builtInHosts, ...envHosts].filter(Boolean) as string[]);
}

const HTTP_IMAGE_HOSTS = new Set([
  // Some upstream content uses http:// links for these buckets.
  "wsm-saleor-assets.s3.us-west-2.amazonaws.com",
  "wsmsaleormedia.s3.us-east-1.amazonaws.com",
]);

const nextConfig: NextConfig = {
  // Configure headers for Apple Pay domain association file
  async headers() {
    return [
      {
        source: '/.well-known/apple-developer-merchantid-domain-association',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/octet-stream',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "http", // for local dev server
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
      // Explicit allowlist for template consumers
      ...getRemoteImageHosts().flatMap((hostname) => {
        const patterns: Array<{
          protocol: "https" | "http";
          hostname: string;
          pathname: string;
          port?: string;
        }> = [{ protocol: "https", hostname, pathname: "/**" }];
        if (HTTP_IMAGE_HOSTS.has(hostname)) {
          patterns.push({ protocol: "http", hostname, pathname: "/**" });
        }
        return patterns;
      }),
    ],
  },
};

export default nextConfig;
