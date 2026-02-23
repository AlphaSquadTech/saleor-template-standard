import { storefrontOverrides } from "@tenant-overrides";
import createApolloServerClient from "@/graphql/server-client";
import { GET_TESTIMONIALS } from "@/graphql/queries/getTestimonials";
import { GET_TESTIMONIAL_PAGE_TYPE } from "@/graphql/queries/getPageTypeId";
import Heading from "../reuseableUI/heading";
import { TestimonialCard } from "../reuseableUI/testimonialCard";
import EmptyState from "../reuseableUI/emptyState";

const DefaultTestimonialsGrid = async ({ first = 6 }: { first?: number }) => {
  let items: Array<{
    id: string;
    name: string;
    text: string;
    rating: number;
  }> = [];

  try {
    const client = createApolloServerClient();

    const pageTypeResp = await client.query<{
      pageTypes?: {
        edges?: Array<{ node?: { id: string; slug: string } | null }>;
      };
    }>({ query: GET_TESTIMONIAL_PAGE_TYPE, errorPolicy: "all" });

    const pageTypeId = pageTypeResp.data.pageTypes?.edges?.[0]?.node?.id;
    if (!pageTypeId) {
      items = [];
    } else {
      const testimonialsResp = await client.query<{
        pages?: {
          edges?: Array<{
            node?: {
              id: string;
              attributes?: Array<{
                attribute?: { slug?: string | null } | null;
                values?: Array<{
                  name?: string | null;
                  value?: string | null;
                }> | null;
              }> | null;
            } | null;
          }>;
        };
      }>({
        query: GET_TESTIMONIALS,
        variables: { pageTypeId, first },
        errorPolicy: "all",
      });

      items = (testimonialsResp.data.pages?.edges || [])
        .map((e) => e.node)
        .filter(Boolean)
        .map((n) => {
          const attrs = n!.attributes || [];
          const getAttributeValue = (slug: string): string => {
            const attr = attrs.find((a) => a?.attribute?.slug === slug);
            return attr?.values?.[0]?.name || attr?.values?.[0]?.value || "";
          };

          const name = getAttributeValue("testimonial_name");
          const text = getAttributeValue("testimonial_text");
          const ratingValue = getAttributeValue("testimonial_rating");
          const rating = Math.max(0, Math.min(5, Number(ratingValue) || 0));

          return {
            id: n!.id,
            name,
            text,
            rating,
          };
        })
        .filter((item) => item.name && item.text);
    }
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    items = [];
  }

  return !items.length ? null : (
    <section
      style={{
        backgroundColor: "var(--color-secondary-920)",
      }}
      className="py-12 px-4 md:px-6 md:py-16 lg:py-24 lg:px-0"
    >
      <div className="container mx-auto">
        <Heading content="What Our Customers Say" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-16">
          {items.map((t) => (
            <TestimonialCard
              key={t.id}
              id={t.id}
              title=""
              content={t.text}
              author={t.name}
              rating={t.rating}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export const TestimonialsGrid =
  (storefrontOverrides as any).TestimonialsGrid || DefaultTestimonialsGrid;
