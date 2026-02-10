"use client";
import Image from "next/image";

import Link from "next/link";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

type Promotion = {
  id: string;
  image: string;
  subHeading: string;
  headingLines: string[];
  description: string;
  subtitleRedirect: string;
  listItems: string[];
};

export const PromotionSlider = ({
  promotions,
}: {
  promotions: Promotion[];
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
      {promotions &&
        promotions.map(({ image, headingLines, subtitleRedirect }, idx) => (
          <Link href={subtitleRedirect} target="_blank" key={idx}>
            {image !== " " && (
              <div className="overflow-hidden">
                <Image
                  width={768}
                  height={576}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  src={image || "/no-image-avail-large.png"}
                  alt={headingLines?.join(" ") || "Promotion image"}
                  className="w-full h-auto max-h-[220px] lg:max-h-[490px] object-cover hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  role="img"
                  aria-label={headingLines?.join(" ") || "Promotion image"}
                />
              </div>
            )}
          </Link>
        ))}
    </div>
  );
};
