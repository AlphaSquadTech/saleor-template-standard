import BrandPageClient from "./BrandPageClient";
import {
  generateCollectionPageSchema,
  generateBreadcrumbSchema,
} from "@/lib/schema";
import { Metadata } from "next";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const brandName = decodedId
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return {
    title: `${brandName} | Shop`,
    description: `Browse our ${brandName} collection. Find the best products from ${brandName}.`,
    keywords: `${brandName}, brand, products, buy online`,
    openGraph: {
      title: `${brandName} | Shop`,
      description: `Browse our ${brandName} collection`,
      type: "website",
    },
  };
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const brandName = decodedId
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  // Generate schema.org structured data
  const collectionSchema = generateCollectionPageSchema(
    brandName,
    `Browse our ${brandName} collection. Find the best products from ${brandName}.`,
    `/brand/${id}`
  );

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Brands", url: "/brand" },
    { name: brandName, url: `/brand/${id}` },
  ]);

  return (
    <>
      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Suspense>
        <BrandPageClient />
      </Suspense>
    </>
  );
}
