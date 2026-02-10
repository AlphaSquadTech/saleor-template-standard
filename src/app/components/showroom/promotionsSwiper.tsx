"use client";

import { SwiperArrowIconLeft } from "@/app/utils/svgs/swiperArrowIconLeft";
import { SwiperArrowIconRight } from "@/app/utils/svgs/swiperArrowIconRight";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import CommonButton from "../reuseableUI/commonButton";
import EmptyState from "../reuseableUI/emptyState";

interface PromotionSlide {
  id: string;
  image: string;
  alt: string;
  Heading: string;
  subHeading: string;
  Offer: string;
}

const defaultSlides = [
  {
    id: "1",
    image: "/no-image-avail-large.png",
    alt: "Slide 3",
    Heading: "Mustang GT Performance Exhaust System",
    subHeading: "EXHAUST SYSTEMS & PERFORMANCE PARTS",
    Offer: "$39.90",
  },
  {
    id: "2",
    image: "/no-image-avail-large.png",
    alt: "Slide 3",
    Heading: "Mustang GT Performance Exhaust System",
    subHeading: "EXHAUST SYSTEMS & PERFORMANCE PARTS",
    Offer: "$39.90",
  },
  {
    id: "3",
    image: "/no-image-avail-large.png",
    alt: "Slide 3",
    Heading: "Mustang GT Performance Exhaust System",
    subHeading: "EXHAUST SYSTEMS & PERFORMANCE PARTS",
    Offer: "$39.90",
  },
];

interface PromotionsSwiperProps {
  slides?: PromotionSlide[];
}

export const PromotionsSwiper = ({ slides }: PromotionsSwiperProps) => {
  const slidesToUse = slides && slides.length > 0 ? slides : defaultSlides;
  const router = useRouter();

  if (!slidesToUse || slidesToUse.length === 0) {
    return (
      <div className="relative w-full h-[704px] flex items-center justify-center">
        <div
          style={{ backgroundColor: "var(--color-primary-600)" }}
          className="absolute h-[704px] max-w-[80px] w-full z-[5]"
        />
        <EmptyState
          text="No promotions available"
          textParagraph="Check back later for exciting promotions and deals"
          className="h-full z-10"
        />
      </div>
    );
  }
  return (
    <div className="relative w-full h-[414px] lg:h-[704px]">
      <div className="w-full h-full absolute bg-black/60 backdrop-blur-md z-[2] top-0 left-0 text-center flex items-center justify-center font-primary ">
        <div className="bg-[var(--color-secondary-400)] px-2 py-1 size-fit text-[var(--color-secondary-90)] text-3xl">
          Coming Soon
        </div>
      </div>
      <div
        style={{ backgroundColor: "var(--color-primary-600)" }}
        className="absolute  h-10 max-w-none md:h-full lg:h-[704px] md:max-w-[80px] w-full z-[5]"
      />

      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        navigation={{ prevEl: ".promotion-prev", nextEl: ".promotion-next" }}
        pagination={{ clickable: true }}
        autoplay={{ delay: 4000 }}
        loop
        slidesPerView={1}
        mousewheel={{ enabled: true, forceToAxis: true, releaseOnEdges: true }}
        keyboard={{ enabled: true, onlyInViewport: true }}
        className="w-full h-full
          [&_.swiper-pagination-bullet]:!bg-[var(--color-secondary-50)]
          [&_.swiper-pagination-bullet-active]:!bg-[var(--color-secondary-500)]
          [&_.swiper-pagination]:!bottom-8"
      >
        {slidesToUse.map((slide) => (
          <SwiperSlide key={slide.id}>
            <div className="relative w-full h-full">
              <Suspense
                fallback={
                  <div className="w-full h-full bg-gray-200 animate-pulse" />
                }
              >
                <Image
                  src={slide.image}
                  alt={slide.alt}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-black/50" />
              </Suspense>

              <div className="absolute container flex items-center h-full w-full px-4 md:pl-[111px] lg:pl-28">
                <div className="flex flex-col items-start w-full max-w-[645px] justify-center">
                  <p
                    style={{ color: "var(--color-secondary-300)" }}
                    className="font-secondary text-xs md:text-sm lg:*:text-base leading-[24px] tracking-[-0.04px]"
                  >
                    {slide.subHeading}
                  </p>

                  <div className="w-full flex flex-col flex-wrap justify-start gap-6 lg:gap-10">
                    <h2
                      style={{ color: "var(--color-secondary-50)" }}
                      className="font-primary text-2xl/none md:text-3xl/none lg:text-6xl/none tracking-[-0.15px] uppercase"
                    >
                      {slide.Heading}
                    </h2>

                    <p
                      style={{ color: "var(--color-secondary-50)" }}
                      className="font-secondary text-3xl md:text-5xl lg:text-7xl/none  font-light tracking-[-0.18px]"
                    >
                      {slide.Offer}
                    </p>

                    <CommonButton variant="primary" className="py-2 md:py-3 w-fit" content={"Shop Now"} onClick={() => router.push("/products/all")} />
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Prev */}
      <button
        style={{
          backgroundColor: "var(--color-secondary-50)",
          color: "var(--color-secondary-800)",
        }}
        className="p-2 rounded-full hidden md:block disabled:opacity-50 absolute left-4 top-1/2 cursor-pointer promotion-prev z-[5]"
      >
        <span className="size-6 block">{SwiperArrowIconLeft}</span>
      </button>

      {/* Next */}
      <button
        style={{
          backgroundColor: "var(--color-secondary-50)",
          color: "var(--color-secondary-800)",
        }}
        className="p-2 rounded-full hidden md:block absolute right-4 top-1/2 z-[5] disabled:opacity-50 cursor-pointer promotion-next"
      >
        <span className="size-6 flex-shrink-0 block">
          {SwiperArrowIconRight}
        </span>
      </button>
    </div>
  );
};
