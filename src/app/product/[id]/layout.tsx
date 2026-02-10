import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Product Details - ${getStoreName()}`,
    description: `View detailed information about this product. Check compatibility, pricing, and specifications.`,
  }
}

export default function ProductDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}