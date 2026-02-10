import BlogEditorRenderer from "@/app/blog/[slug]/blogContentRenderer";
import Breadcrumb from "@/app/components/reuseableUI/breadcrumb";
import Heading from "@/app/components/reuseableUI/heading";
import { getStoreName } from "@/app/utils/branding";
import { fetchBlogBySlug } from "@/graphql/queries/getBlogs";
import {
  generateBlogPostingSchema,
  generateBreadcrumbSchema,
} from "@/lib/schema";
import type { Metadata } from "next";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchBlogBySlug(slug);

  if (!post || !post.title) {
    return {
      title: `Content Page Not Found - ${getStoreName()}`,
    };
  }

  return {
    title: `${post.title} - ${getStoreName()}`,
    description: post.title,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchBlogBySlug(slug);

  if (!post || !post.title) {
    return (
      <main className="container mx-auto px-4 md:px-6 py-12 text-center">
        <h1 className="text-3xl font-bold mb-4">Content Page Not Found</h1>
        <p className="mb-6">The requested content page could not be found.</p>
        <Link
          href="/content"
          className="text-[var(--color-primary-600)] hover:underline"
        >
          ← Back to Content
        </Link>
      </main>
    );
  }

  // Format date if available
  const formattedDate = post.created
    ? new Date(post.created).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  // Generate schema.org structured data
  const blogSchema = generateBlogPostingSchema(
    post.title,
    post.title,
    `/content/${slug}`,
    post.created || new Date().toISOString(),
    post.created || new Date().toISOString()
  );

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Content", url: "/content" },
    { name: post.title, url: `/content/${slug}` },
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
                { text: "CONTENT", link: "/content" },
                { text: post.title, link: `/content/${post.slug}` },
              ]}
            />
            <Heading content={post.title} />
            {post?.metadata?.filter((item) => item?.key === "topic")[0]
              ?.value && (
              <span className="w-fit text-xs font-medium text-[var(--color-primary-600)] bg-[var(--color-primary-100)] px-2 py-1 rounded-full">
                {
                  post?.metadata?.filter((item) => item?.key === "topic")[0]
                    ?.value
                }
              </span>
            )}
            {formattedDate && (
              <p className="text-sm text-[var(--color-secondary-500)]">
                Published on {formattedDate}
              </p>
            )}
          </div>

          <div className="w-full flex flex-col items-start gap-6">
            {/* Blog Content */}
            <div className="w-full">
              <BlogEditorRenderer content={post.content} />
            </div>

            {/* Back to Blog Link */}
            <div className="w-full pt-8 border-t border-[var(--color-secondary-200)]">
              <Link
                href="/content"
                className="text-[var(--color-primary-600)] hover:underline inline-flex items-center gap-2"
              >
                ← Back to all content
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
