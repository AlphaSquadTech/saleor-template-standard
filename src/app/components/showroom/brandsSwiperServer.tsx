import { CategoryAPIType } from "@/lib/api/shop";
import React from "react";
import EmptyState from "../reuseableUI/emptyState";
import Heading from "../reuseableUI/heading";
import { BrandsSwiperClient } from "./brandsSwiperClient";

async function fetchBrands(): Promise<CategoryAPIType[]> {
  try {
    const partsLogicUrl = process.env.NEXT_PUBLIC_PARTSLOGIC_URL || "";
    const url = `${partsLogicUrl}/api/brands?page=1&per_page=100`;

    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch brands: ${res.status}`);
    }

    const data = await res.json();
    return data.brands || [];
  } catch (error) {
    console.error("Error fetching brands:", error);
    return [];
  }
}

export const BrandsSwiperServer = async () => {
  const brandsData = await fetchBrands();

  return !brandsData.length || brandsData?.length <= 1 ? null : (
    <section
      id="brands"
      style={{
        backgroundColor: "var(--color-secondary-920)",
      }}
      className="py-12 px-4 md:px-6 md:py-16 lg:py-24 lg:px-0"
    >
      <BrandsSwiperClient brands={brandsData} />
    </section>
  );
};
