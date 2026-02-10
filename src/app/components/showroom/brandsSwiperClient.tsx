"use client";

import { SwiperArrowIconLeft } from "@/app/utils/svgs/swiperArrowIconLeft";
import { SwiperArrowIconRight } from "@/app/utils/svgs/swiperArrowIconRight";
import {
  A11y,
  Keyboard,
  Mousewheel,
  Navigation,
  Pagination,
  Scrollbar,
} from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { BrandCard } from "../reuseableUI/brandCard";
import Heading from "../reuseableUI/heading";
import { CategoryAPIType } from "@/lib/api/shop";

interface BrandSwiperProps {
  brands: CategoryAPIType[];
}

export const BrandsSwiperClient = ({ brands }: BrandSwiperProps) => {
  return (
    <div className="container mx-auto ">
      <div className="flex w-full items-center justify-between ">
        <Heading content="Brands" />
        <div className="flex gap-4 items-center">
          <button
            style={{
              backgroundColor: "var(--color-secondary-200)",
              color: "var(--color-secondary-800)",
            }}
            className="p-2 rounded-full disabled:opacity-50 cursor-pointer brands-prev disabled:pointer-events-none bg-[var(--color-secondary-50)] hover:bg-zinc-300 transition-opacity"
          >
            <span className="size-6 block">{SwiperArrowIconLeft}</span>
          </button>
          <button
            style={{
              backgroundColor: "var(--color-secondary-200)",
              color: "var(--color-secondary-800)",
            }}
            className="p-2 rounded-full disabled:opacity-50 cursor-pointer brands-next disabled:pointer-events-none bg-[var(--color-secondary-50)] hover:bg-zinc-300 transition-opacity"
          >
            <span className="size-6 flex-shrink-0 block">
              {SwiperArrowIconRight}
            </span>
          </button>
        </div>
      </div>
      <div className="relative">
        <Swiper
          key={`swiper_brands`}
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
          navigation={{ prevEl: ".brands-prev", nextEl: ".brands-next" }}
          mousewheel={{
            enabled: true,
            forceToAxis: true,
            releaseOnEdges: true,
          }}
          keyboard={{
            enabled: true,
            onlyInViewport: true,
          }}
          className="w-full my-16 relative h-full"
        >
          {brands.map((brand, index) => (
            <SwiperSlide
              className="max-w-[246px]"
              key={`${brand.name}-${index}`}
            >
              <BrandCard
                name={brand.slug}
                imageUrl={brand.image || ""}
                url={brand.id}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};
