"use client";

import { SearchIcon } from "@/app/utils/svgs/searchIcon";
import {
  shopApi,
  type GlobalSearchProduct,
  type GlobalSearchCategory,
  type GlobalSearchProductType,
  type PLSearchProductsResponse,
} from "@/lib/api/shop";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import InputField from "../../reuseableUI/defaultInputField";
import { ArrowUpIcon } from "@/app/utils/svgs/arrowUpIcon";
import { cn, getFullImageUrl } from "@/app/utils/functions";
import { useGlobalStore } from "@/store/useGlobalStore";

const Search = ({ className }: { className?: string }) => {
  const router = useRouter();
  const pathname = usePathname();
  const isYMMActive = useGlobalStore((state) => state.isYMMActive);
  const searchParams = useSearchParams();
  const fitmentPairs = searchParams.get("fitment_pairs");
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<GlobalSearchProduct[]>([]);
  const [categories, setCategories] = useState<GlobalSearchCategory[]>([]);
  const [productTypes, setProductTypes] = useState<GlobalSearchProductType[]>(
    []
  );

  // All refs declared together
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const justSelectedRef = useRef<boolean>(false);

  // Debounced fetch
  useEffect(() => {
    // Don't open if user just selected an item
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    // Clear results if search term is too short
    if (!term || term.trim().length < 2) {
      setProducts([]);
      setCategories([]);
      setProductTypes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    if (term.trim().length >= 2) {
      setOpen(true);
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const t = setTimeout(async () => {
      try {
        // If YMM status is OK/Active → Use PartsLogic search products API
        // If YMM status is NOT OK → Use GraphQL search
        if (isYMMActive) {
          const resp: PLSearchProductsResponse = await shopApi.searchProductsPL(
            {
              q: term.trim(),
              page: 1,
              per_page: 10,
              fitment_pairs: fitmentPairs ? fitmentPairs : "",
            }
          );

          if (!controller.signal.aborted) {
            // Transform PartsLogic response to match component's expected format
            const restProducts = resp.products.map((product) => ({
              id: product.id,
              name: product.name,
              slug: product.slug,
              updatedAt: "",
              // Map category from PartsLogic format or GraphQL format
              category:
                product.category ||
                (product.category_name
                  ? {
                      id: product.category_id || "",
                      name: product.category_name,
                    }
                  : null),
              // Use primary_image from PartsLogic API or thumbnail from GraphQL
              thumbnail:
                product.thumbnail ||
                (product.primary_image
                  ? {
                      url: product.primary_image,
                      alt: product.name,
                    }
                  : null),
            }));

            const restCategories = resp.facets.categories.map((cat) => ({
              id: cat.id,
              name: cat.value,
              slug: cat.value.toLowerCase().replace(/\s+/g, "-"),
              level: 0,
              parent: null,
              backgroundImage: cat.media
                ? { url: cat.media, alt: cat.value }
                : null,
              products: {
                totalCount: cat.count,
              },
            }));

            const restProductTypes = resp.facets.brands.map((brand) => ({
              id: brand.id,
              name: brand.value,
              slug: brand.value.toLowerCase().replace(/\s+/g, "-"),
              hasVariants: false,
            }));

            setProducts(restProducts);
            setCategories(restCategories);
            setProductTypes(restProductTypes);
          }
        } else {
          const resp = await shopApi.globalSearchStorefront({
            query: term.trim(),
            channel: "default-channel",
            includeProducts: true,
            includeCategories: true,
            includeCollections: false,
            includeProductTypes: true,
          });

          if (!controller.signal.aborted) {
            setProducts(resp.products?.edges.map((edge) => edge.node) || []);
            setCategories(
              resp.categories?.edges.map((edge) => edge.node) || []
            );
            setProductTypes(
              resp.productTypes?.edges.map((edge) => edge.node) || []
            );
          }
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          setProducts([]);
          setCategories([]);
          setProductTypes([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 300); // Slightly longer debounce

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [term, isYMMActive]);

  // Close on outside click or Escape
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(t)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const goToShop = (params: Record<string, string | undefined>) => {
    // Navigate to shop page with search query
    if (pathname === "/products/all") {
      // If on shop page, replace with new search query
      const sp = new URLSearchParams();
      if (params.q) sp.set("q", params.q);
      const newUrl = sp.toString()
        ? `/products/all?${sp.toString()}`
        : "/products/all";
      router.replace(newUrl, { scroll: false });
    } else {
      // If not on shop page, navigate to shop with search query
      const sp = new URLSearchParams();
      if (params.q) sp.set("q", params.q);
      const url = sp.toString()
        ? `/products/all?${sp.toString()}`
        : "/products/all";
      router.push(url);
    }
    setOpen(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim()) return;
    goToShop({ q: term.trim() });
  };

  return (
    <div
      ref={containerRef}
      style={{
        // border: "1px solid var(--color-secondary-700)",
        backgroundColor: "white",
      }}
      className={cn(
        "flex items-center relative max-w-[560px] px-4 py-2.5 max-h-10 justify-between w-full",
        className
      )}
    >
      <form
        onSubmit={onSubmit}
        className="flex items-center w-full bg-transparent h-full justify-center"
      >
        <InputField
          className="leading-none !bg-transparent text-black w-full !px-0 !py-0 placeholder:text-black"
          name="Search-product"
          type="text"
          placeholder="Search product"
          value={term}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setTerm(e.target.value)
          }
          onFocus={() => term.trim().length >= 2 && setOpen(true)}
        />
        <button aria-label="Search products" type="submit" className="h-full">
          <span
            aria-hidden="true"
            className="text-[var(--color-secondary-400)]"
          >
            {SearchIcon}
          </span>
        </button>
      </form>

      {open && term?.length > 1 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border shadow-[0_10px_20px_0_rgba(0,0,0,0.10)] border-[var(--color-secondary-200)] z-40">
          <div className=" max-h-80 flex flex-col gap-2 overflow-auto p-3">
            {/* Products Section - Now at the top */}
            {products.length > 0 && (
              <div className="border-b border-gray-200 pb-2 mb-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Products
                </div>
                {products.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Navigate to product detail page using original slug
                      router.push(`/product/${encodeURIComponent(p.slug)}`);
                      setOpen(false);
                    }}
                    className="w-full font-secondary p-3 text-left hover:bg-[var(--color-secondary-200)] flex items-center justify-between -tracking-[0.035px] text-[var(--color-secondary-800)] text-base transition-colors duration-200"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                        {p.thumbnail ? (
                          <img
                            src={getFullImageUrl(p.thumbnail.url)}
                            alt={p.thumbnail.alt || p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to placeholder if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              target.parentElement!.innerHTML =
                                '<div class="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">No Image</div>';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium text-sm">
                          {p.name}
                        </div>
                        {p.category && (
                          <div className="text-xs text-gray-500 mt-1">
                            Category: {p.category.name}
                          </div>
                        )}
                        <div className="text-xs text-blue-600 mt-1">
                          View Product Details →
                        </div>
                      </div>
                    </div>
                    <span className="rotate-90 ml-2 text-gray-400">
                      {ArrowUpIcon}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Categories Section */}
            {categories.length > 0 && (
              <div className="border-b border-gray-200 pb-2 mb-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Categories
                </div>
                {categories.slice(0, 4).map((c) => (
                  <button
                    key={`cat-${c.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      justSelectedRef.current = true;
                      setTerm(c.name);
                      setOpen(false);
                      try {
                        (document.activeElement as HTMLElement | null)?.blur();
                      } catch {}
                      // Navigate to category page directly using slug
                      router.push(`/category/${encodeURIComponent(c.slug)}`);
                    }}
                    className="w-full font-secondary p-2 text-left hover:bg-[var(--color-secondary-200)] flex items-center justify-between -tracking-[0.035px] text-[var(--color-secondary-800)] text-base "
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {/* Category Image */}
                      {c.backgroundImage?.url && (
                        <div className="w-10 h-10 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                          <img
                            src={getFullImageUrl(c.backgroundImage.url)}
                            alt={c.backgroundImage.alt || c.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                            }}
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between flex-1">
                        <span>{c.name}</span>
                        <span className="text-xs text-gray-500">
                          ({c.products.totalCount})
                        </span>
                      </div>
                    </div>
                    <span className=" rotate-90 ml-2">{ArrowUpIcon}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Product Types Section */}
            {productTypes.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Product Types
                </div>
                {productTypes.slice(0, 3).map((pt) => (
                  <button
                    key={`pt-${pt.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      justSelectedRef.current = true;
                      setTerm(pt.name);
                      setOpen(false);
                      try {
                        (document.activeElement as HTMLElement | null)?.blur();
                      } catch {}
                      // Navigate to brand page directly using slug
                      router.push(`/brand/${encodeURIComponent(pt.slug)}`);
                    }}
                    className="w-full font-secondary p-2 text-left hover:bg-[var(--color-secondary-200)] flex items-center justify-between -tracking-[0.035px] text-[var(--color-secondary-800)] text-base "
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{pt.name}</span>
                      <span className="text-xs text-gray-500 bg-blue-100 px-1 rounded">
                        Type
                      </span>
                    </div>
                    <span className=" rotate-90 ml-2">{ArrowUpIcon}</span>
                  </button>
                ))}
              </div>
            )}

            {!loading &&
              !products.length &&
              !categories.length &&
              !productTypes.length &&
              term.trim().length >= 2 && (
                <div className=" text-sm text-gray-500">No Results found</div>
              )}
            {loading && (
              <div className="text-sm text-gray-500 font-secondary">
                Searching…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;
