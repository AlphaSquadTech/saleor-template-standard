"use client";

import { useState, useEffect, useMemo } from "react";
import type { CategoryNode } from "@/graphql/queries/getAllCategoriesTree";
import { FiltersCollapsible } from "@/app/components/filtersCollapsible";

export interface CategoryFilterProps {
  categories: { edges: { node: CategoryNode }[] };
  selectedSlugs: string[];
  // Callback with the updated selection
  onChangeSelected?: (next: string[]) => void;
}

export default function CategoryFilter({ categories, selectedSlugs, onChangeSelected }: CategoryFilterProps) {

  const [selected, setSelected] = useState<Set<string>>(() => new Set(selectedSlugs));
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const open = new Set<string>();
    categories.edges.forEach(({ node }) => {
      if (selectedSlugs.includes(node.slug)) open.add(node.id);
      const hasSelectedChild = node.children?.edges?.some(({ node: c }) => selectedSlugs.includes(c.slug));
      if (hasSelectedChild) open.add(node.id);
    });
    return open;
  });

  // Stable key that changes only when the category tree structure changes
  const categoriesKey = useMemo(() => {
    try {
      return JSON.stringify(
        categories.edges.map(({ node }) => ({
          id: node.id,
          slug: node.slug,
          children: node.children?.edges?.map(({ node: c }) => c.id) ?? [],
        }))
      );
    } catch {
      // Fallback to length if serialization fails for any reason
      return String(categories.edges.length);
    }
  }, [categories]);

  // Build a lookup of slug -> all descendant slugs (one level deep based on current query)
  const slugToDescSlugs = useMemo(() => {
    const map = new Map<string, string[]>();
    const walkChildren = (n: CategoryNode | undefined | null): string[] => {
      if (!n?.children?.edges?.length) return [];
      const direct = n.children.edges.map(({ node }) => node.slug);
      // If future depth is added, recurse here
      return direct;
    };
    categories.edges.forEach(({ node }) => {
      map.set(node.slug, walkChildren(node));
      node.children?.edges?.forEach(({ node: child }) => {
        // Children in current query do not include nested children; treat as leaf
        map.set(child.slug, []);
      });
    });
    return map;
  }, [categoriesKey, categories]);

   
  useEffect(() => {
    // keep local state in sync with props when SSR re-renders
    setSelected(new Set(selectedSlugs));
    // re-compute expanded to ensure parents with selections are open
    const open = new Set<string>();
    categories.edges.forEach(({ node }) => {
      if (selectedSlugs.includes(node.slug)) open.add(node.id);
      const hasSelectedChild = node.children?.edges?.some(({ node: c }) => selectedSlugs.includes(c.slug));
      if (hasSelectedChild) open.add(node.id);
    });
    setExpanded(open);
  }, [selectedSlugs, categoriesKey]);

  const toggle = (slug: string) => {
    const base = new Set(selected);
    const descendants = slugToDescSlugs.get(slug) || [];
    if (base.has(slug)) {
      base.delete(slug);
      descendants.forEach((s) => base.delete(s));
    } else {
      base.add(slug);
      descendants.forEach((s) => base.add(s));
    }

    // Update state only, don't modify URL
    setSelected(base);
    // Notify parent component about the change (if callback provided)
    onChangeSelected?.(Array.from(base));
  };

  const clearAll = () => {
    // Update state only, don't modify URL
    setSelected(new Set());
    // Notify parent component about the change
    onChangeSelected?.([]);
  };

  const isChecked = (slug: string) => selected.has(slug);

  const toggleParent = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  return (
    <FiltersCollapsible title="Categories" defaultOpen>
      {/* <div className="mb-2 flex items-center justify-end px-2">
        <button
          type="button"
          onClick={clearAll}
          className="text-sm text-[var(--color-secondary-700)] hover:text-[var(--color-secondary-900)] font-secondary"
        >
          Clear all
        </button>
      </div> */}
      <div className="px-1">
        <ul className="space-y-4 md:space-y-3">
          {categories.edges.map(({ node }) => (
            <li key={node.id} >
              <div className="flex items-center justify-between gap-2 cursor-pointer">
                <label className="flex flex-1 items-center gap-2 font-secondary text-[var(--color-secondary-800)] w-full cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-5 w-5 md:h-4 md:w-4 accent-[var(--color-primary-600)] cursor-pointer"
                    checked={isChecked(node.slug)}
                    onChange={() => toggle(node.slug)}
                  />
                  <span className="flex items-center gap-2">
                    <span className="truncate">{node.name}</span>

                  </span>
                </label>
                {node.children?.edges?.length ? (
                  <button
                    type="button"
                    aria-label={expanded.has(node.id) ? "Collapse" : "Expand"}
                    className="p-2 md:p-1 text-[var(--color-secondary-700)] hover:text-[var(--color-secondary-900)] transition-transform cursor-pointer"
                    onClick={() => toggleParent(node.id)}
                  >
                    <svg
                      className={`h-5 w-5 md:h-4 md:w-4 transition-transform ${expanded.has(node.id) ? "rotate-180" : "rotate-0"}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                    </svg>
                  </button>
                ) : <span className="w-5" />}
              </div>
              {node.children?.edges?.length && expanded.has(node.id) ? (
                <ul className="mt-2 ml-6 text-sm text-[var(--color-secondary-800)] space-y-2 md:space-y-1">
                  {node.children.edges.map(({ node: child }) => (
                    <li key={child.id} >
                      <label className="flex flex-1 items-center gap-2 font-secondary w-full cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-5 w-5 md:h-4 md:w-4 accent-[var(--color-primary-600)] cursor-pointer"
                          checked={isChecked(child.slug)}
                          onChange={() => toggle(child.slug)}
                        />
                        <div className="flex justify-between w-full items-center cursor-pointer">
                          <span className="truncate">{child.name}</span>
                          {typeof child.products?.totalCount === "number" && (
                            <span className="text-xs font-secondary bg-[var(--color-secondary-200)] text-[var(--color-secondary-800)] size-fit px-0.5 text-center leading-4">
                              {child.products.totalCount}
                            </span>
                          )}
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </FiltersCollapsible>
  );
}
