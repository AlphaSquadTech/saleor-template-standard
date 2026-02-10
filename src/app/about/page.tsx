import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import AncillaryContent from "@/app/components/ancillary/AncillaryContent";
import ContentSkeleton from "@/app/components/skeletons/ContentSkeleton";
import { getStoreName } from "@/app/utils/branding";
import Breadcrumb from "../components/reuseableUI/breadcrumb";
import Heading from "../components/reuseableUI/heading";

export const metadata: Metadata = {
  title: `About Us - ${getStoreName()}`,
  description:
    "Learn about our mission, values, and commitment to providing high-quality products and exceptional customer service.",
};

export default function AboutUsPage() {
  const pageTitle = "About Us";

  return (
    <main className="h-full w-full">
      <div className="container mx-auto max-w-[1276px] ">
        <div className="flex flex-col items-start w-full px-4 md:px-6 py-12 md:py-16 lg:py-24">
          <div className="flex flex-col items-start gap-5 mb-6 w-full">
            <Breadcrumb
              items={[
                { text: "Home", link: "/" },
                { text: "About Us", link: "/about" },
              ]}
            />
            <Heading content={pageTitle} />
          </div>

          <section className="w-full">
            <Suspense fallback={<ContentSkeleton />}>
              {/* Async content fetch and render */}
              <AncillaryContent slug="about" />
            </Suspense>
          </section>
        </div>
      </div>
    </main>
  );
}
