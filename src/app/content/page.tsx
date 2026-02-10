import { getStoreName } from "@/app/utils/branding";
import { fetchContentPages } from "@/graphql/queries/getContentPage";
import {
  generateBreadcrumbSchema,
  generateCollectionPageSchema,
} from "@/lib/schema";
import type { Metadata } from "next";
import { Suspense } from "react";
import BlogList from "../components/blog/BlogList";
import Breadcrumb from "../components/reuseableUI/breadcrumb";
import Heading from "../components/reuseableUI/heading";

export const metadata: Metadata = {
  title: `Content - ${getStoreName()}`,
  description:
    "Read our latest articles, news, and insights about our products and services.",
};

export default async function BlogPage() {
  // Fetch blog posts from CMS
  const content = await fetchContentPages();

  // Generate schema.org structured data
  const collectionSchema = generateCollectionPageSchema(
    "Content",
    "Read our latest articles, news, and insights about our products and services.",
    "/content"
  );

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Content", url: "/content" },
  ]);

  return (
    <main className="h-full w-full">
      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="container mx-auto max-w-[1276px]">
        <div className="flex flex-col items-start w-full gap-16 px-4 md:px-6 py-12 md:py-16 lg:py-24">
          <div className="flex flex-col items-start gap-5 w-full">
            <Breadcrumb
              items={[
                { text: "Home", link: "/" },
                { text: "CONTENT", link: "/content" },
              ]}
            />

            <Heading
              content="Content"
              className="!text-[var(--color-primary-600)]"
            />
          </div>

          <Suspense fallback={<div>Loading contents...</div>}>
            <BlogList blogs={content} pageRoute={"content"} pageSize={9} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
