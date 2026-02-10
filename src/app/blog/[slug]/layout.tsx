import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Blog Post - ${getStoreName()}`,
    description: `Read this article with expert insights, tips, and advice from ${getStoreName()}'s team.`,
  }
}

export default function BlogPostLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}