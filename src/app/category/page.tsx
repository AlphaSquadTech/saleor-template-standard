import { CategoryCard } from "../components/reuseableUI/categoryCard";
import { Suspense } from "react";
import type { Metadata } from "next";
import { CategorySkeleton } from "../components/reuseableUI/categorySkeleton";
import { getStoreName } from "@/app/utils/branding";
import {
  generateCollectionPageSchema,
  generateBreadcrumbSchema,
} from "@/lib/schema";

export const metadata: Metadata = {
  title: `Categories - ${getStoreName()}`,
  description: "Browse our product categories. Find products organized by type, category, and performance level.",
}

const categories = [
  {
    id: 1,
    name: "Premium Engine Parts",
    description:
      "Luxury performance engine components for discerning enthusiasts",
    image:
      "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&h=300&fit=crop&auto=format",
    href: "/category/1",
    productCount: 1247,
  },
  {
    id: 2,
    name: "Elite Brake Systems",
    description: "High-end brake components for superior stopping power",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format",
    href: "/category/2",
    productCount: 892,
  },
  {
    id: 3,
    name: "Luxury Suspension",
    description: "Premium suspension systems for the ultimate ride quality",
    image:
      "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=300&fit=crop&auto=format",
    href: "/category/3",
    productCount: 654,
  },
  {
    id: 4,
    name: "Performance Upgrades",
    description: "Exclusive performance enhancements for luxury vehicles",
    image:
      "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400&h=300&fit=crop&auto=format",
    href: "/category/4",
    productCount: 423,
  },
  {
    id: 5,
    name: "Premium Electrical",
    description: "High-quality electrical components and luxury accessories",
    image:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop&auto=format",
    href: "/category/5",
    productCount: 789,
  },
  {
    id: 6,
    name: "Luxury Exhaust",
    description: "Premium exhaust systems with refined sound and performance",
    image:
      "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400&h=300&fit=crop&auto=format",
    href: "/category/6",
    productCount: 356,
  },
];

export default function CategoryPage() {
  // Generate schema.org structured data
  const collectionSchema = generateCollectionPageSchema(
    'Categories',
    'Browse our product categories. Find products organized by type, category, and performance level.',
    '/category'
  );

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Categories", url: "/category" },
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <h1 className="text-3xl font-bold mb-4">All Categories</h1>
      <p className="text-gray-600 mb-6">
        Browse our wide selection of product categories.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {categories.map((category) => (
          <Suspense key={category.id} fallback={<CategorySkeleton variant="grid" /> }>
            <CategoryCard
              key={category.id}
              id={String(category.id)}
              name={category.name}
              image={category.image}
              href={category.href}
              description={category.description}
            />
          </Suspense>
        ))}
      </div>
    </div>
  );
}
