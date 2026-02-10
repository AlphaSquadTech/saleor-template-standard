import React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import Breadcrumb from "@/app/components/reuseableUI/breadcrumb"
import Heading from "@/app/components/reuseableUI/heading"
import EditorRenderer from "@/app/components/richText/EditorRenderer"
import { fetchBlogBySlug } from "@/graphql/queries/getBlogs"
import { getStoreName } from "@/app/utils/branding"
import {
  generateBlogPostingSchema,
  generateBreadcrumbSchema,
} from "@/lib/schema"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await fetchBlogBySlug(slug)

  if (!post || !post.title) {
    return {
      title: `Blog Post Not Found - ${getStoreName()}`,
    }
  }

  return {
    title: `${post.title} - ${getStoreName()}`,
    description: post.title,
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await fetchBlogBySlug(slug)

  if (!post || !post.title) {
    return (
      <main className="container mx-auto px-4 md:px-6 py-12 text-center">
        <h1 className="text-3xl font-bold mb-4">Post Not Found</h1>
        <p className="mb-6">The requested blog post could not be found.</p>
        <Link href="/blog" className="text-[var(--color-primary-600)] hover:underline">
          ← Back to Blog
        </Link>
      </main>
    )
  }

  // Format date if available
  const formattedDate = post.created
    ? new Date(post.created).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : ""

  // Generate schema.org structured data
  const blogSchema = generateBlogPostingSchema(
    post.title,
    post.title,
    `/blog/${slug}`,
    post.created || new Date().toISOString(),
    post.created || new Date().toISOString()
  );

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
    { name: post.title, url: `/blog/${slug}` },
  ]);

  return (
    <main className="h-full w-full">
      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="container mx-auto max-w-[1276px]">
        <div className="flex flex-col items-start w-full gap-8 px-4 md:px-6 py-12 md:py-16 lg:py-24">
          <div className="flex flex-col items-start gap-5 w-full">
            <Breadcrumb
              items={[
                { text: "Home", link: "/" },
                { text: "BLOGS", link: "/blog" },
                { text: post.title, link: `/blog/${post.slug}` },
              ]}
            />
            <Heading content={post.title} />
            {formattedDate && (
              <p className="text-sm text-[var(--color-secondary-500)]">
                Published on {formattedDate}
              </p>
            )}
          </div>

          <div className="w-full flex flex-col items-start gap-6">
            {/* Blog Content */}
            <div className="w-full">
              <EditorRenderer content={post.content} />
            </div>

            {/* Back to Blog Link */}
            <div className="w-full pt-8 border-t border-[var(--color-secondary-200)]">
              <Link
                href="/blog"
                className="text-[var(--color-primary-600)] hover:underline inline-flex items-center gap-2"
              >
                ← Back to all blogs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
