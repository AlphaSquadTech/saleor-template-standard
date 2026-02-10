"use client";
import React, { useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import PrimaryButton from "./primaryButton";
import Select from "./select";
import { useVehicleData } from "@/hooks/useVehicleData";
import { useGlobalStore } from "@/store/useGlobalStore";

interface SelectInputProps {
  onSearch?: (fitment: string) => void;
  className?: string;
  AddClearButton?: boolean;
}

export const HeroSectionSearchByVehicle = ({
  onSearch,
  className,
  AddClearButton = false,
}: SelectInputProps) => {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isYMMActive = useGlobalStore((state) => state.isYMMActive);
  const previousPairsRef = useRef<string | null>(null);
  const isSearchPage = pathname === "/search";

  const {
    rootTypes,
    selectedRootType,
    dropdownLevels,
    loading,
    handleRootTypeChange,
    handleValueChange,
    isComplete,
    getSelectedPairs,
    initializeFromPairs,
    resetInitialization,
  } = useVehicleData();

  const initialPairs = params.get("fitment_pairs");

  useEffect(() => {
    if (
      rootTypes.length > 0 &&
      selectedRootType === 0 &&
      dropdownLevels.length === 0 &&
      !initialPairs
    ) {
      handleRootTypeChange(rootTypes[0].id);
    }
  }, [rootTypes]);

  useEffect(() => {
    // Only initialize if we're on the search page AND we have fitment_pairs
    if (!isSearchPage || !initialPairs) {
      return;
    }

    // Prevent re-initialization if pairs haven't changed
    if (previousPairsRef.current === initialPairs) {
      return;
    }

    if (rootTypes.length === 0) {
      return;
    }

    previousPairsRef.current = initialPairs;
    initializeFromPairs(initialPairs);
  }, [initialPairs, isSearchPage, rootTypes]);

  // Reset when leaving the search page or pairs are cleared
  useEffect(() => {
    return () => {
      if (isSearchPage) {
        resetInitialization();
        previousPairsRef.current = null;
      }
    };
  }, [isSearchPage]);

  const handleSearch = () => {
    const pairs = getSelectedPairs();
    if (onSearch) {
      onSearch(pairs);
    } else {
      router.push(`/search?fitment_pairs=${pairs}`);
    }
  };

  const handleClear = () => {
    resetInitialization();
    previousPairsRef.current = null;

    // Only navigate if we're on the search page
    if (isSearchPage) {
      router.push(`/search`);
    }

    if (rootTypes.length > 0) {
      setTimeout(() => {
        handleRootTypeChange(rootTypes[0].id);
      }, 100);
    }
  };

  // Check if any filter is selected
  const hasSelectedFilters = dropdownLevels.some(
    (level) => level.selectedValue !== ""
  );

  if (!isYMMActive) {
    return null;
  }
  return (
    <div
      style={{ backgroundColor: "black" }}
      className={`p-6 lg:px-8 lg:py-4 flex flex-col lg:flex-row items-center gap-4 md:gap-5 w-full lg:absolute top-0 z-10 ${
        className && className
      }`}
    >
      <h2 className="px-5 font-secondary text-center text-white text-xl whitespace-nowrap font-thin leading-6 md:leading-[32px] tracking-[-0.06px]">
        SEARCH BY
        <br /> <span className="font-primary">VEHICLE</span>
      </h2>

      {!dropdownLevels.length ? (
        <div className="h-fit flex flex-col lg:flex-row gap-3 w-full">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-gray-300 w-full block h-12 z-10" />
          ))}
        </div>
      ) : (
        <div className=" h-fit flex flex-col lg:flex-row gap-3 w-full">
          {/* Dynamic Dropdown Levels */}
          {dropdownLevels.map((level, index) => {
            const selectId = `vehicle-${level.typeName.toLowerCase()}-${index}`;

            return (
              <Select
                key={`${level.typeId}-${index}`}
                htmlFor={selectId}
                value={level.selectedValue}
                onChange={(e) => {
                  const valueId =
                    level.values.find(
                      (v) => (v.value || v.name) === e.target.value
                    )?.id || 0;
                  handleValueChange(index, valueId, e.target.value);
                }}
                options={level.values.map((v) => ({
                  value: v.value || v.name || "",
                  label: v.value || v.name || "",
                }))}
                placeholder={`SELECT ${level.typeName.toUpperCase()}`}
                parentClassName="w-full h-full mb-0"
                disabled={loading || level.values.length === 0}
              />
            );
          })}
        </div>
      )}
      <div className="flex gap-4 w-full lg:w-fit">
        {AddClearButton && (
          <button
            onClick={handleClear}
            disabled={!hasSelectedFilters}
            className=" cursor-pointer w-full h-12 bg-white ring-1 ring-[var(--color-secondary-300)] hover:ring-white text-[var(--color-secondary-800)] font-semibold hover:bg-zinc-200  hover:ring-black transition-colors disabled:opacity-50 disabled:pointer-events-none disabled:hover:bg-white px-10"
          >
            CLEAR
          </button>
        )}
        <PrimaryButton
          className=" px-10 h-12 w-full"
          content="SEARCH"
          disabled={loading}
          onClick={handleSearch}
        />
      </div>
    </div>
  );
};
