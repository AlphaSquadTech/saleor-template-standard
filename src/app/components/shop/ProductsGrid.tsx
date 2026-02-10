"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { shopApi } from "@/lib/api/shop";
import { ProductCard } from "@/app/components/reuseableUI/productCard";
import EmptyState from "@/app/components/reuseableUI/emptyState";
import { gtmViewItemList, gtmSearchWithResults, Product } from "@/app/utils/googleTagManager";
import { useAppConfiguration } from "../providers/ServerAppConfigurationProvider";

export interface ProductsGridProps {
  initialEdges: Array<{ node: { id: string; name: string; slug: string; media?: Array<{ id: string; url: string; alt: string | null }>; category: { id: string; name: string } | null; pricing: { onSale: boolean | null; priceRange: { start: { gross: { amount: number; currency: string } } | null; stop: { gross: { amount: number; currency: string } } | null } | null } | null } }>;
  initialPageInfo: { hasNextPage: boolean; hasPreviousPage: boolean; startCursor: string | null; endCursor: string | null };
  channel: string;
  first: number;
  categoryIds?: string[];
  brandIds?: string[];
  search?: string;
  fitment?: string;
  layout?: 'shop' | 'category';
}

export default function ProductsGrid({
  initialEdges,
  initialPageInfo,
  channel,
  first,
  categoryIds,
  brandIds,
  search,
  fitment,
  layout = 'shop',
}: ProductsGridProps) {
  const { getGoogleTagManagerConfig } = useAppConfiguration();
  const gtmConfig = getGoogleTagManagerConfig();
  const [edges, setEdges] = useState(initialEdges);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset grid when any upstream input changes (e.g., filters via URL)
  const contextKey = useMemo(
    () => JSON.stringify({ c: channel, f: first, cats: categoryIds ?? [], brands: brandIds ?? [], search: search ?? "" }),
    [channel, first, categoryIds, brandIds, search]
  );
  const currentKeyRef = useRef(contextKey);
  useEffect(() => {
    setEdges(initialEdges);
    setPageInfo(initialPageInfo);
    setError(null);
    setLoadingMore(false);
    currentKeyRef.current = contextKey;
  }, [initialEdges, initialPageInfo, contextKey]);

  // Track product impressions
  useEffect(() => {
    if (edges.length > 0) {
      const products: Product[] = edges.map(({ node }, index) => ({
        item_id: node.id,
        item_name: node.name,
        item_category: node.category?.name || 'Products',
        price: node.pricing?.priceRange?.start?.gross?.amount || 0,
        currency: node.pricing?.priceRange?.start?.gross?.currency || 'USD',
        index: index,
        item_list_name: layout === 'category' ? 'Category Products' : search ? 'Search Results' : 'Shop Products',
        item_list_id: layout === 'category' ? 'category_list' : search ? 'search_results' : 'shop_list',
      }));

      gtmViewItemList(
        products,
        layout === 'category' ? 'Category Products' : search ? 'Search Results' : 'Shop Products',
        layout === 'category' ? 'category_list' : search ? 'search_results' : 'shop_list',
        gtmConfig?.container_id
      );

      // Track search results if this is a search
      if (search && search.trim()) {
        gtmSearchWithResults(search.trim(), edges.length, 'Products', gtmConfig?.container_id);
      }
    }
  }, [edges, layout, search]);

  const loadMore = async () => {
    if (!pageInfo?.hasNextPage || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const requestKey = currentKeyRef.current;
      
      // Use cursor-based pagination for GraphQL
      const after = pageInfo?.endCursor;
      
      let response;
      
      if (categoryIds && categoryIds.length > 0) {
        // Category-specific products
        response = await shopApi.getProductsByCategory({
          categoryIds,
          channel,
          first,
          after: after || undefined,
          search: search || undefined
        });
      } else if (brandIds && brandIds.length > 0) {
        // Brand-specific products (product types)
        response = await shopApi.getProductsByProductType({
          productTypeIds: brandIds,
          channel,
          first,
          after: after || undefined,
          search: search || undefined
        });
      } else {
        // General product search using existing function
        response = await shopApi.getProductsByCategoriesAndProductTypes({
          categoryIds: categoryIds || undefined,
          productTypeIds: brandIds || undefined,
          channel,
          first,
          sortField: "DATE",
          sortDirection: "ASC"
        });
      }
      
      // Ignore stale responses if inputs changed during the request
      if (requestKey !== currentKeyRef.current) return;
      
      // Products are already in the correct GraphQL format, but need to add onSale field
      type GraphQLEdgeWithOnSale = {
        cursor: string;
        node: {
          id: string;
          name: string;
          slug: string;
          description: string;
          category: { id: string; name: string } | null;
          productType: { id: string; name: string } | null;
          media: Array<{ id: string; url: string; alt: string | null }>;
          pricing: {
            onSale: boolean | null;
            priceRange: {
              start: { gross: { amount: number; currency: string } } | null;
              stop: { gross: { amount: number; currency: string } } | null;
            } | null;
          } | null;
        };
      };
      
      const newEdges: GraphQLEdgeWithOnSale[] = response.products.edges.map((edge) => ({
        ...edge,
        node: {
          ...edge.node,
          pricing: edge.node.pricing ? {
            ...edge.node.pricing,
            onSale: null // GraphQL doesn't provide onSale info
          } : null
        }
      }));
      
      // Dedupe by product ID
      setEdges((prev) => {
        const seen = new Set(prev.map((e) => e.node.id));
        const fresh = newEdges.filter((e) => !seen.has(e.node.id));
        return [...prev, ...fresh];
      });
      
      // Update page info from GraphQL response
      setPageInfo(response.products.pageInfo);
      
    } catch (e) {
      console.error('Load more error:', e);
      setError(e instanceof Error ? e.message : "Failed to load more products");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      {edges.length > 0 ? (
        <div className={`grid gap-4 ${
          layout === 'category' 
            ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' 
            : 'grid-cols-2 lg:grid-cols-3'
        }`}>
          {edges.map(({ node }) => {
            const img = node.media?.[0]?.url || "/no-image-avail-large.png";
            const price = node.pricing?.priceRange?.start?.gross?.amount ?? 0;
            // Use the original Saleor slug as-is for the URL
            const href = `/product/${encodeURIComponent(node.slug)}`;
            return (
              <ProductCard
                key={node.id}
                id={node.id}
                name={node.name}
                image={img}
                href={href}
                price={price}
                category_id={node.category?.id || ""}
                category={node.category?.name || ""}
                onSale={Boolean(node.pricing?.onSale)}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          text="No products found"
          textParagraph="Try adjusting your search or filter to find what you're looking for."
          className="col-span-full my-12"
        />
      )}

      {error ? (
        <div className="mt-4 text-sm text-red-600">{error}</div>
      ) : null}

      {pageInfo?.hasNextPage && (
        <div className="mt-10 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-4 py-2 bg-[var(--color-secondary-200)] text-gray-800 hover:opacity-80 disabled:opacity-60"
          >
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </>
  );
}
