"use client";
import { SwiperArrowIconLeft } from "@/app/utils/svgs/swiperArrowIconLeft";
import { SwiperArrowIconRight } from "@/app/utils/svgs/swiperArrowIconRight";
import { GET_PAGE_METADATA_BY_SLUG } from "@/graphql/queries/getHeroMetadata";
import { useQuery } from "@apollo/client";
import Image from "next/image";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Autoplay, EffectFade, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { HeroSectionSearchByVehicle } from "../reuseableUI/HeroSectionsearchByVehicle";

interface HeroSlide {
  id: number;
  image: string;
  alt: string;
  title: string;
  description: string;
}

interface ShowroomHeroCarouselProps {
  slides?: HeroSlide[];
}

const HeroBackground = ({ src, alt }: { src?: string | null; alt: string }) => {
  const imageSrc = src?.trim() || "/images/aeroexhaust.png";

  return (
    <div className="absolute inset-0">
      <Image
        src={imageSrc}
        alt={alt}
        width={1920}
        height={743}
        priority
        loading="eager"
        quality={70}
        sizes="100vw"
        fetchPriority="high"
        className="w-full h-full object-cover object-center"
      />
    </div>
  );
};

export const ShowroomHeroCarousel = ({ slides }: ShowroomHeroCarouselProps) => {
  const { data, loading } = useQuery(GET_PAGE_METADATA_BY_SLUG, {
    variables: { slug: "hero-section" },
  });

  const meta = (data?.page?.metadata ?? []) as {
    key: string;
    value: string | null;
  }[];

  const getVal = (key: string) => {
    const value = meta.find((m) => m.key === key)?.value;
    return value?.trim() || null;
  };

  const heroSlides = [
    {
      id: 1,
      title: getVal("heading") || "",
      description: getVal("paragraph") || "",
      image: getVal("background-image-url") || "/images/wsm.webp",
      alt: "Hero slide 1",
    },
    {
      id: 2,
      title: getVal("heading-1") || "",
      description: getVal("paragraph-1") || "",
      image: getVal("background-image-url-1") || "/images/wsm.webp",
      alt: "Hero slide 2",
    },
    {
      id: 3,
      title: getVal("heading-2") || "",
      description: getVal("paragraph-2") || "",
      image: getVal("background-image-url-2") || "/images/wsm.webp",
      alt: "Hero slide 3",
    },
  ];

  const isReady = !loading;

  if (loading || !isReady) {
    return (
      <div className="relative w-full md:h-[546px] h-[414px] mx-auto flex items-center justify-center bg-gray-300 animate-pulse" />
    );
  }

  return (
    <div className="relative w-full min-h-[414px] md:min-h-[546px]">
      <HeroSectionSearchByVehicle AddClearButton={true} />
      <Swiper
        modules={[Navigation, Pagination, Autoplay, EffectFade]}
        navigation={{ prevEl: ".featured-prev", nextEl: ".featured-next" }}
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        effect="fade"
        loop={true}
        className="h-full w-full lg:!pt-24"
      >
        {heroSlides.map((slide, idx) => (
          <SwiperSlide key={idx}>
            <div className="relative w-full min-h-[164px] md:min-h-[450px]">
              <HeroBackground src={slide.image} alt={slide.alt} />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};
