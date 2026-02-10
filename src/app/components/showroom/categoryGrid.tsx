"use client";
import { shopApi } from "@/lib/api/shop";
import React, { useEffect } from "react";
import EmptyState from "../reuseableUI/emptyState";
import Heading from "../reuseableUI/heading";
import CategorySwiper from "./categorySwiper";
export type CategoryAPIType = {
  id: string;
  image: string;
  name: string;
  slug: string;
};

export const CategoryGrid = () => {
  const [categories, setCategories] = React.useState<CategoryAPIType[]>([]);
  useEffect(() => {
    const fetchCategoriesData = async () => {
      try {
        const resp = await shopApi.categoryProductPL();
        setCategories(resp.categories);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setCategories([]);
      }
    };
    fetchCategoriesData();
  }, []);
  return (
    <section
      className="py-12 px-4 md:px-6 md:py-16 lg:py-24 lg:px-0"
      style={{
        backgroundColor: "var(--color-secondary-920)",
      }}
    >
      {!categories.length ? (
        <div className="container mx-auto">
          <div className="flex w-full items-center justify-between ">
            <Heading content="Shop by Category" />
          </div>
          <EmptyState
            text="No categories available"
            textParagraph="Categories will appear here once they are added"
            className="h-[20vh] mt-16"
          />
        </div>
      ) : (
        <CategorySwiper categories={categories} />
      )}
    </section>
  );
};
