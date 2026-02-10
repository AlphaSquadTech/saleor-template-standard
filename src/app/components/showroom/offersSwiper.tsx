"use client";

import { useRouter } from "next/navigation";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import CommonButton from "../reuseableUI/commonButton";
import EmptyState from "../reuseableUI/emptyState";

interface OfferSlide {
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
    Heading: "Cold Air Intake for Ford F-150 2019+",
    subHeading: "INTAKE SYSTEMS",
    Offer: "$300.69",
  },
  {
    id: "2",
    image: "/no-image-avail-large.png",
    alt: "Slide 3",
    Heading: "Cold Air Intake for Ford F-150 2019+",
    subHeading: "INTAKE SYSTEMS",
    Offer: "$300.69",
  },
  {
    id: "3",
    image: "/no-image-avail-large.png",
    alt: "Slide 3",
    Heading: "Cold Air Intake for Ford F-150 2019+",
    subHeading: "INTAKE SYSTEMS",
    Offer: "$300.69",
  },
];

interface OffersSwiperProps {
  slides?: OfferSlide[];
}

export const OffersSwiper = ({ slides }: OffersSwiperProps) => {
  const slidesToUse = slides && slides.length > 0 ? slides : defaultSlides;
  const router = useRouter();

  if (!slidesToUse || slidesToUse.length === 0) {
    return (
      <section className="container mx-auto py-12 px-4 md:px-6 md:py-16 lg:py-24 lg:px-0">
        <div className="relative w-full h-[644px] flex items-center justify-center">
          <EmptyState
            text="No offers available"
            textParagraph="Check back later for exciting offers and deals"
            className="h-full"
          />
        </div>
      </section>
    );
  }
  return (
    <section className="mx-0 lg:container lg:mx-auto py-12 px-4 md:px-6 md:py-16 lg:py-24 lg:px-0">
      <div className="relative w-full">
        <div className="w-full h-full absolute bg-black/60 backdrop-blur-md z-[2] top-0 left-0 text-center flex items-center justify-center font-primary ">
          <div className="bg-[var(--color-secondary-400)] px-2 py-1 size-fit text-[var(--color-secondary-90)] text-3xl">
            Coming Soon
          </div>
        </div>
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          navigation={{ prevEl: ".category-prev", nextEl: ".category-next" }}
          pagination={{ clickable: true }}
          // autoplay={{ delay: 4000 }}
          loop
          slidesPerView={1}
          mousewheel={{
            enabled: true,
            forceToAxis: true,
            releaseOnEdges: true,
          }}
          keyboard={{ enabled: true, onlyInViewport: true }}
          className="w-full h-full    
          [&_.swiper-pagination-bullet]:!mr-2.5
          [&_.swiper-pagination-bullet]:!size-2.5
          [&_.swiper-pagination-bullet]:!opacity-100
          [&_.swiper-pagination-bullet]:!bg-[var(--color-secondary-200)]
          [&_.swiper-pagination-bullet-active]:!bg-[var(--color-secondary-950)]
          [&_.swiper-pagination]:!relative
          [&_.swiper-pagination]:lg:hidden
          [&_.swiper-pagination]:!top-[16px]
          [&_.swiper-horizontal>.swiper-pagination-bullets]:!top-[1px]
          [&_.swiper-pagination-bullets.swiper-pagination-horizontal]:!top-[5px]"
        >
          {slidesToUse.map((slide) => (
            <SwiperSlide key={slide.id}>
              <div
                style={{ backgroundImage: `url(${slide?.image})` }}
                className="relative w-full flex justify-center items-center h-full bg-cover"
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0.9)_100%)]" />
                <div className="relative flex px-4 py-12 md:px-6 md:py-16 lg:px-0 lg:py-24 max-w-[1152px] items-center h-full justify-between container w-full">
                  <div className="flex flex-col items-start w-full max-w-[400px] lg:max-w-[645px]">
                    <p
                      style={{ color: "var(--color-secondary-300)" }}
                      className="font-secondary text-xs md:text-sm lg:text-base tracking-[-0.04px]"
                    >
                      {slide.subHeading}
                    </p>
                    <div className="w-full flex flex-col justify-start gap-6 lg:gap-10">
                      <h2
                        style={{ color: "var(--color-secondary-50)" }}
                        className="font-primary text-2xl md:text-3xl lg:text-6xl tracking-[-0.15px] uppercase"
                      >
                        {slide.Heading}
                      </h2>

                      <p
                        style={{ color: "var(--color-secondary-50)" }}
                        className="font-secondary text-3xl md:text-5xl lg:text-7xl font-light tracking-[-0.18px]"
                      >
                        {slide.Offer}
                      </p>
                      <CommonButton className="py-2 lg:py-3 w-fit" variant="primary" content={"SHOP NOW"} onClick={() => router.push("/products/all")} />
                    </div>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Custom Previous Arrow (Left) */}
        <div
          style={{ backgroundColor: "var(--color-secondary-300)" }}
          className="absolute hidden lg:block left-4 top-1/2 transform -translate-y-1/2 z-10 cursor-pointer p-2 rounded-full category-prev"
        >
          <svg
            style={{ color: "var(--color-secondary-500)" }}
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </div>

        {/* Custom Next Arrow (Right) */}
        <div
          style={{ backgroundColor: "var(--color-secondary-50)" }}
          className="absolute hidden lg:block right-4 top-1/2 transform -translate-y-1/2 z-10 cursor-pointer p-2 rounded-full category-next"
        >
          <svg
            style={{ color: "var(--color-secondary-950)" }}
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </section >
  );
};
