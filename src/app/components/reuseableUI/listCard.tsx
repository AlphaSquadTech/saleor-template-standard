import { FeatureTag } from "@/app/utils/svgs/featureTag";
import { getFullImageUrl } from "@/app/utils/functions";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import PrimaryButton from "./primaryButton";
import { ArrowIcon } from "@/app/utils/svgs/arrowIcon";

interface ListCardProps {
  id: string;
  name: string;
  image: string; // may be empty
  href: string;
  price: number;
  category_id: string;
  category: string;
  discount?: number | null;
  isFeatured?: boolean;
  onSale: boolean;
}

const ListCard = ({
  id,
  name,
  image,
  href,
  price,
  category,
  discount,
  isFeatured = false,
  onSale,
}: ListCardProps) => {
  const [loaded, setLoaded] = useState(false);

  const hasDiscount = discount != null && discount > 0;
  const priceValue = hasDiscount ? price + discount : price;

  const fallbackImage = "/no-image-avail-large.png";

  // Ensure image URL has full S3 path if it's relative
  const fullImageUrl = getFullImageUrl(image) || fallbackImage;

  return (
    <Link
      href={href}
      className="w-full flex lg:items-center gap-2 lg:gap-4 bg-[var(--color-secondary-930)] border border-[var(--color-secondary-220)] py-3 px-2 lg:px-3"
    >
      <div className="relative w-full max-w-[124px]">
        {/* Featured badge */}
        {isFeatured && (
          <span
            style={{ color: "var(--color-primary-600)" }}
            className="absolute top-0 right-3 z-10 w-6 h-10"
          >
            {FeatureTag}
          </span>
        )}

        {/* On sale pill */}
        {onSale && (
          <PrimaryButton
            className="absolute !px-3 !py-2 top-2 right-2 z-10"
            content="Sales"
          />
        )}

        <div className="relative aspect-square  overflow-hidden">
          {/* Skeleton always shown until image finishes */}
          {!loaded && (
            <div className="animate-pulse bg-[var(--color-secondary-200)] absolute inset-0 z-10" />
          )}

          <Image
            src={fullImageUrl}
            alt={name}
            width={124}
            height={124}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:justify-between w-full gap-1 lg:gap-3">
        <div className="w-full">
          <p
            style={{ color: "var(--color-secondary-75)" }}
            className="text-sm -tracking-[0.035px]"
          >
            {category}
          </p>
          <p
            title={name}
            style={{ color: "var(--color-secondary-75)" }}
            className="-tracking-[0.05px] font-normal text-sm md:text-base lg:text-xl lg:line-clamp-1"
          >
            {name}
          </p>

          <div className="flex gap-2 text-lg lg:text-2xl items-center lg:mt-3 text-[var(--color-primary-500)]">
            <p
              className="font-semibold -tracking-[0.06px]"
            >
              ${price.toFixed(2)}
            </p>
            {hasDiscount && (
              <p
                style={{ color: "var(--color-secondary-400)" }}
                className="font-semibold -tracking-[0.06px] line-through"
              >
                ${priceValue.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        <button
          style={{
            border: "1px solid var(--color-secondary-210)",
            backgroundColor: "var(--color-secondary-100)",
            color: "black",
          }}
          className="text-sm lg:text-base size-fit px-2.5 lg:px-4 py-2 lg:py-3 gap-2 font-secondary font-semibold cursor-pointer -tracking-[0.04px] flex-shrink-0 flex items-center justify-between"
        >
          VIEW DETAILS
          <span className="size-4 lg:size-5">{ArrowIcon}</span>
        </button>
      </div>
    </Link>
  );
};

export default ListCard;
