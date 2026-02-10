import AllProductsClient from "./AllProductsClient";
import {
  generateCollectionPageSchema,
  generateBreadcrumbSchema,
} from "@/lib/schema";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "All Products | Shop",
  description:
    "Browse our complete collection of products. Find the best products across all categories.",
  keywords: "products, shop, buy online, all products",
  openGraph: {
    title: "All Products | Shop",
    description: "Browse our complete collection of products",
    type: "website",
  },
};

export default function ProductsPage() {
  // Generate schema.org structured data
  const collectionSchema = generateCollectionPageSchema(
    "All Products",
    "Browse our complete collection of products. Find the best products across all categories.",
    "/products/all"
  );

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Products", url: "/products/all" },
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
        <AllProductsClient />
      </Suspense>
    </>
  );
}
