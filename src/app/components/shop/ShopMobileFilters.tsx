"use client";

import { useState } from "react";
import ModalLayout from "@/app/components/reuseableUI/modalLayout";
import { FiltersCollapsible } from "@/app/components/filtersCollapsible";
import { FilterIcon } from "@/app/utils/svgs/filterIcon";
import type { GraphQLCategory, GraphQLProductType } from "@/lib/api/shop";

type HierarchicalCategory = {
  id: string;
  name: string;
  level: number;
  count: number;
  children: HierarchicalCategory[];
};

type CategoryNode = {
  id: string;
  name: string;
  product_count: number;
  children?: CategoryNode[];
};

// Helper function to build hierarchical category structure
function buildCategoryHierarchy(categories: GraphQLCategory[]) {
  const categoryMap = new Map();
  const rootCategories: HierarchicalCategory[] = [];
  // First pass: create all categories
  categories.forEach((cat) => {
    categoryMap.set(cat.id, {
      id: cat.id,
      name: cat.name,
      level: cat.level,
      count: cat.products.totalCount,
      children: [],
    });
  });

  // Second pass: build hierarchy
  categories.forEach((cat) => {
    const hierarchicalCat = categoryMap.get(cat.id)!;

    if (cat.parent) {
      const parentCat = categoryMap.get(cat.parent.id);
      if (parentCat) {
        parentCat.children.push(hierarchicalCat);
      } else {
        // If parent not found, treat as root
        rootCategories.push(hierarchicalCat);
      }
    } else {
      // No parent, it's a root category
      rootCategories.push(hierarchicalCat);
    }
  });

  // Sort categories by name at each level
  // const sortCategories = (cats: HierarchicalCategory[]) => {
  //   cats.sort((a, b) => a.name.localeCompare(b.name));
  //   cats.forEach(cat => sortCategories(cat.children));
  // };

  // sortCategories(rootCategories);
  return rootCategories;
}

// Helper function to convert to CategoryNode format for FiltersCollapsible
function convertToCategoryNodes(
  categories: HierarchicalCategory[]
): CategoryNode[] {
  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    product_count: cat.count,
    children:
      cat.children.length > 0
        ? convertToCategoryNodes(cat.children)
        : undefined,
  }));
}

interface ShopMobileFiltersProps {
  categories: GraphQLCategory[];
  productTypes: GraphQLProductType[];
  selectedCategoryIds: string[];
  selectedProductTypeIds: string[];
  onCategoryChange: (ids: string[]) => void;
  onProductTypeChange: (ids: string[]) => void;
  filtersLoading: boolean;
}

export default function ShopMobileFilters({
  categories,
  productTypes,
  selectedCategoryIds,
  selectedProductTypeIds,
  onCategoryChange,
  onProductTypeChange,
  filtersLoading,
}: ShopMobileFiltersProps) {
  const [open, setOpen] = useState(false);
  const [tempSelectedCategories, setTempSelectedCategories] =
    useState<string[]>(selectedCategoryIds);
  const [tempSelectedProductTypes, setTempSelectedProductTypes] = useState<
    string[]
  >(selectedProductTypeIds);

  const activeCount =
    selectedCategoryIds.length + selectedProductTypeIds.length;

  const hierarchicalCategories = buildCategoryHierarchy(categories);

  const openModal = () => {
    setTempSelectedCategories(selectedCategoryIds);
    setTempSelectedProductTypes(selectedProductTypeIds);
    setOpen(true);
  };

  const applyFilters = () => {
    onCategoryChange(tempSelectedCategories);
    onProductTypeChange(tempSelectedProductTypes);
    setOpen(false);
  };

  const clearFilters = () => {
    setTempSelectedCategories([]);
    setTempSelectedProductTypes([]);
  };

  return (
    <>
      {/* Filter Button */}
      <button
        type="button"
        aria-label={
          activeCount > 0
            ? `Open filters, ${activeCount} active`
            : "Open filters"
        }
        className="lg:hidden px-4 h-12 cursor-pointer relative border border-[var(--color-secondary-300)] bg-[var(--color-secondary-110)] transition-colors hover:opacity-80"
        onClick={openModal}
      >
        {FilterIcon}
        {activeCount > 0 && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-primary-600)] text-white text-[10px] leading-[18px] text-center font-semibold"
          >
            {activeCount}
          </span>
        )}
      </button>

      {/* Modal */}
      <ModalLayout
        isModalOpen={open}
        onClose={() => setOpen(false)}
        heading="Filters"
        className="lg:max-w-lg overflow-hidden"
      >
        <div className="flex gap-8 flex-col">
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto mt-4 md:mt-6 pt-1 md:pt-2 space-y-6 px-1">
            <FiltersCollapsible
              title="Categories"
              categoryTree={{
                data: convertToCategoryNodes(hierarchicalCategories),
                selected: tempSelectedCategories,
                onChange: setTempSelectedCategories,
                loading: filtersLoading,
              }}
            />

            <FiltersCollapsible
              title="Product Types"
              list={{
                items: productTypes.map((productType) => ({
                  id: productType.id,
                  label: productType.name,
                  count: productType.products.totalCount,
                })),
                selected: tempSelectedProductTypes,
                onChange: setTempSelectedProductTypes,
                loading: filtersLoading,
              }}
              defaultOpen={true}
            />
          </div>

          {/* Fixed footer inside modal panel (non-scrolling) */}
          <div className="shrink-0 border-t border-[var(--color-secondary-200)] bg-white">
            <div className="space-y-2">
              <button
                type="button"
                onClick={applyFilters}
                className="w-full h-11 rounded bg-[var(--color-primary-600)] text-black font-secondary font-normal transition-colors hover:opacity-90"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="w-full h-11 rounded border border-[var(--color-secondary-300)] text-[var(--color-secondary-800)] bg-white font-secondary transition-colors hover:opacity-80"
              >
                Clear All
              </button>
            </div>
            <div className="pt-[env(safe-area-inset-bottom)]" />
          </div>
        </div>
      </ModalLayout>
    </>
  );
}
