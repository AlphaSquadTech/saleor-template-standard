"use client";

import { FiltersCollapsible } from "@/app/components/filtersCollapsible";
import { useState } from "react";

interface CategoryNode {
  id: string;
  value: string;
  slug: string;
  count: number;
  media?: string;
  level?: number;
  parent_id?: string;
  children?: CategoryNode[];
}

interface HierarchicalCategoryFilterProps {
  categories: CategoryNode[];
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
}

function CategoryItem({
  category,
  selectedCategories,
  onToggle,
  level = 0,
}: {
  category: CategoryNode;
  selectedCategories: string[];
  onToggle: (id: string) => void;
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;
  const isSelected = selectedCategories.includes(category.slug);

  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-2"
        style={{ paddingLeft: `${level * 16}px` }}
      >
        {hasChildren && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 hover:bg-[var(--color-secondary-100)] rounded transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
        {!hasChildren && <div className="w-5" />}
        <label className="flex items-center gap-2 font-secondary text-[var(--color-secondary-800)] cursor-pointer flex-1">
          <input
            type="checkbox"
            className="h-5 w-5 md:h-4 md:w-4 accent-[var(--color-primary-600)] cursor-pointer"
            checked={isSelected}
            onChange={() => onToggle(category.slug)}
          />
          <div className="flex justify-between w-full items-center">
            <span className="truncate">{category.value}</span>
            <span className="text-xs font-secondary bg-[var(--color-secondary-200)] text-[var(--color-secondary-800)] px-2 py-0.5 rounded">
              {category.count}
            </span>
          </div>
        </label>
      </div>

      {hasChildren && isExpanded && (
        <div className="space-y-2">
          {category.children!.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              selectedCategories={selectedCategories}
              onToggle={onToggle}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HierarchicalCategoryFilter({
  categories,
  selectedCategories,
  onCategoriesChange,
}: HierarchicalCategoryFilterProps) {
  const toggleCategory = (categorySlug: string) => {
    if (selectedCategories.includes(categorySlug)) {
      onCategoriesChange(
        selectedCategories.filter((slug) => slug !== categorySlug)
      );
    } else {
      onCategoriesChange([...selectedCategories, categorySlug]);
    }
  };

  const clearAllCategories = () => {
    onCategoriesChange([]);
  };

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <FiltersCollapsible title="Categories" defaultOpen={true}>
      <div className="space-y-3 px-1 overflow-y-auto max-h-96">
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
          <CategoryItem
            key={category.id}
            category={category}
            selectedCategories={selectedCategories}
            onToggle={toggleCategory}
          />
        ))}
      </div>
    </FiltersCollapsible>
  );
}
