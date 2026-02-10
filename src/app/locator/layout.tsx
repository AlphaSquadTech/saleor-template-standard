import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export const metadata: Metadata = {
  title: `Store Locator - ${getStoreName()}`,
  description: `Find ${getStoreName()} locations near you. Get directions, hours, and contact information for our retail partners.`,
}

export default function LocatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}