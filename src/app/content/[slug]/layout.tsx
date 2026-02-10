import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Content - ${getStoreName()}`,
    description: `Check out our latest content and articles to stay updated with the newest trends and insights.`,
  }
}

export default function BlogPostLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}