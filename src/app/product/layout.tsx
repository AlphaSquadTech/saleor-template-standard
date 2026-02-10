import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export const metadata: Metadata = {
  title: `Products - ${getStoreName()}`,
  description: "Explore our complete product catalog. Find parts, accessories, and performance upgrades for your needs.",
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}