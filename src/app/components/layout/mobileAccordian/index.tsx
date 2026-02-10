"use client";

import { cn, SrcRoot, trimSlash } from "@/app/utils/functions";
import { ArrowDownIcon } from "@/app/utils/svgs/arrowDownIcon";
import Link from "next/link";
import { memo, useState } from "react";
import ImageWithFallback from "../../reuseableUI/ImageWithFallback";

type MenuItem = {
  __typename: "MenuItem";
  id: string;
  level: number;
  name: string;
  url: string;
  children: MenuItem[];
};

const AccordionSection = memo(function AccordionSection({ section }: { section: MenuItem }) {
  const [open, setOpen] = useState(false);

  const isExternal = (href: string) => /^https?:\/\//i.test(href);

  return (
    <div style={{ borderBottom: "1px solid var(--color-secondary-800)" }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full justify-between items-center py-6 lg:py-3 text-left"
      >
        <span
          style={{ color: "var(--color-primary-600)" }}
          className="font-semibold text-sm lg:text-lg font-secondary"
        >
          {section.name}
        </span>
        <span className={cn("transition ease-in-out duration-300", open ? "rotate-180" : "")}>
          {ArrowDownIcon}
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-2 pb-6">
          {section.children.map((child) => {
            const href = child.url || "#";
            const external = isExternal(href);
            return (
              <Link
                prefetch={false}
                key={child.id}
                href={href}
                rel={external ? "noopener noreferrer" : undefined}
                style={{ color: "var(--color-secondary-100)" }}
                className="text-base hover:opacity-80 transition-opacity"
              >
                {child.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
});

export const MobileAccordion = ({ sections }: { sections: MenuItem[] }) => {
  const TENANT_NAME = process.env.NEXT_PUBLIC_TENANT_NAME || "default";
  const BASE_URL = trimSlash(process.env.NEXT_PUBLIC_ASSETS_BASE_URL);
  const brandName = TENANT_NAME || "WSM";

  const logoSrcRoot: SrcRoot = {
    basePath: `${BASE_URL}/storage/v1/object/public/storefront-assets/${TENANT_NAME}`,
    fileName: "logo",
  };

  return (
    <div className="block lg:hidden w-full">
      <Link className="block lg:hidden items-center justify-start mb-4" href="/">
        <ImageWithFallback
          srcRoot={logoSrcRoot}
          alt={brandName}
          width={133}
          height={40}
          className="object-contain w-auto h-full max-h-10"
          priority
        />
      </Link>

      {sections.map((section) => (
        <AccordionSection key={section.id} section={section} />
      ))}
    </div>
  );
};
