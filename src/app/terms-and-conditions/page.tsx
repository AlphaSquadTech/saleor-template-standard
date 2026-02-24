import AncillaryContent from "@/app/components/ancillary/AncillaryContent";
import ContentSkeleton from "@/app/components/skeletons/ContentSkeleton";
import { getStoreName } from "@/app/utils/branding";
import type { Metadata } from "next";
import { Suspense } from "react";
import Breadcrumb from "@/app/components/reuseableUI/breadcrumb";
import Heading from "@/app/components/reuseableUI/heading";

export const metadata: Metadata = {
  title: `Terms & Conditions - ${getStoreName()}`,
  description: `Read our terms and conditions for purchasing products and using ${getStoreName()} services.`,
};

export default function TermsAndConditionsPage() {
  const derivedTitle = "Terms & Conditions";

  return (
    <main className="h-full w-full">
      <div className="container mx-auto max-w-[1276px]">
        <div className="flex flex-col items-start w-full px-4 md:px-6 py-12 md:py-16 lg:py-24">
          <div className="flex flex-col items-start gap-5 mb-6 w-full">
            <Breadcrumb
              items={[
                { text: "Home", link: "/" },
                { text: "Terms & Conditions", link: "/terms-and-conditions" },
              ]}
            />
            <Heading content={derivedTitle} />
          </div>

          <section className="w-full">
            <Suspense fallback={<ContentSkeleton />}>
              <AncillaryContent slug="terms-and-conditions" />
            </Suspense>
          </section>
        </div>
      </div>
    </main>
  );
}
