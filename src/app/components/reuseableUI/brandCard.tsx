"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export interface BrandCardProps {
  name: string;
  imageUrl: string;
  url?: string;
}

export const BrandCard = ({ name, imageUrl, url }: BrandCardProps) => {
  const [imageError, setImageError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const cardContent = (
    <div className="group relative">
      <div
        style={{ borderColor: "var(--color-secondary-220)" }}
        className="bg-white rounded-xl border overflow-hidden transition-all duration-300 ease-in-out h-full hover:shadow-lg cursor-pointer"
      >
        {/* Image Container */}
        <div className="relative p-8 flex items-center justify-center bg-[var(--color-secondary-930)] group-hover:from-primary-50 group-hover:to-primary-25 transition-all duration-300">
          {imageUrl && !imageError ? (
            <div className="relative w-full h-20 transition-transform duration-300 group-hover:scale-110">
              <Image
                src={imageUrl}
                alt={name}
                fill
                className={`object-contain transition-all duration-300 ${
                  loaded ? "opacity-100 blur-0" : "opacity-0 blur-sm"
                }`}
                onLoad={() => setLoaded(true)}
                onError={() => setImageError(true)}
              />
              {!loaded && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
              )}
            </div>
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110">
              <p
                title={name}
                style={{ color: "var(--color-primary-600)" }}
                className="text-2xl truncate max-w-[7rem] font-bold font-secondary"
              >
                {name}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (url) {
    return (
      <Link href={`/brand/${name}`} className="block h-full">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
};
