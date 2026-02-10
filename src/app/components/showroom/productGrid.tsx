import { ProductCard } from "../reuseableUI/productCard";
import { ProductSkeleton } from "../reuseableUI/productSkeleton";
import { Suspense } from "react";
import createApolloServerClient from "@/graphql/server-client";
import { GET_FEATURED_PRODUCTS } from "@/graphql/queries/getFeaturedProducts";
import { Product } from "@/graphql/types/product";
import Heading from "../reuseableUI/heading";
import EmptyState from "../reuseableUI/emptyState";

type Props = {
  count?: number;
  collection?: string;
  heading?: string;
};

export const ProductGrid = async ({
  count = 10,
  collection,
  heading = "",
}: Props) => {
  let f_products: Product[] = [];

  try {
    const client = createApolloServerClient();

    const { data } = await client.query({
      query: GET_FEATURED_PRODUCTS,
      variables: {
        slug: collection,
        first: count,
      },
      fetchPolicy: "cache-first",
      errorPolicy: "all", // Continue even with network errors
    });

    f_products =
      data?.collection?.products?.edges?.map(
        (e: { node: Product }) => e.node
      ) ?? [];
  } catch (error) {
    console.error(
      `[ProductGrid] Error fetching products for ${heading}:`,
      error
    );
    // f_products remains empty array, will show empty state
  }

  return !f_products?.length ? null : (
    <section className=" py-12 px-4 md:px-6 md:py-16 lg:py-24 lg:px-0 lg:container lg:mx-auto">
      <Heading content={heading} />
      {!f_products?.length ? (
        <div className="pt-16">
          <EmptyState
            text="No products found"
            textParagraph={`No products available in ${heading.toLowerCase()} collection`}
            className="h-[20vh]"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 pt-6 lg:pt-16 lg:grid-cols-4 gap-x-2 gap-y-4 md:gap-4">
          {f_products.map((p) => (
            <Suspense key={p.id} fallback={<ProductSkeleton variant="grid" />}>
              <ProductCard
                id={p.id}
                name={p.name}
                image={p?.media[0]?.url || "/no-image-avail-large.png"}
                href={`/product/${encodeURIComponent(p.slug)}`}
                price={p.pricing?.priceRange?.start?.gross?.amount || 0}
                category_id={p.category?.id || ""}
                category={p.category?.name || "Uncategorized"}
                discount={p.pricing?.discount?.gross?.amount || 0}
                // isFeatured={true}
                onSale={p?.pricing?.onSale}
              />
            </Suspense>
          ))}
        </div>
      )}
    </section>
  );
};
