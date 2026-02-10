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

export const SearchByVehicle = ({
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
      style={{ backgroundColor: "var(--color-secondary-920)" }}
      className={`p-6 lg:px-8 lg:py-10 flex flex-col items-start flex-wrap gap-1 md:gap-5 relative ${
        className && className
      }`}
    >
      <h2 className="font-secondary text-lg md:text-[24px] font-bold leading-6 md:leading-[32px] tracking-[-0.06px] text-[var(--color-secondary-75)]">
        SEARCH BY VEHICLE
      </h2>

      {!dropdownLevels.length ? (
        <div className="w-full inline-block">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-300 w-full block h-12 z-10 mb-3 last:mb-0"
            />
          ))}
        </div>
      ) : (
        <div className="max-h-[228px] overflow-y-auto w-full">
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
                parentClassName="w-full mb-3 last:mb-0"
                style={{ backgroundColor: "var(--color-secondary-50)" }}
                disabled={loading || level.values.length === 0}
              />
            );
          })}
        </div>
      )}
      <div className="flex flex-col gap-4 w-full">
        <PrimaryButton
          className="leading-[150%] py-3 w-full text-[var(--color-secondary-700)]"
          content="SEARCH"
          disabled={loading}
          onClick={handleSearch}
        />
        {AddClearButton && (
          <button
            onClick={handleClear}
            disabled={!hasSelectedFilters}
            className="w-full h-11 bg-white border border-[var(--color-secondary-300)] text-[var(--color-secondary-800)] font-semibold rounded-md hover:bg-[var(--color-secondary-50)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            CLEAR
          </button>
        )}
      </div>
    </div>
  );
};
