import {
  generateOrganizationSchema,
  generateWebsiteSchema,
} from "@/lib/schema";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import BlogSection from "./components/homeBlog/blogHomeSection";
import NewslettersHomeModal from "./components/newslettersHomeModal";
import { SkeletonLoader } from "./components/reuseableUI/skeletonLoader";
import { BundleProducts } from "./components/showroom/bundleProducts";
import HomeYoutubeSection from "./components/showroom/homeYoutubeSection";
import { ProductGrid } from "./components/showroom/productGrid";
import { ShowroomHeroCarousel } from "./components/showroom/showroomHeroCarousel";
import { TestimonialsGrid } from "./components/showroom/testimonialsGrid";
import { getStoreName } from "./utils/branding";

export const metadata: Metadata = {
  title: `Home - ${getStoreName()}`,
  description:
    "Discover our featured products, best sellers, and exclusive offers. Shop quality products with fast shipping and satisfaction guarantee.",
};

// Revalidate every 1 hour (3600 seconds)
export const revalidate = 3600;
const Promotions = dynamic(
  () =>
    import("./components/showroom/promotion").then((mod) => ({
      default: mod.Promotions,
    })),
  {
    loading: () => (
      <div className="w-full h-[704px] bg-gray-200 animate-pulse" />
    ),
  },
);

export default function Home() {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const storeName = getStoreName();

  const organizationSchema = generateOrganizationSchema(
    storeName,
    baseUrl,
    "/logo.png",
    [],
  );

  const websiteSchema = generateWebsiteSchema(storeName, baseUrl, "/search");

  return (
    <>
      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      <Suspense fallback={<SkeletonLoader type="hero" />}>
        <ShowroomHeroCarousel />
      </Suspense>

      <Promotions />

      <HomeYoutubeSection />

      <Suspense
        fallback={
          <div className="container mx-auto m-24 flex flex-col gap-6 lg:gap-16">
            <div className="w-full max-w-[30%] bg-gray-200   animate-pulse rounded h-12" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SkeletonLoader type="product" count={4} />
            </div>
          </div>
        }
      >
        <ProductGrid
          heading={"FEATURED PRODUCTS"}
          collection="featured-products"
          count={4}
        />
      </Suspense>

      {/* Categories */}
      {/* <Suspense
        fallback={
          <div className="container mx-auto m-24 flex flex-col gap-16">
            <div className="w-full flex justify-between items-center">
              <div className="w-full max-w-3xs bg-gray-200   animate-pulse rounded h-12" />
              <div className="flex gap-2">
                <div className="rounded-full size-10 bg-gray-200 animate-pulse " />
                <div className="rounded-full size-10 bg-gray-200 animate-pulse " />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <SkeletonLoader type="category" count={5} />
            </div>
          </div>
        }
      >
        <CategoryGridServer />
      </Suspense> */}

      {/* Bundle Products */}
      <Suspense
        fallback={
          <div className="container mx-auto m-24 flex flex-col gap-16">
            <div className="w-full flex justify-between items-center">
              <div className="w-full max-w-3xs bg-gray-200   animate-pulse rounded h-12" />
              <div className="rounded w-28 h-8 bg-gray-200 animate-pulse " />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <SkeletonLoader type="category" count={5} />
            </div>
          </div>
        }
      >
        <BundleProducts collection="bundle-2" />
      </Suspense>

      <Suspense
        fallback={
          <div
            className="py-24"
            style={{ backgroundColor: "var(--color-secondary-50)" }}
          >
            <div className="container mx-auto">
              <div className="w-full max-w-3xs bg-gray-200 animate-pulse rounded h-12 mb-16" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="bg-gray-200 rounded-lg p-8 animate-pulse h-64"
                  >
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
                    <div className="space-y-2 mb-6">
                      <div className="h-4 bg-gray-300 rounded"></div>
                      <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                      <div className="h-4 bg-gray-300 rounded w-4/6"></div>
                    </div>
                    <div className="flex items-center gap-3 mt-auto">
                      <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                      <div className="h-4 bg-gray-300 rounded w-24"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        }
      >
        <TestimonialsGrid first={6} />
      </Suspense>

      {/* Brands */}
      {/* <Suspense
        fallback={
          <div
            className="py-12 px-4 md:px-6 md:py-16 lg:py-24 lg:px-0"
            style={{ backgroundColor: "white" }}
          >
            <div className="container mx-auto">
              <div className="w-full max-w-3xs bg-gray-200 animate-pulse rounded h-12 mb-16" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div
                    key={item}
                    className="bg-gray-200 rounded-lg p-6 animate-pulse h-32"
                  >
                    <div className="h-16 bg-gray-300 rounded mb-4"></div>
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        }
      >
        <BrandsSwiperServer />
      </Suspense> */}

      <Suspense>
        <BlogSection />
      </Suspense>

      <NewslettersHomeModal />
    </>
  );
}
