// Tenant root layout
// Imports tenant-specific globals.css, then re-exports core layout
import "./globals.css";

// Re-export everything from core's layout
export { default, metadata } from "@core/app/layout";
