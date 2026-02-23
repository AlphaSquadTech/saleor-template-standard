import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  "wsm-saleor-assets.s3.us-west-2.amazonaws.com",
  "wsmsaleormedia.s3.us-east-1.amazonaws.com",
]);

// --- Tenant Override Resolution ---
const tenantRoot = process.env.NEXT_TENANT_ROOT || process.cwd();
const tenantOverridesIndex = path.join(tenantRoot, "src", "overrides", "index.ts");
const tenantOverridesDir = path.join(tenantRoot, "src", "overrides");
const hasTenantOverrides =
  fs.existsSync(tenantOverridesIndex) ||
  fs.existsSync(tenantOverridesIndex.replace(".ts", ".tsx")) ||
  fs.existsSync(tenantOverridesIndex.replace(".ts", ".js"));

const templateSrcDir = path.join(tenantRoot, "src");
const tenantSymlinkPath = path.join(templateSrcDir, "tenant-overrides");
if (hasTenantOverrides && !fs.existsSync(tenantSymlinkPath)) {
  try {
    fs.symlinkSync(tenantOverridesDir, tenantSymlinkPath, "dir");
  } catch (e) {
    console.error("Error creating tenant overrides symlink:", e);
  }
}

const nextConfig: NextConfig = {
  transpilePackages: ["@alphasquad/saleor-template-standard"],
  turbopack: {
    resolveAlias: {
      "@": path.resolve(__dirname, "src"),
      "@tenant-overrides": hasTenantOverrides
        ? "@/tenant-overrides"
        : "@/lib/overrides/defaults",
    },
  },
  webpack(config) {
    config.resolve.alias["@"] = path.resolve(__dirname, "src");

    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};

    if (hasTenantOverrides) {
      (config.resolve.alias as Record<string, string>)["@tenant-overrides"] =
        tenantOverridesDir;
    } else {
      const candidates = [
        path.join(path.dirname(require.resolve("./package.json")), "src", "lib", "overrides", "defaults"),
        path.join(process.cwd(), "src", "lib", "overrides", "defaults"),
      ];
      const defaultsPath = candidates.find((p) =>
        fs.existsSync(p + ".ts") || fs.existsSync(p + ".js")
      ) || candidates[0];
      (config.resolve.alias as Record<string, string>)["@tenant-overrides"] = defaultsPath;
    }

    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
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
