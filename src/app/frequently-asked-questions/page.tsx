import { Suspense } from "react";
import type { Metadata } from "next";
import AncillaryContent from "@/app/components/ancillary/AncillaryContent";
import ContentSkeleton from "@/app/components/skeletons/ContentSkeleton";
import { getStoreName } from "@/app/utils/branding";
import Breadcrumb from "@/app/components/reuseableUI/breadcrumb";
import Heading from "@/app/components/reuseableUI/heading";
import { fetchPageBySlug } from "@core/graphql/queries/getPageBySlug";
import { parseRichText, richTextToPlainText } from "@core/lib/richText";

export const metadata: Metadata = {
  title: `FAQ - ${getStoreName()}`,
  description: `Find answers to frequently asked questions about ordering, shipping, returns, and product compatibility at ${getStoreName()}.`,
  alternates: {
    canonical: "/frequently-asked-questions",
  },
};

function stripHtml(input: string) {
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractFaqEntries(content: string | null | undefined) {
  if (!content) return [];

  const parsedRichText = parseRichText(content);
  if (parsedRichText.kind === "tinymce") {
    const plainText = richTextToPlainText(content);
    return plainText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .reduce<Array<{ question: string; answer: string }>>((items, line, index, arr) => {
        if (!line.endsWith("?")) return items;
        const answer = arr[index + 1]?.trim();
        if (answer) {
          items.push({ question: line, answer });
        }
        return items;
      }, []);
  }

  try {
    const parsed = JSON.parse(content) as {
      blocks?: Array<{
        type?: string;
        data?: {
          text?: string;
          items?: string[];
        };
      }>;
    };

    const blocks = parsed.blocks ?? [];
    const faqs: Array<{ question: string; answer: string }> = [];

    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      const text = stripHtml(block?.data?.text ?? "");

      if (!text || !text.endsWith("?")) continue;

      const nextBlock = blocks[index + 1];
      const answerText = stripHtml(nextBlock?.data?.text ?? "");
      const listText = (nextBlock?.data?.items ?? [])
        .map((item) => stripHtml(item))
        .filter(Boolean)
        .join(" ");
      const answer = answerText || listText;

      if (answer) {
        faqs.push({ question: text, answer });
      }
    }

    return faqs;
  } catch {
    return [];
  }
}

export default async function FAQPage() {
  const derivedTitle = "FAQS";
  const faqPage = await fetchPageBySlug("frequently-asked-questions");
  const faqEntries = extractFaqEntries(faqPage?.content).slice(0, 20);
  const faqSchema =
    faqEntries.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqEntries.map((entry) => ({
            "@type": "Question",
            name: entry.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: entry.answer,
            },
          })),
        }
      : null;

  return (
    <main className="h-full w-full">
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
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
