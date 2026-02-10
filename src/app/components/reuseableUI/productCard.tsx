"use client";
import { ArrowIcon } from "@/app/utils/svgs/arrowIcon";
import { FeatureTag } from "@/app/utils/svgs/featureTag";
import { getFullImageUrl } from "@/app/utils/functions";
import Image from "next/image";
import Link from "next/link";
import PrimaryButton from "./primaryButton";
import React, { useState } from "react";

export interface ProductCardProps {
  id: string;
  name: string;
  image: string;
  href: string;
  price: number;
  category_id: string;
  category: string;
  discount?: number | null;
  isFeatured?: boolean;
  onSale: boolean;
}

export const ProductCard = ({
  id,
  name,
  image,
  href,
  price,
  category,
  discount,
  isFeatured = false,
  onSale,
}: ProductCardProps) => {
  const [loaded, setLoaded] = useState(false);

  const hasDiscount = discount != null && discount > 0;
  const priceValue = hasDiscount ? price + discount : price;
  const fallbackImage = "/no-image-avail-large.png";

  // Ensure image URL has full S3 path if it's relative
  const fullImageUrl = getFullImageUrl(image) || fallbackImage;

  return (
    <Link
      href={href}
      key={id}
      style={{ border: "1px solid var(--color-secondary-220)" }}
      className="group block h-full overflow-hidden hover:shadow-lg transition-all duration-200 relative bg-[var(--color-secondary-920)] font-secondary"
    >
      {/* Featured badge */}
      {isFeatured && (
        <span
          style={{ color: "var(--color-primary-600)" }}
          className="absolute top-0 right-3 z-10 w-6 h-10"
          aria-label="Featured"
        >
          {FeatureTag}
        </span>
      )}

      {/* On sale pill */}
      {/* {onSale && (
        <PrimaryButton
          className="absolute !px-3 !py-2 top-2 right-2 z-10"
          content="Sale"
        />
      )} */}

      <div className="relative w-full flex flex-col gap-4 justify-between h-full">
        {/* Image area with skeleton */}
        <div className="relative w-full aspect-square overflow-hidden">
          {!loaded && (
            <div
              className="animate-pulse bg-[var(--color-secondary-200)] absolute inset-0 z-10"
              aria-hidden="true"
            />
          )}
          <Image
            src={fullImageUrl}
            alt={name}
            width={296}
            height={296}
            className={`w-full h-full object-contain transition-all ease-in-out duration-300 group-hover:scale-105 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
            onLoadingComplete={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            priority={false}
          />
        </div>

        <div className="px-4">
          <p
            style={{ color: "var(--color-secondary-500)" }}
            className="font-normal text-xs font-secondary lg:text-sm -tracking-[0.035px]"
          >
            {category}
          </p>

          <p
            title={name}
            style={{ color: "var(--color-secondary-75)" }}
            className="-tracking-[0.05px] font-medium text-sm md:text-lg lg:text-xl line-clamp-2"
          >
            {name}
          </p>

          <div className="flex gap-2 text-2xl items-center mt-3 text-[var(--color-primary-500)]">
            {price === 0 ? (
              <p
                className="text-lg"
              >
                Call for Availability
              </p>
            ) : (
              <p
                className="font-semibold text-base md:text-xl lg:text-2xl -tracking-[0.06px]"
              >
                ${price.toFixed(2)}
              </p>
            )}

            {/* {hasDiscount && (
              <p
                className="font-semibold -tracking-[0.06px] line-through"
              >
                ${priceValue.toFixed(2)}
              </p>
            )} */}
          </div>
        </div>

        <button
          style={{
            backgroundColor: "var(--color-secondary-100)",
            color: "var(--color-secondary-700)",
          }}
          className="px-4 py-2.5 lg:py-3 text-sm lg:text-base font-semibold cursor-pointer -tracking-[0.04px] flex items-center w-full justify-between"
        >
          VIEW DETAILS
          <span className="size-5">{ArrowIcon}</span>
        </button>
      </div>
    </Link>
  );
};
