import { cn } from "@/app/utils/functions";
import { ChevronDownIcon } from "@/app/utils/svgs/chevronDownIcon";
import { useEffect, useRef, useState } from "react";

interface SortOption {
  key: string;
  label: string;
}

interface SortDropdownProps {
  sortOptions: SortOption[];
  sortKey: string;
  setSortKey: (key: string) => void;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({
  sortOptions,
  sortKey,
  setSortKey,
}) => {
  const [sortOpen, setSortOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setSortOpen(false);
      }
    };

    if (sortOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sortOpen]);

  const currentSortLabel =
    sortOptions.find((opt) => opt.key === sortKey)?.label || "Select";

  return (
    <div className="relative w-full md:w-auto" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setSortOpen((v) => !v)}
        className="flex cursor-pointer border border-[var(--color-secondary-300)] bg-[var(--color-secondary-110)] w-full md:w-auto uppercase justify-between text-[var(--color-secondary-800)] items-center gap-2 px-4 py-3.5 font-secondary"
        aria-haspopup="listbox"
        aria-expanded={sortOpen}
      >
        <div className="flex items-center">
          <span className="font-semibold text-xs md:text-sm hidden md:block">
            SORT BY: &nbsp;
          </span>
          <span className="text-xs md:text-sm">
            {currentSortLabel.split(":")[1] || currentSortLabel}
          </span>
        </div>
        <span
          className={cn(
            "size-5 flex-shrink-0 transition-all ease-in-out duration-300 text-black",
            sortOpen ? "-rotate-180" : ""
          )}
        >
          {ChevronDownIcon}
        </span>
      </button>

      {sortOpen && (
        <div className="absolute right-0 mt-2 w-full bg-white border border-[var(--color-secondary-200)] z-10">
          <ul role="listbox" className="text-xs md:text-sm">
            {sortOptions.map((opt) => {
              const selected = opt.key === sortKey;
              return (
                <li
                  key={opt.key}
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setSortKey(opt.key);
                    setSortOpen(false);
                  }}
                  className={`cursor-pointer text-xs md:text-sm -tracking-[0.035px] p-3 font-secondary border-b border-[var(--color-secondary-200)] flex items-center gap-2 text-[var(--color-secondary-800)]`}
                >
                  <p
                    className={cn(
                      "border rounded-full p-px flex items-center justify-center",
                      selected
                        ? "border-[var(--color-primary-600)]"
                        : "border-[var(--color-secondary-200)]"
                    )}
                  >
                    <span
                      className={`inline-block size-2.5 text-xs md:text-sm  rounded-full  ${
                        selected
                          ? "bg-[var(--color-primary-600)] "
                          : "bg-white "
                      }`}
                    />
                  </p>
                  {opt.label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
