import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Category - ${getStoreName()}`,
    description: `Browse products in this category. Find high-quality parts and accessories for your needs.`,
  }
}

export default function CategoryDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}