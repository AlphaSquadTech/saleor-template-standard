import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Brand Products - ${getStoreName()}`,
    description: `Browse products from this brand. Find genuine parts and accessories with manufacturer warranty.`,
  }
}

export default function BrandDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}