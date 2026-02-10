"use client";

import { useEffect, useState } from "react";
import ModalLayout from "@/app/components/reuseableUI/modalLayout";
import CategoryFilter from "@/app/components/shop/CategoryFilter";
import type { CategoryNode } from "@/graphql/queries/getAllCategoriesTree";
import { FilterIcon } from "@/app/utils/svgs/filterIcon";
import { useRouter, useSearchParams } from "next/navigation";

export default function MobileFilters({
  categories,
  selectedSlugs,
  basePath = "/products/all",
}: {
  categories: { edges: { node: CategoryNode }[] };
  selectedSlugs: string[];
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const activeCount = selectedSlugs.length;
  const [tempSelected, setTempSelected] = useState<string[]>(selectedSlugs);

  // Sync temp selection with current when opening
  useEffect(() => {
    if (open) setTempSelected(selectedSlugs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("category");
    params.delete("after");
    for (const s of tempSelected) params.append("category", s);
    const href = `${basePath}?${params.toString()}`;
    router.push(href, { scroll: false });
    setOpen(false);
  };

  return (
    <div className="lg:hidden w-full pt-6 z-50">
      <div className="flex justify-between items-center w-full">
        <p className="font-semibold text-sm px-4 py-3.5">FILTER BY</p>
        <button
          type="button"
          aria-label={activeCount > 0 ? `Open filters, ${activeCount} active` : "Open filters"}
          className="p-3.5 cursor-pointer relative"
          onClick={() => setOpen(true)}
        >
          {FilterIcon}
          {activeCount > 0 && (
            <span
              aria-hidden
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-primary)] text-white text-[10px] leading-[18px] text-center font-semibold"
            >
              {activeCount}
            </span>
          )}
        </button>
      </div>

      <ModalLayout
        isModalOpen={open}
        onClose={() => setOpen(false)}
        heading="Filters"
        className="lg:max-w-lg overflow-hidden"
      >
        <div className="flex h-full flex-col">
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto mt-4 md:mt-6 pt-1 md:pt-2 space-y-4 px-1">
            <CategoryFilter
              categories={categories}
              selectedSlugs={tempSelected}
              onChangeSelected={setTempSelected}
            />
          </div>

          {/* Fixed footer inside modal panel (non-scrolling) */}
          <div className="shrink-0 border-t border-[var(--color-secondary-200)] bg-white px-4 py-3">
            <div className="space-y-2">
              <button
                type="button"
                onClick={applyFilters}
                className="w-full h-11 rounded bg-[var(--color-primary)] text-white font-secondary font-semibold"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={() => setTempSelected([])}
                className="w-full h-11 rounded border border-[var(--color-secondary-300)] text-[var(--color-secondary-800)] bg-white font-secondary"
              >
                Clear
              </button>
            </div>
            <div className="pt-[env(safe-area-inset-bottom)]" />
          </div>
        </div>
      </ModalLayout>
    </div>
  );
}
