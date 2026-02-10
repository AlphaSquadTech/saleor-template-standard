"use client";

import React, { Suspense } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import {
  A11y,
  Keyboard,
  Mousewheel,
  Navigation,
  Scrollbar,
  Pagination,
} from "swiper/modules";
import { Product } from "@/graphql/types/product";
import { ProductCard } from "../reuseableUI/productCard";
import { ProductSkeleton } from "../reuseableUI/productSkeleton";
import EmptyState from "../reuseableUI/emptyState";

interface ProductSwiperProps {
  products: Product[];
}

const ProductSwiper: React.FC<ProductSwiperProps> = ({ products }) => {
  if (!products?.length) {
    return (
      <div className="relative mt-16">
        <EmptyState
          text="No products available"
          textParagraph="Products will appear here once they are added"
          className="h-[30vh]"
        />
      </div>
    );
  }

  return (
    <div className="relative mt-16 overflow-x-hidden">
      <Swiper
        key={`swiper_bundle_products`}
        threshold={6}
        spaceBetween={12}
        speed={800}
        slidesPerView={"auto"}
        modules={[
          Navigation,
          Scrollbar,
          A11y,
          Keyboard,
          Mousewheel,
          Pagination,
        ]}
        navigation={{ prevEl: ".bundle-prev", nextEl: ".bundle-next" }}
        mousewheel={{ enabled: true, forceToAxis: true, releaseOnEdges: true }}
        keyboard={{ enabled: true, onlyInViewport: true }}
        className="pr-10 pt-16 relative h-full [&_.swiper-pagination-bullet]:!bg-[var(--color-secondary-50)] [&_.swiper-pagination-bullet-active]:!bg-[var(--color-secondary-500)] [&_.swiper-pagination]:-bottom-10"
      >
        {products.map((p) => (
          <SwiperSlide
            style={{
              height: "auto",
              display: "flex",
            }}
            className="max-w-[320px] h-full"
            key={p.id}
          >
            <Suspense fallback={<ProductSkeleton variant="swiper" />}>
              <ProductCard
                id={p.id}
                name={p.name}
                image={p.media?.[0]?.url || "/no-image-avail-large.png"}
                href={`/product/${encodeURIComponent(p.slug)}`}
                price={p.pricing?.priceRange?.start?.gross?.amount || 0}
                category_id={p.category?.id}
                category={p.category?.name}
                discount={p.pricing?.discount?.gross?.amount || 0}
                onSale={p?.pricing?.onSale}
              />
            </Suspense>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default ProductSwiper;
