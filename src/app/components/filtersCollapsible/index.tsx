"use client";

import React, { useMemo } from "react";
import { cn } from "@/app/utils/functions";
import { ChevronDownIcon } from "@/app/utils/svgs/chevronDownIcon";

/** ================== Types ================== */
export interface CategoryNode {
  id: string | number;
  name: string;
  product_count?: number | null;
  active_product_count?: number | null;
  children?: CategoryNode[];
}

export interface ListItem {
  id: string; // MUST match your URL param value exactly
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface FiltersCollapsibleProps {
  title: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;

  /** Controlled category tree */
  categoryTree?: {
    data: CategoryNode[];
    selected: string[]; // controlled
    onChange?: (names: string[]) => void;
    maxHeightClass?: string; // e.g., "max-h-72"
    showCounts?: boolean; // default true
    loading?: boolean; // 👈 NEW
    emptyMessage?: string; // optional custom empty text
    hasMore?: boolean; // 👈 NEW: if there are more items to load
    onLoadMore?: () => void; // 👈 NEW: callback to load more
    loadingMore?: boolean; // 👈 NEW: loading state for load more
    totalCount?: number; // 👈 NEW: total count of categories
  };

  /** Controlled flat list (brands, years, makes, models) */
  list?: {
    items: ListItem[];
    selected: string[]; // controlled
    onChange?: (ids: string[]) => void;
    maxHeightClass?: string; // e.g., "max-h-72"
    loading?: boolean; // 👈 NEW
    emptyMessage?: string; // optional custom empty text
  };

  /** Optional: max-height for the generic children wrapper */
  contentMaxHeightClass?: string; // e.g., "max-h-[calc(100dvh-12rem)]"
}

/** ================== Helpers ================== */
const countFor = (n: CategoryNode) =>
  n.product_count ?? n.active_product_count ?? 0;

/** ================== Tiny Skeletons ================== */
function LineSkeleton({ w = "w-3/4" }: { w?: string }) {
  return (
    <div className={cn("h-4 rounded bg-[var(--color-secondary-200)]", w)} />
  );
}
function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 px-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="size-4 rounded bg-[var(--color-secondary-200)]" />
          <LineSkeleton
            w={i % 3 === 0 ? "w-1/2" : i % 3 === 1 ? "w-2/3" : "w-3/4"}
          />
        </div>
      ))}
    </div>
  );
}

/** ================== Category Tree ================== */
function CategoryRow({
  node,
  selected,
  setSelected,
  depth = 0,
  showCounts = true,
}: {
  node: CategoryNode;
  selected: Set<string>;
  setSelected: (next: Set<string>) => void;
  depth?: number;
  showCounts?: boolean;
}) {
  const hasChildren = (node.children?.length ?? 0) > 0;

  const toggleParent = (targetChecked: boolean) => {
    const next = new Set(selected);
    const nodeId = String(node.id);
    if (targetChecked) {
      next.add(nodeId);
    } else {
      next.delete(nodeId);
    }
    setSelected(next);
  };

  const toggleLeaf = () => {
    const next = new Set(selected);
    const nodeId = String(node.id);
    next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
    setSelected(next);
  };

  return (
    <div>
      <label
        className="flex items-center gap-2 text-sm"
        style={{ marginLeft: depth ? depth * 16 : 0 }}
      >
        {hasChildren ? (
          <input
            type="checkbox"
            checked={selected.has(String(node.id))}
            onChange={(e) => toggleParent(e.target.checked)}
            className="accent-[var(--color-primary-600)]"
          />
        ) : (
          <input
            type="checkbox"
            checked={selected.has(String(node.id))}
            onChange={toggleLeaf}
            className="accent-[var(--color-primary-600)]"
          />
        )}

        <span className="flex-1 flex items-center justify-between text-base -tracking-[0.04px] font-secondary">
          <span className="truncate max-w-[200px] text-[var(--color-secondary-75)]">{node.name}</span>
          {showCounts && (
            <span className="text-xs font-secondary bg-zinc-200 text-black p-1 text-center">
              {countFor(node)}
            </span>
          )}
        </span>
      </label>

      {hasChildren && (
        <div className="mt-1 space-y-1">
          {node.children!.map((child) => (
            <CategoryRow
              key={String(child.id)}
              node={child}
              selected={selected}
              setSelected={setSelected}
              depth={depth + 1}
              showCounts={showCounts}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ControlledCategoryTree({
  data,
  selected,
  onChange,
  maxHeightClass = "max-h-72 flex flex-col gap-3 px-2",
  showCounts = true,
  loading = false,
  emptyMessage = "No categories",
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  totalCount,
}: {
  data: CategoryNode[];
  selected: string[]; // controlled
  onChange?: (names: string[]) => void;
  maxHeightClass?: string;
  showCounts?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  totalCount?: number;
}) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const setSelected = (next: Set<string>) => onChange?.(Array.from(next));

  return (
    <div className="flex flex-col">
      <div className={cn(maxHeightClass, "overflow-auto px-2")}>
        {loading ? (
          <ListSkeleton rows={8} />
        ) : data.length ? (
          data.map((n) => (
            <CategoryRow
              key={String(n.id)}
              node={n}
              selected={selectedSet}
              setSelected={setSelected}
              showCounts={showCounts}
            />
          ))
        ) : (
          <p className="text-sm text-[var(--color-secondary-500)] font-secondary">
            {emptyMessage}
          </p>
        )}
      </div>
      {/* View More Button */}
      {hasMore && onLoadMore && !loading && (
        <div className="mt-3 px-2">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="w-full py-2 px-4 text-sm font-semibold text-[var(--color-primary-600)] border border-[var(--color-primary-600)] rounded hover:bg-[var(--color-primary-50)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              "Loading..."
            ) : (
              <>View More {totalCount && `(${data.length} of ${totalCount})`}</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/** ================== Flat List (Brands / Year / Make / Model) ================== */
function ControlledList({
  items,
  selected,
  onChange,
  maxHeightClass = "max-h-72 flex flex-col gap-3 px-2",
  loading = false,
  emptyMessage = "No items",
}: {
  items: ListItem[];
  selected: string[]; // controlled
  onChange?: (ids: string[]) => void;
  maxHeightClass?: string;
  loading?: boolean;
  emptyMessage?: string;
}) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (id: string) => {
    const next = new Set(selectedSet);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange?.(Array.from(next));
  };

  return (
    <div className={cn(maxHeightClass, "overflow-auto pr-2")}>
      {loading ? (
        <ListSkeleton rows={8} />
      ) : items.length ? (
        items.map((it) => (
          <label
            key={it.id}
            className="flex items-center gap-2 text-base -tracking-[0.04px] font-secondary "
          >
            <input
              type="checkbox"
              checked={selectedSet.has(it.id)}
              onChange={() => toggle(it.id)}
              disabled={it.disabled}
              className="accent-[var(--color-primary-600)]"
            />
            <span className="flex-1 flex items-center justify-between text-[var(--color-secondary-75)] ">
              <span className="truncate max-w-[220px]">{it.label}</span>
              {typeof it.count === "number" && (
                <span className="text-xs bg-zinc-200 text-center p-1 text-black">
                  {it.count}
                </span>
              )}
            </span>
          </label>
        ))
      ) : (
        <p className="text-sm text-[var(--color-secondary-75)] font-secondary">
          {emptyMessage}
        </p>
      )}
    </div>
  );
}

/** ================== Collapsible Wrapper ================== */
export function FiltersCollapsible({
  title,
  defaultOpen = true,
  children,
  categoryTree,
  list,
  contentMaxHeightClass,
}: FiltersCollapsibleProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="flex flex-col gap-5">
      {/* Header with toggle */}
      <div
        className={cn(
          "flex items-center justify-between transition-all ease-in-out duration-300 px-2 py-1 cursor-pointer hover:bg-[var(--color-secondary-100)]"
        )}
        onClick={() => setOpen(!open)}
      >
        <h3 className="font-semibold text-xl uppercase text-[var(--color-secondary-75)]">{title}</h3>
        <span
          className={`size-5 transform transition-transform duration-300 ${
            open ? "rotate-180" : ""
          } text-[var(--color-secondary-75)]`}
        >
          {ChevronDownIcon}
        </span>
      </div>

      {/* Content */}
      {open && (
        <>
          {categoryTree ? (
            <ControlledCategoryTree
              data={categoryTree.data}
              selected={categoryTree.selected}
              onChange={categoryTree.onChange}
              maxHeightClass={categoryTree.maxHeightClass}
              showCounts={categoryTree.showCounts}
              loading={categoryTree.loading}
              emptyMessage={categoryTree.emptyMessage}
              hasMore={categoryTree.hasMore}
              onLoadMore={categoryTree.onLoadMore}
              loadingMore={categoryTree.loadingMore}
              totalCount={categoryTree.totalCount}
            />
          ) : list ? (
            <ControlledList
              items={list.items}
              selected={list.selected}
              onChange={list.onChange}
              maxHeightClass={list.maxHeightClass}
              loading={list.loading}
              emptyMessage={list.emptyMessage}
            />
          ) : (
            <div
              className={cn(
                contentMaxHeightClass,
                contentMaxHeightClass ? "overflow-auto px-2" : "px-2"
              )}
            >
              {children}
            </div>
          )}
        </>
      )}
    </div>
  );
}
