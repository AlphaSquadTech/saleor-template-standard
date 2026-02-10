import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export const metadata: Metadata = {
  title: `Content - ${getStoreName()}`,
  description: `Check out our latest content and articles to stay updated with the newest trends and insights.`,
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}