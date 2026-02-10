"use client";

import { SearchIcon } from "@/app/utils/svgs/searchIcon";
import { useState, useEffect, useRef } from "react";

interface SearchFilterClientProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
}

export default function SearchFilterClient({ value, onChange, onSearch }: SearchFilterClientProps) {
  const [searchTerm, setSearchTerm] = useState(value);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with external value changes
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsSearching(true);

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce the search
    debounceTimeoutRef.current = setTimeout(() => {
      setIsSearching(false);
      if (onSearch) {
        onSearch(newValue);
      } else {
        onChange(newValue);
      }
    }, 800);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setIsSearching(false);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (onSearch) {
      onSearch("");
    } else {
      onChange("");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full md:max-w-md relative">
      <div className="relative">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={handleInputChange}
          className="w-full h-10 pl-10 pr-10 text-sm border border-[var(--color-secondary-300)] bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-600)] text-[var(--color-secondary-900)] placeholder-[var(--color-secondary-500)]"
        />

        {/* Search icon or loading spinner */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          {isSearching ? (
            <div className="w-4 h-4 border-2 border-[var(--color-secondary-300)] border-t-[var(--color-primary-500)] rounded-full animate-spin" />
          ) : (
            <span className="w-4 h-4 block text-[var(--color-secondary-600)]">
              {SearchIcon}
            </span>
          )}
        </div>

        {/* Clear button or loading text */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isSearching ? (
            <span className="text-xs text-[var(--color-secondary-500)] font-medium">
              Searching...
            </span>
          ) : searchTerm ? (
            <button
              type="button"
              onClick={clearSearch}
              className="text-[var(--color-secondary-400)] hover:text-[var(--color-secondary-600)] transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                width="16"
                height="16"
                fill="none"
              >
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
