"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
// import { ChevronDownIcon } from "@/app/utils/svgs/chevronDownIcon";

const OPTIONS = [10, 20, 50, 100] as const;

type Option = (typeof OPTIONS)[number];

export default function ItemsPerPageSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const value: Option = useMemo(() => {
    const raw = searchParams?.get("first");
    const n = raw ? parseInt(raw, 10) : NaN;
    return (OPTIONS as readonly number[]).includes(n) ? (n as Option) : 20;
  }, [searchParams]);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = parseInt(e.target.value, 10) as Option;
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("first", String(next));
    // reset pagination cursor when page size changes
    params.delete("after");
    const href = `${pathname}?${params.toString()}`;
    router.push(href, { scroll: false });
  };

  return (
    <label className="flex items-center justify-end gap-2 text-sm font-secondary">
      <span className="text-[var(--color-secondary-700)] flex-shrink-0">
        Items per page:
      </span>
      <div className="relative inline-block">
        <select
          aria-label="Items per page"
          value={value}
          onChange={onChange}
          className="h-9 pl-2 pr-8 rounded border bg-[var(--color-secondary-50)] text-[var(--color-secondary-900)] border-[var(--color-secondary-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-600)] cursor-pointer appearance-none"
        >
          {OPTIONS.map((opt) => (
            <option
              key={opt}
              value={opt}
              className="bg-white text-[var(--color-secondary-900)]"
            >
              {opt}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="16"
            height="16"
            fill="none"
            aria-hidden
          >
            <path
              d="M13 6L8 11L3 6"
              stroke="var(--color-secondary-700)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
        </span>
      </div>
    </label>
  );
}
