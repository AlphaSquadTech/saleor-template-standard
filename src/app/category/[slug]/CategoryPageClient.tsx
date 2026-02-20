"use client";

import { useState, useEffect } from "react";
import Breadcrumb from "@/app/components/reuseableUI/breadcrumb";
import EmptyState from "@/app/components/reuseableUI/emptyState";
import { ProductCard } from "@/app/components/reuseableUI/productCard";
import ItemsPerPageSelectClient from "@/app/components/shop/ItemsPerPageSelectClient";
import SearchFilterClient from "@/app/components/shop/SearchFilterClient";
import { shopApi, type PLSearchProduct } from "@/lib/api/shop";

type ItemsPerPage = 10 | 20 | 50 | 100;

export default function CategoryPageClient(props: { slug: string }) {
  const { slug } = props;
  const [itemsPerPage, setItemsPerPage] = useState<ItemsPerPage>(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<PLSearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categoryName, setCategoryName] = useState<string>("");
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    per_page: 10,
    total_pages: 0,
  });

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await shopApi.getProductsBySlug({
          slug: slug,
          page: 1,
          per_page: itemsPerPage,
          search: searchQuery || undefined,
          filterType: "category_slug",
        });
        setProducts(response.products || []);
        setPagination(response.pagination);
        if (response.products && response.products.length > 0) {
          setCategoryName(response.products[0].category_name || slug);
        } else {
          setCategoryName(slug);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [itemsPerPage, searchQuery, slug]);

  const loadMore = async () => {
    if (loadingMore || pagination.page >= pagination.total_pages) return;

    setLoadingMore(true);
    const nextPage = pagination.page + 1;

    try {
      const response = await shopApi.getProductsBySlug({
        slug: slug,
        page: nextPage,
        per_page: itemsPerPage,
        search: searchQuery || undefined,
        filterType: "category_slug",
      });

      const newProducts = response.products || [];
      setProducts((prev) => [...prev, ...newProducts]);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Error loading more products:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const breadcrumbItems = [
    { text: "HOME", link: "/" },
    { text: "SHOP", link: "/products/all" },
    { text: slug.replaceAll("-", " ") },
  ];

  return (
    <div className="container mx-auto min-h-[100dvh] py-12 px-4 md:px-6 md:py-16 lg:py-24 lg:px-0 relative">
      <div className="space-y-5">
        <Breadcrumb items={breadcrumbItems} />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between w-full gap-4">
          <div className="space-y-2">
            <p className="font-normal uppercase text-[var(--color-secondary-800)] text-xl md:text-3xl lg:text-5xl font-primary">
              {slug.replaceAll("-", " ")}
            </p>
            {searchQuery && (
              <div className="flex items-center gap-2 text-sm text-[var(--color-secondary-600)]">
                <div className="flex items-center gap-2">
                  {pagination.total > 0
                    ? `Found ${pagination.total} result${
                        pagination.total === 1 ? "" : "s"
                      } for "${searchQuery}" in ${categoryName || slug}`
                    : `No results found for "${searchQuery}" in ${
                        categoryName || slug
                      }`}
                </div>
              </div>
            )}
            {!searchQuery && (
              <div className="flex items-center gap-2 text-sm text-[var(--color-secondary-600)]">
                <div className="flex items-center gap-2">
                  {pagination.total} product{pagination.total === 1 ? "" : "s"}{" "}
                  in {slug.replaceAll("-", " ")}
                </div>
              </div>
            )}
          </div>
          <div className="ml-auto">
            <ItemsPerPageSelectClient
              value={itemsPerPage}
              onChange={setItemsPerPage}
            />
          </div>
        </div>
      </div>

      <section className="mt-10 relative min-h-[400px]">
        {loading && (
          <div className="h-[60vh] bg-white/70 z-10 flex items-center justify-center rounded-lg">
            <div className="size-12  border-t-2 border-black rounded-full animate-spin" />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products && products.length > 0
            ? products.map((item) => (
                <ProductCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  image={item.primary_image || "/no-image-avail-large.png"}
                  href={`/product/${item.slug}`}
                  price={item.default_variant_price || 0}
                  category_id={item.category_id || ""}
                  category={item.category_name || ""}
                  discount={
                    item.price_max &&
                    item.price_min &&
                    item.price_max > item.price_min
                      ? item.price_max - item.price_min
                      : null
                  }
                  isFeatured={
                    item.collection_names?.includes("Best Sellers") || false
                  }
                  onSale={(item.price_max || 0) > (item.price_min || 0)}
                />
              ))
            : !loading && (
                <EmptyState
                  text="No products found"
                  textParagraph="Try adjusting your search or filter to find what you're looking for."
                  className="col-span-full my-12"
                />
              )}
        </div>

        {!loading &&
          pagination.page < pagination.total_pages &&
          products.length > 0 && (
            <div className="mt-10 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-4 py-2 cursor-pointer bg-[var(--color-secondary-200)] text-gray-800 hover:opacity-80 disabled:opacity-60 transition-opacity"
              >
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
      </section>
    </div>
  );
}
