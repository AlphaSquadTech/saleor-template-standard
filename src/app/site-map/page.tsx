import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/app/components/reuseableUI/breadcrumb";
import Heading from "@/app/components/reuseableUI/heading";
import EditorRenderer from "@/app/components/richText/EditorRenderer";
import { fetchBlogBySlug } from "@/graphql/queries/getBlogs";
import { getStoreName } from "@/app/utils/branding";
import {
  generateBlogPostingSchema,
  generateBreadcrumbSchema,
} from "@/lib/schema";

export async function generateMetadata(): Promise<Metadata> {
  const post = await fetchBlogBySlug("site-map");

  if (!post || !post.title) {
    return {
      title: `Site Map - ${getStoreName()}`,
      description: `Explore the comprehensive site map of ${getStoreName()} to easily navigate through all sections and find what you're looking for quickly.`,
    };
  }

  return {
    title: `${post.title} - ${getStoreName()}`,
    description:
      post.title ||
      `Explore the comprehensive site map of ${getStoreName()} to easily navigate through all sections and find what you're looking for quickly.`,
  };
}

export default async function SiteMapPage() {
  const post = await fetchBlogBySlug("site-map");

  if (!post || !post.title) {
    return (
      <main className="container mx-auto px-4 md:px-6 py-12 text-center">
        <h1 className="text-3xl font-bold mb-4">Content Not Found</h1>
        <p className="mb-6">The requested site map could not be found.</p>
        <Link
          href="/"
          className="text-[var(--color-primary-600)] hover:underline"
        >
          ← Back to Home
        </Link>
      </main>
    );
  }

  // Generate schema.org structured data
  const blogSchema = generateBlogPostingSchema(
    post.title,
    post.title,
    "/site-map",
    post.created || new Date().toISOString(),
    post.created || new Date().toISOString()
  );

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: post.title, url: "/site-map" },
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
                { text: post.title, link: "/site-map" },
              ]}
            />
            <Heading content={post.title} />
          </div>

          <div className="w-full flex flex-col items-start gap-6">
            {/* Site Map Content */}
            <div className="w-full">
              <EditorRenderer content={post.content} />
            </div>

            {/* Back to Home Link */}
            <div className="w-full pt-8 border-t border-[var(--color-secondary-200)]">
              <Link
                href="/"
                className="text-[var(--color-primary-600)] hover:underline inline-flex items-center gap-2"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
