import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export const metadata: Metadata = {
  title: `Blog - ${getStoreName()}`,
  description: `Read tips, product reviews, guides, and industry news from ${getStoreName()} experts.`,
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}