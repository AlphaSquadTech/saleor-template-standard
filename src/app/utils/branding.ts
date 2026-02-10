export function getTenantName() {
  return process.env.NEXT_PUBLIC_TENANT_NAME || "default";
}

export function getStoreName() {
  const tenantName = getTenantName();
  return tenantName.charAt(0).toUpperCase() + tenantName.slice(1).replace(/-/g, ' ') + " Store";
}

export function getAssetsBaseUrl() {
  // e.g. https://zgnluljrtbddtwugakuf.supabase.co
  return process.env.NEXT_PUBLIC_ASSETS_BASE_URL || "";
}

function joinUrl(...parts: string[]) {
  return parts
    .filter(Boolean)
    .map((p, i) => (i === 0 ? p.replace(/\/$/, "") : p.replace(/^\/+|\/+$/g, "")))
    .join("/");
}

// Helpers to sanitize env inputs
function pickFirstUrlToken(input?: string) {
  if (!input) return undefined;
  const trimmed = input.trim();
  // If there are accidental extra tokens (e.g., ".../favicon.png favicon.png"), take the first token
  const firstToken = trimmed.split(/\s+/)[0];
  return firstToken.replace(/^\"|\"$/g, "");
}

function cleanPathToken(input?: string, fallback = "") {
  const v = (input ?? fallback).trim();
  return v.replace(/^\"|\"$/g, "");
}

export function getAppIconUrl() {
  const explicit = pickFirstUrlToken(process.env.NEXT_PUBLIC_APP_ICON);
  if (explicit && /^https?:\/\//i.test(explicit)) return explicit;

  const base = getAssetsBaseUrl();
  const tenant = getTenantName();
  const file = cleanPathToken(process.env.NEXT_PUBLIC_APP_ICON_FILENAME, "favicon.ico");
  const dir = cleanPathToken(process.env.NEXT_PUBLIC_APP_ICON_DIR, ""); // optional subfolder
  if (!base) return explicit || "/icons/appIcon.png";
  const pathParts = file.includes("/") ? [file] : (dir ? [dir, file] : [file]);
  return joinUrl(
    base,
    "storage/v1/object/public/storefront-assets",
    tenant,
    ...pathParts
  );
}
