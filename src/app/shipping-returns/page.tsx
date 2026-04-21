import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import AncillaryContent from "@/app/components/ancillary/AncillaryContent";
import ContentSkeleton from "@/app/components/skeletons/ContentSkeleton";
import { getStoreName } from "@/app/utils/branding";
import Breadcrumb from "@/app/components/reuseableUI/breadcrumb";
import Heading from "@/app/components/reuseableUI/heading";

export const metadata: Metadata = {
  title: `Shipping & Returns - ${getStoreName()}`,
  description:
    "Learn about our shipping options, delivery times, return policy, and how to process returns for your products.",
  alternates: {
    canonical: "/shipping-returns",
  },
};

export default function ShippingAndReturnsPage() {
  const pageTitle = "Shipping & Returns";

  return (
    <main className="h-full w-full">
      <div className="container mx-auto max-w-[1276px]">
        <div className="flex flex-col items-start w-full px-4 md:px-6 py-12 md:py-16 lg:py-24">
          <div className="flex flex-col items-start gap-5 mb-6 w-full">
            <Breadcrumb
              items={[
                { text: "Home", link: "/" },
                { text: "Shipping & Returns", link: "/shipping-returns" },
              ]}
            />
            <Heading content={pageTitle} />
          </div>

          <section className="w-full">
            <Suspense fallback={<ContentSkeleton />}>
              <AncillaryContent slug="shipping-returns" />
            </Suspense>
          </section>
        </div>
      </div>
    </main>
  );
}
