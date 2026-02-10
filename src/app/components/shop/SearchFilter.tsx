"use client";

import { SearchIcon } from "@/app/utils/svgs/searchIcon";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { gtmSearch } from "../../utils/googleTagManager";
import { useAppConfiguration } from "../providers/ServerAppConfigurationProvider";

export default function SearchFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { getGoogleTagManagerConfig } = useAppConfiguration();
  const gtmConfig = getGoogleTagManagerConfig();
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSearchIdRef = useRef<number>(0);

  // Track if user is actively typing to avoid URL interference
  const isTypingRef = useRef(false);

  useEffect(() => {
    const q = searchParams?.get("q") || "";
    
    // Only update search term from URL if user is not actively typing
    if (!isTypingRef.current) {
      setSearchTerm(q);
    }
    
    // Reset loading state when search params change (page loaded with new results)
    setIsSearching(false);
    
    // Clear any pending navigation timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
  }, [searchParams]);

  const performSearch = useCallback((term: string, searchId: number) => {
    // Check if this search is still the current one
    if (searchId !== currentSearchIdRef.current) {
      return; // This search has been cancelled by a newer one
    }

    const params = new URLSearchParams(searchParams?.toString() || "");
    
    if (term.trim()) {
      params.set("q", term.trim());
    } else {
      params.delete("q");
    }
    
    // Reset pagination when searching
    params.delete("after");
    
    const href = `${pathname}?${params.toString()}`;
    
    // Show loading state only if this is still the current search
    if (searchId === currentSearchIdRef.current) {
      setIsSearching(true);
      
      // Track search in GTM
      if (term.trim()) {
        gtmSearch(term.trim(), undefined, gtmConfig?.container_id);
      }
      
      // Navigate
      router.push(href, { scroll: false });
      
      // Clear any existing timeout
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      
      // Reset loading state after a reasonable time
      navigationTimeoutRef.current = setTimeout(() => {
        // Only reset if this is still the current search
        if (searchId === currentSearchIdRef.current) {
          setIsSearching(false);
        }
      }, 3000);
    }
  }, [router, searchParams, pathname, gtmConfig?.container_id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Mark that user is actively typing
    isTypingRef.current = true;
    
    // Immediately update the search term for responsive UI
    setSearchTerm(value);

    // Immediately reset loading state when user starts typing again
    setIsSearching(false);

    // Cancel any previous search by incrementing the search ID
    currentSearchIdRef.current += 1;
    const currentSearchId = currentSearchIdRef.current;

    // Clear existing timeouts (cancels previous debounced search and navigation timeout)
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    // Auto-search with debounce for any meaningful input
    if (value.trim().length >= 2 || value.trim().length === 0) {
      debounceTimeoutRef.current = setTimeout(() => {
        // Mark that user is no longer actively typing
        isTypingRef.current = false;
        
        // Only show loading if this is still the current search
        if (currentSearchId === currentSearchIdRef.current) {
          setIsSearching(true);
        }
        performSearch(value, currentSearchId);
      }, 800); // 800ms debounce - gives user time to finish typing
    } else {
      // For short inputs, still mark as not typing after a brief delay
      setTimeout(() => {
        isTypingRef.current = false;
      }, 100);
    }
  };


  const clearSearch = () => {
    // Mark as not typing since this is a programmatic action
    isTypingRef.current = false;
    
    setSearchTerm("");
    
    // Cancel any previous search
    currentSearchIdRef.current += 1;
    const currentSearchId = currentSearchIdRef.current;
    
    // Clear debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    setIsSearching(true);
    performSearch("", currentSearchId);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
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