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

  try {
    if (/^https?:\/\//i.test(raw)) return new URL(raw).hostname;
  } catch {
    // fall through
  }
  return raw.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
}

function getRemoteImageHosts(): string[] {
  const builtInHosts = [
    "images.unsplash.com",
    "wsm-saleor-assets.s3.us-west-2.amazonaws.com",
    "wsmsaleormedia.s3.us-east-1.amazonaws.com",
  ];

  const envHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((h) => toHost(h))
    .filter((h): h is string => Boolean(h));

  const saleorHost = toHost(process.env.NEXT_PUBLIC_API_URL);
  const assetsHost = toHost(process.env.NEXT_PUBLIC_ASSETS_BASE_URL);

  return uniq([saleorHost, assetsHost, ...builtInHosts, ...envHosts].filter(Boolean) as string[]);
}

const HTTP_IMAGE_HOSTS = new Set([
  "wsm-saleor-assets.s3.us-west-2.amazonaws.com",
  "wsmsaleormedia.s3.us-east-1.amazonaws.com",
]);

// --- Paths ---
const tenantSrcDir = path.resolve(__dirname, "src");
const coreSrcDir = path.resolve(__dirname, "core", "src");
const hasCoreSubmodule = fs.existsSync(coreSrcDir);

// --- Tenant Override Resolution ---
const tenantOverridesDir = path.join(tenantSrcDir, "overrides");
const tenantOverridesIndex = path.join(tenantOverridesDir, "index.ts");
const hasTenantOverrides =
  fs.existsSync(tenantOverridesIndex) ||
  fs.existsSync(tenantOverridesIndex.replace(".ts", ".tsx")) ||
  fs.existsSync(tenantOverridesIndex.replace(".ts", ".js"));

// Create symlink for tenant-overrides resolution
const tenantSymlinkPath = path.join(tenantSrcDir, "tenant-overrides");
if (hasTenantOverrides && !fs.existsSync(tenantSymlinkPath)) {
  try {
    fs.symlinkSync(tenantOverridesDir, tenantSymlinkPath, "dir");
  } catch (e) {
    console.error("Error creating tenant overrides symlink:", e);
  }
}

// Defaults path: check tenant first, then core
function findDefaultsPath(): string {
  const candidates = [
    path.join(tenantSrcDir, "lib", "overrides", "defaults"),
    path.join(coreSrcDir, "lib", "overrides", "defaults"),
  ];
  return candidates.find((p) =>
    fs.existsSync(p + ".ts") || fs.existsSync(p + ".js")
  ) || candidates[0];
}

const nextConfig: NextConfig = {
  transpilePackages: ["@alphasquad/saleor-template-standard"],
  turbopack: {
    resolveAlias: {
      // For turbopack, we can only set one path per alias.
      // Tenant src takes priority; core is added via resolveModules-like behavior.
      "@": tenantSrcDir,
      "@core": path.resolve(__dirname, "core", "src"),
      "@tenant-overrides": hasTenantOverrides
        ? "@/tenant-overrides"
        : hasCoreSubmodule
          ? path.join(coreSrcDir, "lib", "overrides", "defaults")
          : path.join(tenantSrcDir, "lib", "overrides", "defaults"),
    },
  },
  webpack(config) {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.modules = config.resolve.modules || [];

    // @ alias resolves to tenant src first, then core src
    if (hasCoreSubmodule) {
      (config.resolve.alias as Record<string, string | string[]>)["@"] = [
        tenantSrcDir,
        coreSrcDir,
      ];

      // Add both src dirs to module resolution
      config.resolve.modules = [
        tenantSrcDir,
        coreSrcDir,
        ...config.resolve.modules,
      ];
    } else {
      (config.resolve.alias as Record<string, string>)["@"] = tenantSrcDir;
    }

    // @core alias — always points to core/src
    (config.resolve.alias as Record<string, string | string[]>)["@core"] = coreSrcDir;

    // Tenant overrides resolution
    if (hasTenantOverrides) {
      (config.resolve.alias as Record<string, string>)["@tenant-overrides"] =
        tenantOverridesDir;
    } else {
      (config.resolve.alias as Record<string, string>)["@tenant-overrides"] =
        findDefaultsPath();
    }

    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
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
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
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
