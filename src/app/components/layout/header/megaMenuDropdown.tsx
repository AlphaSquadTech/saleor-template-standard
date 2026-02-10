"use client";

import Link from "next/link";
import { NoProductFoundIcon } from "@/app/utils/svgs/noProductFoundIcon";
import PrimaryButton from "../../reuseableUI/primaryButton";
type CategoryNode = {
  id: string;
  name: string;
  slug?: string;
  children?: CategoryNode[];
};

interface MegaMenuDropdownProps {
  isOpen: boolean;
  categories: CategoryNode[];
  categoriesLoading: boolean;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function MegaMenuDropdown({
  isOpen,
  categories,
  categoriesLoading,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: MegaMenuDropdownProps) {
  // Show all 100 categories directly in navigation

  return (
    <div
      style={{ backgroundColor: "white" }}
      className={`absolute top-full max-h-[400px] overflow-y-auto left-0 shadow-[0_10px_20px_0_rgba(0,0,0,0.10)] p-10 z-50 mt-1 transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="min-w-[664px] mx-auto">
        {categoriesLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-pulse">
              <div className="rounded-full bg-[var(--color-secondary-200)] p-6">
                <div className="w-8 h-8 bg-[var(--color-secondary-300)] rounded-full"></div>
              </div>
            </div>
            <p className="text-sm text-[var(--color-secondary-600)] mt-4 font-secondary">
              Loading categories...
            </p>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-[var(--color-secondary-200)] p-6">
              <span>{NoProductFoundIcon}</span>
            </div>
            <h3 className="text-sm font-semibold uppercase text-[var(--color-secondary-800)] mt-4 -tracking-[0.05px] font-secondary">
              No Categories Found
            </h3>
            <p className="text-xs text-[var(--color-secondary-600)] mt-1 -tracking-[0.035px] font-secondary">
              Categories will appear here when available.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-12">
              {categories.map((category) => (
                <div key={category.id} className="group/category">
                  <Link
                    href={`/category/${encodeURIComponent(
                      category.slug || category.id
                    )}`}
                    onClick={onClose}
                    className="text-sm font-semibold uppercase leading-4 tracking-[-0.03px] inline-block hover:text-zinc-400  transition-all duration-300 relative group"
                  >
                    <span className="relative">{category.name}</span>
                  </Link>
                  {category.children?.length ? (
                    <ul className="space-y-2 mt-3">
                      {category.children.map((child) => (
                        <li
                          key={child.id}
                          className="text-sm leading-4 tracking-[-0.03px]"
                        >
                          <Link
                            href={`/category/${encodeURIComponent(
                              child.slug || child.id
                            )}`}
                            onClick={onClose}
                            className="text-[var(--color-secondary-600)] hover:text-zinc-400  transition-all duration-300 inline-block  relative group"
                          >
                            <span className="relative">{child.name}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>

            {/* All categories are shown directly */}

            {/* View All Products Link */}
            <div className="flex justify-center pt-2">
              <Link href="/products/all" onClick={onClose}>
                <PrimaryButton
                  content="View All Products"
                  className="capitalize text-sm font-semibold"
                />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
