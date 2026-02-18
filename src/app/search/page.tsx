"use client";

import {
  useState,
  useEffect,
  Suspense,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import ReactPaginate from "react-paginate";
import ItemsPerPageSelectClient from "@/app/components/shop/ItemsPerPageSelectClient";
import Breadcrumb from "@/app/components/reuseableUI/breadcrumb";
import HierarchicalCategoryFilter from "@/app/components/search/HierarchicalCategoryFilter";
import { SortDropdown } from "@/app/components/sortDropdown";
import { FiltersCollapsible } from "@/app/components/filtersCollapsible";
import { ListIcon } from "@/app/utils/svgs/listIcon";
import { GridIcon } from "@/app/utils/svgs/GridIcon";
import ListCard from "@/app/components/reuseableUI/listCard";
import { ProductCard } from "@/app/components/reuseableUI/productCard";
import ShopMobileFilters from "@/app/components/shop/ShopMobileFilters";
import { getFullImageUrl } from "@/app/utils/functions";
import { SearchByVehicle } from "../components/reuseableUI/searchByVehicle";
import { useVehicleData } from "@/hooks/useVehicleData";
import { generateItemListSchema } from "@/lib/schema";
import { handleScrollToTop } from "@/hooks/scrollPageTop";

export const dynamic = "force-dynamic";

type ViewMode = "grid" | "list";

const ChevronDownIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
    />
  </svg>
);

type ItemsPerPage = 10 | 20 | 50 | 100;

interface YMMProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: {
    id: string;
    name: string;
  };
  productType: {
    id: string;
    name: string;
    slug: string;
  };
  thumbnail: {
    url: string;
    alt: string;
  };
  price_min: number | null;
  price_max: number | null;
  default_variant_price?: number;
  media: Array<{
    id: number;
    url: string;
    alt: string;
  }>;
}

interface YMMCategory {
  id: string;
  value: string;
  slug: string;
  count: number;
  media?: string;
  level?: number;
  parent_id?: string;
  children?: YMMCategory[];
}

interface YMMProductType {
  id: string;
  value: string;
  count: number;
  media?: string;
}

interface FlatCategory {
  id: string;
  name: string;
  slug: string;
  products: { totalCount: number };
}

interface YMMSearchResponse {
  products: YMMProduct[];
  facets: {
    brands: YMMProductType[];
    categories: YMMCategory[];
    price_ranges: Array<{ min: number; max: number; count: number }> | null;
    years: Array<{ value: string; count: number }>;
    makes: Array<{ value: string; count: number }>;
    models: Array<{ value: string; count: number }>;
  };
  pagination: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedPairs = searchParams?.get("fitment_pairs") || "";
  const { getSelectedNames, isComplete } = useVehicleData();

  const [itemsPerPage, setItemsPerPage] = useState<ItemsPerPage>(20);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchData, setSearchData] = useState<YMMSearchResponse | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortKey, setSortKey] = useState<string>("name_asc");
  const [isInitialized, setIsInitialized] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const categorySlugToId = useMemo(() => {
    const flattenCategories = (
      categories: YMMCategory[]
    ): Array<[string, string]> => {
      const result: Array<[string, string]> = [];
      categories.forEach((cat) => {
        result.push([cat.slug, cat.id]);
        if (cat.children) {
          result.push(...flattenCategories(cat.children));
        }
      });
      return result;
    };

    return new Map(
      searchData?.facets.categories
        ? flattenCategories(searchData.facets.categories)
        : []
    );
  }, [searchData?.facets.categories]);

  const brandSlugToId = useMemo(
    () =>
      new Map(
        searchData?.facets.brands.map((brand) => [
          brand.value.toLowerCase().replace(/\s+/g, "-"),
          brand.id,
        ]) || []
      ),
    [searchData?.facets.brands]
  );

  const SORT_OPTIONS = [
    { key: "", label: "Clear" },
    { key: "price_min:asc", label: "Price: Low to High" },
    { key: "price_max:desc", label: "Price: High to Low" },
  ];

  const updateURL = useCallback(
    (categories: string[], brands: string[], sort: string, page: number) => {
      const params = new URLSearchParams();

      // Preserve fitment_pairs parameter
      if (selectedPairs) params.set("fitment_pairs", selectedPairs);

      // Add category filters
      if (categories.length > 0) {
        categories.forEach((cat) => {
          params.append("category", cat);
        });
      }

      // Add brand filters
      if (brands.length > 0) {
        brands.forEach((brand) => {
          params.append("brand", brand);
        });
      }

      // Add sort parameter - only if not empty
      if (sort && sort !== "name_asc") {
        params.set("sort", sort);
      }

      // Add page parameter
      if (page > 1) {
        params.set("page", page.toString());
      }

      const queryString = params.toString();
      const newURL = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(newURL, { scroll: false });
    },
    [pathname, router, selectedPairs]
  );

  const readFiltersFromURL = useCallback(() => {
    const categoriesParam = searchParams.getAll("categories");
    const productTypesParam = searchParams.getAll("productTypes");
    const sortParam = searchParams.get("sort");
    const pageParam = searchParams.get("page");

    return {
      categories: categoriesParam,
      brands: productTypesParam,
      sortKey: sortParam || "",
      page: pageParam ? parseInt(pageParam, 10) : 1,
    };
  }, [searchParams]);

  useEffect(() => {
    if (!isInitialized) {
      const urlFilters = readFiltersFromURL();
      setSelectedCategories(urlFilters.categories);
      setSelectedBrands(urlFilters.brands);
      setSortKey(urlFilters.sortKey);
      setCurrentPage(urlFilters.page);
      setIsInitialized(true);
    }
  }, [isInitialized, readFiltersFromURL]);

  useEffect(() => {
    if (isInitialized) {
      updateURL(selectedCategories, selectedBrands, sortKey, currentPage);
    }
  }, [
    isInitialized,
    selectedCategories,
    selectedBrands,
    sortKey,
    currentPage,
    updateURL,
  ]);

  useEffect(() => {
    const fetchYMMResults = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          per_page: String(itemsPerPage),
        });

        // Add fitment_pairs if exists
        if (selectedPairs) {
          params.set("fitment_pairs", selectedPairs);
        }

        // Convert category slugs to IDs
        if (selectedCategories.length > 0 && categorySlugToId.size > 0) {
          selectedCategories.forEach((slug) => {
            // const id = categorySlugToId.get(slug);
            params.append("category_slug", slug);
          });
        }

        // Convert brand slugs to IDs
        if (selectedBrands.length > 0 && brandSlugToId.size > 0) {
          selectedBrands.forEach((slug) => {
            // const id = brandSlugToId.get(slug);
            params.append("brand_slug", slug);
          });
        }

        // Add sorting
        if (sortKey) {
          if (sortKey === "name_asc") {
            console.log("Get all products");
          } else {
            params.set("sort_by", sortKey);
          }
        }

        const baseUrl =
          process.env.NEXT_PUBLIC_PARTSLOGIC_URL;
        const response = await fetch(
          `${baseUrl}/api/search/products?${params.toString()}`,
          {
            headers: {
              accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        const data: YMMSearchResponse = await response.json();
        setSearchData(data);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchYMMResults();
  }, [
    selectedPairs,
    currentPage,
    itemsPerPage,
    selectedCategories,
    selectedBrands,
    sortKey,
    // categorySlugToId,
    // brandSlugToId,
  ]);

  const productsForGrid =
    searchData?.products.map((product) => ({
      node: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        media: product.media?.map((m) => ({
          id: String(m.id),
          url: m.url,
          alt: m.alt || null,
        })),
        category: product.category || null,
        price_min: product.price_min,
        price_max: product.price_max,
        default_variant_price: product.default_variant_price,
        pricing: {
          onSale: null,
          priceRange: {
            start: product.price_min || null,
            stop: product.price_max || null,
          },
        },
      },
    })) || [];

  const breadcrumbItems = [
    { text: "HOME", link: "/" },
    { text: "SHOP", link: "/products/all" },
    { text: "SEARCH RESULTS" },
  ];

  const totalProducts = searchData?.pagination.total || 0;
  const totalPages = searchData?.pagination.total_pages || 1;

  const pageTitle = selectedPairs ? "Search Results" : "All Products";

  const handleVehicleSearch = (pairs: string) => {
    router.push(`/search?fitment_pairs=${pairs}`);
  };

  // Flatten categories for mobile filters
  const flatCategories = useMemo(() => {
    const flatten = (categories: YMMCategory[], level = 0): FlatCategory[] => {
      const result: FlatCategory[] = [];
      categories.forEach((cat) => {
        result.push({
          id: cat.slug,
          name: `${"  ".repeat(level)}${cat.value}`,
          slug: cat.slug,
          products: { totalCount: cat.count },
        });
        if (cat.children) {
          result.push(...flatten(cat.children, level + 1));
        }
      });
      return result;
    };
    return searchData?.facets.categories
      ? flatten(searchData.facets.categories)
      : [];
  }, [searchData?.facets.categories]);

  // Generate ItemList schema with category information
  const itemListSchema =
    searchData && searchData.products.length > 0
      ? generateItemListSchema(
          searchData.products.map((product) => ({
            id: product.id,
            name: product.name,
            price: product.price_min || 0,
            currency: "USD",
            image: product.media?.[0]?.url,
            category: product.category
              ? {
                  id: product.category.id,
                  name: product.category.name,
                }
              : undefined,
          })),
          pageTitle
        )
      : null;

  const handlePageChange = (selectedItem: { selected: number }) => {
    setCurrentPage(selectedItem.selected + 1);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div
      ref={topRef}
      className="container mx-auto min-h-[100dvh] py-12 px-4 md:px-6 md:py-16 lg:py-24 lg:px-0 relative"
    >
      {/* Schema.org structured data */}
      {itemListSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
        />
      )}

      <div className="space-y-5">
        <Breadcrumb items={breadcrumbItems} />

        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="font-normal uppercase text-[var(--color-secondary-800)] text-2xl md:text-3xl lg:text-5xl font-primary">
              {pageTitle}
            </p>
            {isComplete && (
              <p className="font-normal text-[var(--color-secondary-600)] text-lg md:text-xl lg:text-3xl font-primary">
                • {getSelectedNames().join(" • ")}
              </p>
            )}
          </div>
          <p className="text-[var(--color-secondary-600)] text-sm md:text-base">
            {totalProducts} product{totalProducts === 1 ? "" : "s"} found
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3 lg:gap-1 w-full justify-end">
          <SortDropdown
            sortOptions={SORT_OPTIONS}
            sortKey={sortKey}
            setSortKey={setSortKey}
          />
          <div className="flex items-center justify-end w-full md:w-auto gap-1">
            <ShopMobileFilters
              categories={
                flatCategories as unknown as Parameters<
                  typeof ShopMobileFilters
                >[0]["categories"]
              }
              productTypes={
                (searchData?.facets.brands || []).map((pt) => {
                  const slug = pt.value.toLowerCase().replace(/\s+/g, "-");
                  return {
                    id: slug,
                    name: pt.value,
                    slug: slug,
                    products: { totalCount: pt.count },
                  };
                }) as unknown as Parameters<
                  typeof ShopMobileFilters
                >[0]["productTypes"]
              }
              selectedCategoryIds={selectedCategories}
              selectedProductTypeIds={selectedBrands}
              onCategoryChange={setSelectedCategories}
              onProductTypeChange={setSelectedBrands}
              filtersLoading={loading}
            />
            <div className="ring-1 ring-[var(--color-secondary-100)] items-center transition-all ease-in-out duration-300 p-1 bg-[var(--color-secondary-100)]">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                aria-label="List view"
                className={`p-2.5 transition-all ease-in-out duration-300 cursor-pointer ${
                  viewMode === "list" ? "bg-white" : "bg-transparent"
                }`}
              >
                <span className={`size-5 text-[var(--color-secondary-600)]`}>
                  {ListIcon}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-pressed={viewMode === "grid"}
                aria-label="Grid view"
                className={`p-2.5 transition-all ease-in-out duration-300 cursor-pointer ${
                  viewMode === "grid" ? "bg-white" : "bg-transparent"
                }`}
              >
                <span className={`size-5 text-[var(--color-secondary-600)]`}>
                  {GridIcon}
                </span>
              </button>
            </div>
            <ItemsPerPageSelectClient
              value={itemsPerPage}
              onChange={setItemsPerPage}
            />
          </div>
        </div>
      </div>

      <div className="lg:hidden mt-6">
        <SearchByVehicle
          onSearch={handleVehicleSearch}
          AddClearButton={true}
          className="!border !border-[var(--color-secondary-200)] !p-4 [&>h2]:!text-lg"
        />
      </div>

      <div className="mt-10 flex gap-8">
        <aside className="hidden lg:block w-80 flex-shrink-0">
          <div className="sticky top-24 space-y-6">
            <SearchByVehicle
              onSearch={handleVehicleSearch}
              AddClearButton={true}
              className=" !border !border-[var(--color-secondary-200)] !p-4 [&>h2]:!text-lg"
            />

            {searchData && (
              <>
                {/* Hierarchical Categories */}
                <HierarchicalCategoryFilter
                  categories={searchData.facets.categories}
                  selectedCategories={selectedCategories}
                  onCategoriesChange={setSelectedCategories}
                />

                {/* Brands Filter */}
                <FiltersCollapsible title="Brands" defaultOpen={true}>
                  <div className="space-y-3 px-1 overflow-y-auto max-h-80">
                    {selectedBrands.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedBrands([])}
                        className="text-sm text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] font-secondary"
                      >
                        Clear all
                      </button>
                    )}
                    {searchData.facets.brands.map((brand) => {
                      const slug = brand.value
                        .toLowerCase()
                        .replace(/\s+/g, "-");
                      return (
                        <label
                          key={brand.id}
                          className="flex items-center gap-2 font-secondary text-[var(--color-secondary-800)] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="h-5 w-5 md:h-4 md:w-4 accent-[var(--color-primary-600)] cursor-pointer"
                            checked={selectedBrands.includes(slug)}
                            onChange={() => {
                              handleScrollToTop();
                              if (selectedBrands.includes(slug)) {
                                setSelectedBrands(
                                  selectedBrands.filter((id) => id !== slug),
                                );
                              } else {
                                setSelectedBrands([...selectedBrands, slug]);
                              }
                            }}
                          />
                          <div className="flex justify-between w-full items-center">
                            <span className="truncate">{brand.value}</span>
                            <span className="text-xs font-secondary bg-[var(--color-secondary-200)] text-[var(--color-secondary-800)] px-2 py-0.5 rounded">
                              {brand.count}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </FiltersCollapsible>
              </>
            )}
          </div>
        </aside>

        <section className="w-full relative min-h-[400px]">
          {loading && (
            <div className="h-[60vh] z-10 flex items-center justify-center">
              <div className="size-14 block border-t-2 border-black rounded-full animate-spin" />
            </div>
          )}

          {!loading && productsForGrid.length === 0 ? (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-[var(--color-secondary-800)]">
                No products found
              </h2>
              <p className="mt-2 text-[var(--color-secondary-600)]">
                Try adjusting your filters or search criteria.
              </p>
            </div>
          ) : !loading ? (
            <>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {productsForGrid.map((product) => {
                    const href = `/product/${encodeURIComponent(
                      product.node.slug,
                    )}`;
                    const imageUrl =
                      getFullImageUrl(product.node.media?.[0]?.url) ||
                      "/no-image-avail-large.png";
                    return (
                      <ProductCard
                        key={product.node.id}
                        id={product.node.id}
                        name={product.node.name}
                        image={imageUrl}
                        price={product.node.default_variant_price || 0}
                        href={href}
                        category_id={product.node.category?.id || ""}
                        category={product.node.category?.name || ""}
                        onSale={false}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {productsForGrid.map((product) => {
                    const href = `/product/${encodeURIComponent(
                      product.node.slug,
                    )}`;
                    const imageUrl =
                      getFullImageUrl(product.node.media?.[0]?.url) ||
                      "/no-image-avail-large.png";
                    return (
                      <ListCard
                        key={product.node.id}
                        id={product.node.id}
                        name={product.node.name}
                        image={imageUrl}
                        price={product.node?.default_variant_price || 0}
                        href={href}
                        category_id={product.node.category?.id || ""}
                        category={product.node.category?.name || ""}
                        onSale={false}
                      />
                    );
                  })}
                </div>
              )}
            </>
          ) : null}

          {totalPages > 1 && (
            <div className="mt-16">
              <ReactPaginate
                pageCount={totalPages}
                forcePage={Math.max(
                  0,
                  Math.min(totalPages - 1, currentPage - 1),
                )}
                onPageChange={handlePageChange}
                marginPagesDisplayed={1}
                pageRangeDisplayed={2}
                previousLabel={
                  <p className="flex items-center gap-1">
                    <span className="size-5 text-black rotate-90">
                      {ChevronDownIcon}
                    </span>
                    Prev
                  </p>
                }
                nextLabel={
                  <p className="flex items-center gap-1 !text-[var(--color-secondary-600)] font-semibold">
                    Next
                    <span className="size-5 -rotate-90">{ChevronDownIcon}</span>
                  </p>
                }
                renderOnZeroPageCount={undefined}
                containerClassName="flex items-center justify-center gap-2 font-secondary"
                pageClassName="list-none"
                pageLinkClassName="px-3 py-2 !text-base cursor-pointer bg-[var(--color-secondary-200)] text-gray-900 hover:opacity-80"
                previousClassName="list-none"
                previousLinkClassName="px-3 py-2 !text-base cursor-pointer bg-[var(--color-secondary-200)] text-gray-700 hover:opacity-80 flex items-center gap-1"
                nextClassName="list-none"
                nextLinkClassName="px-3 py-2 !text-base cursor-pointer bg-[var(--color-secondary-200)] text-gray-700 hover:opacity-80 flex items-center gap-1"
                activeClassName="list-none"
                activeLinkClassName="px-3 py-2 !text-base !bg-[var(--color-primary-600)] text-black border border-[var(--color-primary-600)]"
                disabledClassName="opacity-50 pointer-events-none"
                breakLabel={"..."}
                breakLinkClassName="px-2 !text-base text-gray-500"
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageContent />
    </Suspense>
  );
}
