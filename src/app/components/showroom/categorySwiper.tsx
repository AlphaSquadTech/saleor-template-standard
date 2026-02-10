"use client";
import { SwiperArrowIconLeft } from "@/app/utils/svgs/swiperArrowIconLeft";
import { SwiperArrowIconRight } from "@/app/utils/svgs/swiperArrowIconRight";
import { CategoryAPIType } from "@/lib/api/shop";
import React, { Suspense } from "react";
import {
  A11y,
  Keyboard,
  Mousewheel,
  Navigation,
  Pagination,
  Scrollbar,
} from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { CategoryCard } from "../reuseableUI/categoryCard";
import { CategorySkeleton } from "../reuseableUI/categorySkeleton";
import CommonButton from "../reuseableUI/commonButton";
import Heading from "../reuseableUI/heading";

interface CategorySwiperProps {
  categories: CategoryAPIType[];
}

const CategorySwiper: React.FC<CategorySwiperProps> = ({ categories }) => {
  return (
    <div className="container mx-auto">
      <div className="flex w-full items-center justify-between ">
        <Heading content="Shop by Category" />
        <div className="hidden lg:flex gap-4 items-center">
          <button
            style={{
              color: "var(--color-primary-800)",
            }}
            className="p-2 rounded-full disabled:pointer-events-none disabled:opacity-50 cursor-pointer category-prev bg-[var(--color-secondary-50)] hover:bg-zinc-300 transition-opacity"
          >
            <span className="size-6 block">{SwiperArrowIconLeft}</span>
          </button>
          <button
            style={{
              color: "var(--color-primary-800)",
            }}
            className="p-2 rounded-full disabled:pointer-events-none disabled:opacity-50 cursor-pointer category-next bg-[var(--color-secondary-50)] hover:bg-zinc-300 transition-opacity"
          >
            <span className="size-6 flex-shrink-0 block">
              {SwiperArrowIconRight}
            </span>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:hidden mt-8 ">
        {(categories && categories.length >= 6
          ? categories.slice(0, 6)
          : categories
        )?.map((c) => (
          <Suspense
            key={c?.id}
            fallback={<CategorySkeleton variant="swiper" />}
          >
            <CategoryCard
              id={c?.id}
              name={c?.name}
              image={c?.image ?? "/no-image-avail-large.png"}
              href={`/category/${encodeURIComponent(
                c?.slug || c?.name.toLowerCase().replace(/\s+/g, "-")
              )}?id=${c?.id}`}
              description={c?.name ?? ""}
            />
          </Suspense>
        ))}
      </div>
      <div className="relative hidden lg:block">
        <Swiper
          key={`swiper_category`}
          threshold={6}
          spaceBetween={12}
          // pagination={{ clickable: true }}
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
          navigation={{ prevEl: ".category-prev", nextEl: ".category-next" }}
          mousewheel={{
            enabled: true,
            forceToAxis: true,
            releaseOnEdges: true,
          }}
          keyboard={{
            enabled: true,
            onlyInViewport: true,
          }}
          className="w-full mt-8 lg:mt-16  relative h-full [&_.swiper-pagination-bullet]:!bg-[var(--color-secondary-50) [&_.swiper-pagination-bullet-active]:!bg-[var(--color-secondary-500) [&_.swiper-pagination]:-bottom-10"
        >
          {categories.map((c) => (
            <SwiperSlide className="max-w-[246px]" key={c?.id}>
              <Suspense fallback={<CategorySkeleton variant="swiper" />}>
                <CategoryCard
                  id={c?.id}
                  name={c?.name}
                  image={c?.image ?? "/no-image-avail-large.png"}
                  href={`/category/${c?.slug}`}
                  description={c?.name ?? ""}
                />
              </Suspense>
            </SwiperSlide>
          ))}
        </Swiper>
        {categories?.length > 5 && (
          <button className="category-next pointer-events-none w-full bg-noise-right rounded-r max-w-[95px] h-full absolute -right-0.5 top-0 z-10 disabled:hidden " />
        )}
      </div>
    </div>
  );
};

export default CategorySwiper;
