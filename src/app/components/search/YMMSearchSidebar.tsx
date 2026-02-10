"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { shopApi } from "@/lib/api/shop";
import { useGlobalStore } from "@/store/useGlobalStore";
import Select from "@/app/components/reuseableUI/select";

interface YMMSearchSidebarProps {
  initialYear?: number | string;
  initialMake?: number | string;
  initialModel?: number | string;
}

export default function YMMSearchSidebar({
  initialYear = "",
  initialMake = "",
  initialModel = "",
}: YMMSearchSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [year, setYear] = useState(initialYear);
  const [make, setMake] = useState(initialMake);
  const [model, setModel] = useState(initialModel);
  const [makes, setMakes] = useState<Array<{ id: number; value: string }>>([]);
  const [models, setModels] = useState<Array<{ id: number; value: string }>>(
    []
  );
  const [loadingMakes, setLoadingMakes] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  // Get years from global store (same as main search component)
  const ymmYears = useGlobalStore((state) => state.ymmYears);
  const ymmYearsLoaded = useGlobalStore((state) => state.ymmYearsLoaded);
  const loadingYears = !ymmYearsLoaded;

  const selectedYearData = ymmYears.find((y) => String(y.id) === String(year));
  const selectedMakeData = makes.find((m) => String(m.id) === String(make));

  useEffect(() => {
    if (!year) {
      setMakes([]);
      setMake("");
      setModel("");
      return;
    }
    const fetchMakes = async () => {
      setLoadingMakes(true);
      try {
        if (!selectedYearData) {
          return;
        }
        const response = await shopApi.getMakes(selectedYearData.id);
        if (response) {
          setMakes(response.data.map((m) => ({ id: m.id, value: m.value })));
        }
      } catch (error) {
        console.error("Error fetching makes:", error);
        setMakes([]);
      } finally {
        setLoadingMakes(false);
      }
    };

    fetchMakes();
  }, [year, selectedYearData]);

  // Fetch models when make changes
  useEffect(() => {
    if (!year || !make) {
      setModels([]);
      setModel("");
      return;
    }

    if (makes.length === 0) return;

    const fetchModels = async () => {
      setLoadingModels(true);
      try {
        if (!selectedMakeData) {
          console.warn("Make not found yet, retrying later...");
          return;
        }

        if (!selectedYearData) return;

        const response = await shopApi.getModels(
          selectedYearData.id,
          selectedMakeData.id
        );

        if (response) {
          setModels(response.data.map((m) => ({ id: m.id, value: m.value })));
        }
      } catch (error) {
        console.error("Error fetching models:", error);
        setModels([]);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, [year, make, selectedYearData, selectedMakeData]);

  const handleSearch = () => {
    if (year && make && model) {
      // year, make, and model are already IDs, use them directly
      router.push(`/search?year=${year}&make=${make}&model=${model}`);
    }
  };
  const handleClear = () => {
    setYear("");
    setMake("");
    setModel("");
    // Clear filters and show all products
    router.push("/search");
  };

  return (
    <div className="bg-white border border-[var(--color-secondary-200)] rounded-lg p-4">
      <h3 className="text-lg font-semibold text-[var(--color-secondary-800)] mb-4">
        Shop By Vehicle
      </h3>

      <div className="space-y-4">
        {/* Year Dropdown */}
        {/* <Select
          label="Year"
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            setMake("");
            setModel("");
          }}
          options={ymmYears.map((y) => ({
            value: String(y.id),
            label: y.value,
          }))}
          placeholder={loadingYears ? "Loading..." : "Select Year"}
          disabled={loadingYears}
        /> */}

        {/* Make Dropdown */}
        <Select
          label="Make"
          value={make}
          onChange={(e) => {
            setMake(e.target.value);
            setModel("");
          }}
          options={makes.map((m) => ({ value: String(m.id), label: m.value }))}
          placeholder={loadingMakes ? "Loading..." : "Select Make"}
          disabled={!year || loadingMakes}
        />

        {/* Model Dropdown */}
        <Select
          label="Model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          options={models.map((m) => ({ value: String(m.id), label: m.value }))}
          placeholder={loadingModels ? "Loading..." : "Select Model"}
          disabled={!make || loadingModels}
        />

        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={!year || !make || !model}
          className="w-full h-11 cursor-pointer bg-[var(--color-primary)] text-white font-semibold rounded-md hover:bg-[var(--color-primary-600)] transition-colors disabled:bg-[var(--color-secondary-300)] disabled:cursor-not-allowed"
        >
          SEARCH
        </button>

        {/* Clear Button */}
        <button
          onClick={handleClear}
          className="w-full h-11 bg-white border border-[var(--color-secondary-300)] text-[var(--color-secondary-800)] font-semibold rounded-md hover:bg-[var(--color-secondary-50)] transition-colors"
        >
          CLEAR
        </button>
      </div>
    </div>
  );
}
