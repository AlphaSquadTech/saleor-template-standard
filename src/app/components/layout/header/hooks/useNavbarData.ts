import { useState, useEffect, useMemo } from "react";
import { shopApi, type GraphQLCategory } from "@/lib/api/shop";
import { fetchMenuBySlug } from "@/graphql/queries/getMenuBySlug";

export type CategoryNode = {
  id: string;
  name: string;
  slug?: string;
  children?: CategoryNode[];
};

export type MenuItem = {
  id: string;
  name: string;
  url: string;
  level: number;
  metadata?: Array<{
    key: string;
    value: string;
  }>;
  children?: MenuItem[];
};

export const useNavbarData = () => {
  const [categories, setCategories] = useState<Array<CategoryNode>>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch categories and menu data in parallel
        const [categoriesResult, menuResult] = await Promise.allSettled([
          fetchCategories(),
          fetchMenuData()
        ]);

        // Handle categories result
        if (categoriesResult.status === 'fulfilled') {
          setCategories(categoriesResult.value);
        } else {
          console.warn('Categories fetch failed:', categoriesResult.reason);
          setCategories([]);
        }

        // Handle menu result
        if (menuResult.status === 'fulfilled') {
          setMenuItems(menuResult.value);
        } else {
          console.warn('Menu fetch failed:', menuResult.reason);
          setMenuItems([]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.warn('Data fetch failed:', message);
        setError(message);
        setCategories([]);
        setMenuItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const transformedCategories = useMemo(() => {
    return categories.map(category => ({
      ...category,
      children: category.children || []
    }));
  }, [categories]);

  return {
    categories: transformedCategories,
    menuItems,
    loading,
    error,
    hasData: categories.length > 0 || menuItems.length > 0
  };
};

const fetchCategories = async (): Promise<CategoryNode[]> => {
  try {
    // Fetch categories from GraphQL API (same as shop page)
    const channel = "default-channel";
    const categoriesResponse = await shopApi.getGraphQLCategories({ channel });
    
    // Transform GraphQL categories to match expected format
    const buildHierarchy = (categories: GraphQLCategory[], parentId: string | null = null): CategoryNode[] => {
      return categories
        .filter(cat => {
          if (parentId === null) {
            return !cat.parent; // Root categories
          }
          return cat.parent?.id === parentId;
        })
        .map(category => ({
          id: category.id,
          name: category.name,
          slug: category.slug, // Use Saleor's slug field
          children: buildHierarchy(categories, category.id)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    };

    const categoryNodes = categoriesResponse.categories.edges.map(edge => edge.node);
    return buildHierarchy(categoryNodes);
  } catch (error) {
    console.error('Failed to fetch categories from GraphQL API:', error);
    return [];
  }
};

const fetchMenuData = async (): Promise<MenuItem[]> => {
  const menuData = await fetchMenuBySlug("navbar");
  if (
    menuData &&
    typeof menuData === "object" &&
    "items" in menuData &&
    Array.isArray(menuData.items)
  ) {
    return menuData.items as MenuItem[];
  }
  return [];
};