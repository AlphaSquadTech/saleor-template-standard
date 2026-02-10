"use client";
import Image from "next/image";
import Link from "next/link";
import TertiaryButton from "../tertiaryButton";

export interface CategoryCardProps {
  id: string;
  name: string;
  description: string;
  image: string;
  href: string;
}

export const CategoryCard = ({ id, name, image, href }: CategoryCardProps) => {
  return (
    <Link
      href={href}
      key={id}
      className="group block border border-[var(--color-secondary-220)]  overflow-hidden hover:shadow-lg h-full transition-all duration-200 bg-white relative"
    >
      <Image
        src={image}
        alt={name}
        width={246}
        height={246}
        className="object-cover h-[132px] md:size-[246px] transition-transform duration-300 group-hover:scale-105  "
      />

      <div className="p-5 md:p-8 absolute z-[5] top-0 h-full items-start flex flex-col justify-between">
        <p
          style={{
            color: "var(--color-secondary-50)",
          }}
          className="font-bold -tracking-[0.06px] font-secondary text-base md:text-2xl line-clamp-2 "
        >
          {name}
        </p>
        <TertiaryButton
          content="VIEW ALL"
        />
      </div>
      <div className="bg-black/60 absolute inset-0 w-full h-full z-[2] pointer-events-none" />
    </Link>
  );
};
