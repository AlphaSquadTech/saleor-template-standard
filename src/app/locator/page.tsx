"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Breadcrumb from "@/app/components/reuseableUI/breadcrumb";
import StoreLocator from "./components/storeLocator";

const locatorBreadcrumbItems = [
  { text: "HOME", link: "/" },
  { text: "STORE LOCATOR" },
];

const Page = () => {
  return (
    <div className="container mx-auto min-h-[100dvh] py-12 px-4 md:px-6 md:py-16 lg:py-24 lg:px-0 relative space-y-6">
      <Breadcrumb items={locatorBreadcrumbItems} />

      {/* Tab Content */}
      <div className="mt-6">
        <StoreLocator />
      </div>
    </div>
  );
};

export default Page;
