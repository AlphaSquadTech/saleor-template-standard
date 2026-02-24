import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import AncillaryContent from "@/app/components/ancillary/AncillaryContent";
import ContentSkeleton from "@/app/components/skeletons/ContentSkeleton";
import { getStoreName } from "@/app/utils/branding";
import Breadcrumb from "@/app/components/reuseableUI/breadcrumb";
import Heading from "@/app/components/reuseableUI/heading";

export const metadata: Metadata = {
  title: `FAQ - ${getStoreName()}`,
  description: `Find answers to frequently asked questions about ordering, shipping, returns, and product compatibility at ${getStoreName()}.`,
};

export default function FAQPage() {
  const derivedTitle = "FAQS";

  return (
    <main className="h-full w-full">
      <div className="container mx-auto max-w-[1276px]">
        <div className="flex flex-col items-start w-full px-4 md:px-6 py-12 md:py-16 lg:py-24">
          <div className="flex flex-col items-start gap-5 mb-6 w-full">
            <Breadcrumb
              items={[
                { text: "Home", link: "/" },
                { text: "FAQS", link: "/frequently-asked-questions" },
              ]}
            />
            <Heading content={derivedTitle} />
          </div>

          <section className="w-full">
            <Suspense fallback={<ContentSkeleton />}>
              <AncillaryContent slug="frequently-asked-questions" />
            </Suspense>
          </section>
        </div>
      </div>
    </main>
  );
}
