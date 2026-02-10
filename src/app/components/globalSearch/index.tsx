"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Select from "../reuseableUI/select";
import InputField from "../reuseableUI/defaultInputField";
import { SearchIcon } from "@/app/utils/svgs/searchIcon";
import PrimaryButton from "../reuseableUI/primaryButton";
import { CrossIcon } from "@/app/utils/svgs/crossIcon";
import { useGlobalStore } from "@/store/useGlobalStore";
import {
  shopApi,
  type PLSearchProductsResponse,
  type GlobalSearchResponse,
} from "@/lib/api/shop";
import { getFullImageUrl } from "@/app/utils/functions";

interface GlobalSearchProps {
  setShowSearch: (show: boolean) => void;
}

interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  thumbnail?: { url: string; alt?: string | null } | null;
  category?: { id: string; name: string } | null;
}

interface SearchCategory {
  id: string;
  name: string;
  slug: string;
  backgroundImage?: { url: string; alt?: string | null } | null;
  productCount?: number;
}

interface SearchProductType {
  id: string;
  name: string;
  slug: string;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ setShowSearch }) => {
  const router = useRouter();
  const isYMMActive = useGlobalStore((state) => state.isYMMActive);

  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [searchResults, setSearchResults] = useState<{
    products: SearchProduct[];
    categories: SearchCategory[];
    productTypes: SearchProductType[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Debounced search - uses REST API if YMM is active, GraphQL otherwise
  const performSearch = useCallback(
    async (query: string) => {
      if (!query || query.trim().length < 2) {
        setSearchResults(null);
        setShowDropdown(false);
        return;
      }

      setIsSearching(true);
      try {
        // If YMM status is OK/Active → Use PartsLogic search products API
        // If YMM status is NOT OK → Use GraphQL search
        if (isYMMActive) {
          // Use PartsLogic search products API
          const response: PLSearchProductsResponse =
            await shopApi.searchProductsPL({
              q: query.trim(),
              page: 1,
              per_page: 10,
            });

          // Transform PartsLogic response to match component interface
          setSearchResults({
            products: response.products.map((product) => ({
              ...product,
              // Use primary_image from PartsLogic API or thumbnail from GraphQL
              thumbnail:
                product.thumbnail ||
                (product.primary_image
                  ? {
                      url: product.primary_image,
                      alt: product.name,
                    }
                  : null),
              // Map category from PartsLogic format
              category:
                product.category ||
                (product.category_name
                  ? {
                      id: product.category_id || "",
                      name: product.category_name,
                    }
                  : null),
            })),
            categories: response.facets.categories.map((cat) => ({
              id: cat.id,
              name: cat.value,
              slug: cat.value.toLowerCase().replace(/\s+/g, "-"),
              backgroundImage: cat.media
                ? { url: cat.media, alt: cat.value }
                : null,
              productCount: cat.count,
            })),
            productTypes: response.facets.brands.map((brand) => ({
              id: brand.id,
              name: brand.value,
              slug: brand.value.toLowerCase().replace(/\s+/g, "-"),
            })),
          });
          setShowDropdown(true);
        } else {
          // Use GraphQL search (Saleor API) as fallback
          const response: GlobalSearchResponse =
            await shopApi.globalSearchStorefront({
              query: query.trim(),
              channel: "default-channel",
              includeProducts: true,
              includeCategories: true,
              includeCollections: false,
              includeProductTypes: true,
            });

          setSearchResults({
            products: response.products?.edges.map((edge) => edge.node) || [],
            categories:
              response.categories?.edges.map((edge) => edge.node) || [],
            productTypes:
              response.productTypes?.edges.map((edge) => edge.node) || [],
          });
          setShowDropdown(true);
        }
      } catch (error) {
        // If PartsLogic API fails, try GraphQL as fallback
        try {
          const response: GlobalSearchResponse =
            await shopApi.globalSearchStorefront({
              query: query.trim(),
              channel: "default-channel",
              includeProducts: true,
              includeCategories: true,
              includeCollections: false,
              includeProductTypes: true,
            });

          setSearchResults({
            products: response.products?.edges.map((edge) => edge.node) || [],
            categories:
              response.categories?.edges.map((edge) => edge.node) || [],
            productTypes:
              response.productTypes?.edges.map((edge) => edge.node) || [],
          });
          setShowDropdown(true);
        } catch (fallbackError) {
          setSearchResults(null);
        }
      } finally {
        setIsSearching(false);
      }
    },
    [isYMMActive]
  );

  // Debounce search input and re-run when YMM status changes
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch, isYMMActive]);

  // Load categories for filter dropdown
  // If YMM status is OK/Active → Categories loaded from search results (REST API)
  // If YMM status is NOT OK → Load categories from GraphQL
  useEffect(() => {
    const loadCategories = async () => {
      try {
        if (isYMMActive) {
          // Categories will be populated from REST API search results
          // No need to load separately as they come with fuzzy search response
        } else {
          const response = await shopApi.getGraphQLCategories({
            channel: "default-channel",
          });
          const categoryOptions = response.categories.edges.map((edge) => ({
            value: edge.node.slug,
            label: edge.node.name,
          }));
          setCategories(categoryOptions);
        }
      } catch (error) {
        // Failed to load categories
      }
    };

    loadCategories();
  }, [isYMMActive]);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    // Navigate to search results page
    const params = new URLSearchParams();
    params.set("q", searchQuery.trim());
    if (category) {
      params.set("category", category);
    }

    router.push(`/search?${params.toString()}`);
    setShowSearch(false);
    setShowDropdown(false);
  };

  const handleProductClick = (slug: string) => {
    router.push(`/product/${slug}`);
    setShowSearch(false);
    setShowDropdown(false);
  };

  const handleCategoryClick = (slug: string) => {
    router.push(`/category/${slug}`);
    setShowSearch(false);
    setShowDropdown(false);
  };

  return (
    <div
      style={{ backgroundColor: "var(--color-secondary-950)" }}
      className="hidden md:flex w-full items-center justify-center gap-4 px-20 py-5 text-sm font-semibold relative"
    >
      <div
        style={{ backgroundColor: "var(--color-secondary-800)" }}
        className="container flex items-center w-full justify-between relative"
      >
        <div className="pr-4 h-10 w-full overflow-hidden max-w-48">
          <Select
            className="leading-none"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={categories}
            placeholder="All CATEGORIES"
            style={{
              backgroundColor: "var(--color-secondary-800)",
              color: "var(--color-secondary-50)",
            }}
          />
        </div>
        <div
          style={{
            borderLeft: "1px solid var(--color-secondary-700)",
          }}
          className="flex items-center relative pl-4 justify-between w-full"
        >
          <div className="flex items-center w-full justify-center relative">
            <button onClick={handleSearch}>
              <span>{SearchIcon}</span>
            </button>
            <InputField
              className="leading-none  pl-2 w-full"
              name="Search-product"
              type="text"
              placeholder="Search product"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />

            {/* Search Dropdown */}
            {showDropdown && searchResults && (
              <div
                className="absolute top-full left-0 right-0 mt-2 bg-white shadow-lg  rounded-lg max-h-96 overflow-y-auto z-50"
                style={{ backgroundColor: "var(--color-secondary-800)" }}
              >
                {/* Products */}
                {searchResults.products.length > 0 && (
                  <div className="p-4">
                    <h3
                      className="text-sm font-semibold mb-2"
                      style={{ color: "var(--color-secondary-200)" }}
                    >
                      Products
                    </h3>
                    {searchResults.products.slice(0, 5).map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 p-2 hover:bg-secondary-700 cursor-pointer rounded"
                        onClick={() => handleProductClick(product.slug)}
                      >
                        {product.thumbnail?.url && (
                          <img
                            src={getFullImageUrl(product.thumbnail.url)}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <p
                            className="text-sm"
                            style={{ color: "var(--color-secondary-50)" }}
                          >
                            {product.name}
                          </p>
                          {product.category && (
                            <p
                              className="text-xs"
                              style={{ color: "var(--color-secondary-400)" }}
                            >
                              {product.category.name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Categories */}
                {searchResults.categories.length > 0 && (
                  <div
                    className="p-4 border-t"
                    style={{ borderColor: "var(--color-secondary-700)" }}
                  >
                    <h3
                      className="text-sm font-semibold mb-2"
                      style={{ color: "var(--color-secondary-200)" }}
                    >
                      Categories
                    </h3>
                    {searchResults.categories.slice(0, 3).map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center gap-3 p-2 hover:bg-secondary-700 cursor-pointer rounded"
                        onClick={() => handleCategoryClick(cat.slug)}
                      >
                        {/* Category Image */}
                        {cat.backgroundImage?.url && (
                          <div className="w-10 h-10 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                            <img
                              src={getFullImageUrl(cat.backgroundImage.url)}
                              alt={cat.backgroundImage.alt || cat.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                              }}
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <p
                            className="text-sm"
                            style={{ color: "var(--color-secondary-50)" }}
                          >
                            {cat.name}
                          </p>
                          {cat.productCount !== undefined && (
                            <p
                              className="text-xs"
                              style={{ color: "var(--color-secondary-400)" }}
                            >
                              {cat.productCount} products
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* View All Results */}
                <div
                  className="p-4 border-t"
                  style={{ borderColor: "var(--color-secondary-700)" }}
                >
                  <button
                    onClick={handleSearch}
                    className="w-full text-sm font-semibold py-2 rounded"
                    style={{ color: "var(--color-primary-500)" }}
                  >
                    View all results for &quot;{searchQuery}&quot;
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            style={{
              borderLeft: "1px solid var(--color-secondary-700)",
            }}
            className="p-2.5 cursor-pointer"
            onClick={() => {
              setShowSearch(false);
              setShowDropdown(false);
            }}
          >
            <span className="size-5 block">{CrossIcon}</span>
          </button>
        </div>
      </div>
      <PrimaryButton
        content={isSearching ? "Searching..." : "Search"}
        onClick={handleSearch}
      />
    </div>
  );
};

export default GlobalSearch;
