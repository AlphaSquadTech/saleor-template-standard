"use client";

import { useState } from "react";
import { FiltersCollapsible } from "@/app/components/filtersCollapsible";

interface Category {
  id: string;
  value: string;
  slug: string;
  productCount: number;
}

interface ProductType {
  id: string;
  value: string;
  slug: string;
  productCount: number;
}

interface SearchFiltersProps {
  categories?: Category[];
  productTypes: ProductType[];
  selectedCategories: string[];
  selectedBrands: string[];
  onCategoriesChange: (categories: string[]) => void;
  onBrandsChange: (brands: string[]) => void;
}

export default function SearchFilters({
  categories,
  productTypes,
  selectedCategories,
  selectedBrands,
  onCategoriesChange,
  onBrandsChange,
}: SearchFiltersProps) {
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  const [brandsExpanded, setBrandsExpanded] = useState(true);

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onCategoriesChange(selectedCategories.filter((id) => id !== categoryId));
    } else {
      onCategoriesChange([...selectedCategories, categoryId]);
    }
  };

  const toggleBrand = (brandId: string) => {
    if (selectedBrands.includes(brandId)) {
      onBrandsChange(selectedBrands.filter((id) => id !== brandId));
    } else {
      onBrandsChange([...selectedBrands, brandId]);
    }
  };

  const clearAllCategories = () => {
    onCategoriesChange([]);
  };

  const clearAllBrands = () => {
    onBrandsChange([]);
  };

  return (
    <div className="space-y-4">
      {/* Brands Filter */}
      {productTypes.length > 0 && (
        <FiltersCollapsible title="Brands" defaultOpen={brandsExpanded}>
          <div className="space-y-3 px-1">
            {selectedBrands.length > 0 && (
              <button
                type="button"
                onClick={clearAllBrands}
                className="text-sm text-[var(--color-secondary-600)] hover:text-[var(--color-secondary-700)] font-secondary"
              >
                Clear all
              </button>
            )}
            {productTypes.map((brand) => (
              <label
                key={brand.id}
                className="flex items-center gap-2 font-secondary text-[var(--color-secondary-800)] cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 md:h-4 md:w-4 accent-[var(--color-primary-600)] cursor-pointer"
                  checked={selectedBrands.includes(brand.id)}
                  onChange={() => toggleBrand(brand.id)}
                />
                <div className="flex justify-between w-full items-center">
                  <span className="truncate">{brand.value}</span>
                  <span className="text-xs font-secondary bg-[var(--color-secondary-200)] text-[var(--color-secondary-800)] px-2 py-0.5 rounded">
                    {brand.productCount}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </FiltersCollapsible>
      )}

      {/* Categories Filter */}
      {categories && categories.length > 0 && (
        <FiltersCollapsible title="Categories" defaultOpen={categoriesExpanded}>
          <div className="space-y-3 px-1">
            {selectedCategories.length > 0 && (
              <button
                type="button"
                onClick={clearAllCategories}
                className="text-sm text-[var(--color-secondary-600)] hover:text-[var(--color-secondary-700)] font-secondary"
              >
                Clear all
              </button>
            )}
            {categories.map((category) => (
              <label
                key={category.id}
                className="flex items-center gap-2 font-secondary text-[var(--color-secondary-800)] cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 md:h-4 md:w-4 accent-[var(--color-primary-600)] cursor-pointer"
                  checked={selectedCategories.includes(category.id)}
                  onChange={() => toggleCategory(category.id)}
                />
                <div className="flex justify-between w-full items-center">
                  <span className="truncate">{category.value}</span>
                  <span className="text-xs font-secondary bg-[var(--color-secondary-200)] text-[var(--color-secondary-800)] px-2 py-0.5 rounded">
                    {category.productCount}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </FiltersCollapsible>
      )}

      {/* Active Filters Summary */}
      {(selectedCategories.length > 0 || selectedBrands.length > 0) && (
        <div className="pt-4 border-t border-[var(--color-secondary-200)]">
          <button
            type="button"
            onClick={() => {
              clearAllCategories();
              clearAllBrands();
            }}
            className="w-full h-10 bg-[var(--color-secondary-100)] text-[var(--color-secondary-800)] font-semibold rounded-md hover:bg-[var(--color-secondary-200)] transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}
