// Tenant root layout
// Imports tenant-specific globals.css, then re-exports core layout
import "./globals.css";

// Re-export everything from core's layout
// Using direct path since @/ would resolve to this file first
export { default } from "../../core/src/app/layout";
export { metadata } from "../../core/src/app/layout";
