import { GET_PROMOTION_PAGE_TYPE } from "@/graphql/queries/getPageTypeId";
import { GET_PROMOTIONS } from "@/graphql/queries/getPromotions";
import createApolloServerClient from "@/graphql/server-client";
import { PromotionSlider } from "./promotion-slider";
import Image from "next/image";
import Link from "next/link";

function parseEditorJsContent(raw?: string | null): {
  description: string;
  listItems: string[];
} {
  if (!raw) return { description: "", listItems: [] };

  try {
    const json = JSON.parse(raw);
    type EditorBlock = {
      id?: string;
      type?: string;
      data?: { text?: string; items?: string[] } | null;
    };
    const blocks: EditorBlock[] = Array.isArray(json?.blocks)
      ? (json.blocks as EditorBlock[])
      : [];
    const firstParagraph = blocks.find((b) => b?.type === "paragraph");
    const html: string = firstParagraph?.data?.text || "";
    const description = html.replace(/<[^>]*>/g, "").trim();
    const getList = blocks.find((b) => b?.type === "list");
    const listItems =
      getList?.data?.items?.map((item: string) => {
        return item.replace(/<[^>]*>/g, "").trim();
      }) || [];

    return { description, listItems };
  } catch {
    return { description: "", listItems: [] };
  }
}

function deriveHeadingLines(title?: string | null): string[] {
  const t = (title || "").trim();
  if (!t) return [];

  // Example patterns: "15% OFF EXHAUST SYSTEMS!", "25% Off Wheels & Accessories!"
  const m = t.match(/^(\d+%\s+off)\s+(.+?)(!?)$/i);
  if (m) {
    const line1 = m[1].toUpperCase();
    const line2 = (m[2] + (m[3] || "")).toUpperCase();
    return [line1, line2];
  }

  return [t.toUpperCase()];
}

export const Promotions = async ({ first = 10 }: { first?: number }) => {
  let promotions: Array<{
    id: string;
    image: string;
    subHeading: string;
    headingLines: string[];
    description: string;
    listItems: string[];
    subtitleRedirect: string;
  }> = [];

  try {
    const client = createApolloServerClient();

    const pageTypeResp = await client.query<{
      pageTypes?: {
        edges?: Array<{ node?: { id: string; slug: string } | null }>;
      };
    }>({
      query: GET_PROMOTION_PAGE_TYPE,
      errorPolicy: "all",
    });

    const pageTypeId = pageTypeResp.data.pageTypes?.edges?.[0]?.node?.id;
    if (!pageTypeId) return null;

    const promosResp = await client.query<{
      pages?: {
        edges?: Array<{
          node?: {
            id: string;
            title?: string | null;
            content?: string | null;
            metadata?: Array<{ key?: string | null; value?: string | null }>;
          } | null;
        }>;
      };
    }>({
      query: GET_PROMOTIONS,
      variables: { pageTypeId, first },
      errorPolicy: "all",
      fetchPolicy: "network-only",
    });
    promotions = (promosResp.data.pages?.edges || [])
      .map((e) => e.node)
      .filter(Boolean)
      .map((n) => {
        const metaEntries = Object.fromEntries(
          (n!.metadata || [])
            .filter((m) => m?.key)
            .map((m) => [m!.key as string, m!.value || ""]) as [
            string,
            string
          ][]
        );
        const image = metaEntries["promo-image"] || "";
        const subHeading = metaEntries["promo-subtitle"] || "";
        const subtitleRedirect = metaEntries["subtitle-redirect"] || "";
        const headingLines = deriveHeadingLines(n!.title);
        const { description, listItems } = parseEditorJsContent(n!.content);

        return {
          id: n!.id,
          image,
          subHeading,
          subtitleRedirect,
          headingLines,
          description,
          listItems,
        };
      })
      .filter((p) => p.headingLines.length > 0);
  } catch {
    // Silent fallback to empty promotions; UI will show empty state
    promotions = [];
  }

  if (!promotions.length) return null;

  return (
    <section
      aria-labelledby="promotion-heading"
      className="bg-neutral-50 w-full py-4"
    >
      <PromotionSlider promotions={promotions} />

      <div className="overflow-hidden">
        <Link href="/dealer-application">
          <Image
            src={
              "https://wsm-saleor-assets.s3.us-west-2.amazonaws.com/baja-kits/homepage-become-dealer.jpg"
            }
            alt="Become a Dealer"
            width={580}
            height={100}
            className="mx-auto mt-4 hover:scale-105 transition-transform duration-300"
          />
        </Link>
      </div>
    </section>
  );
};
