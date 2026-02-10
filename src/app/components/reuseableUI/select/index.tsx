"use client";

import React, { SelectHTMLAttributes } from "react";
import { cn } from "@/app/utils/functions";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  parentClassName?: string;
  style?: React.CSSProperties;
  label?: string;
  hasError?: boolean;
  errorMessage?: string;
  darkTheme?: boolean;
  htmlFor?: string;
}

const Select = ({
  options,
  placeholder = "Select an option",
  className = "",
  parentClassName,
  value,
  style,
  label,
  hasError = false,
  errorMessage,
  darkTheme = false,
  htmlFor,
  ...props
}: SelectProps) => {
  const defaultTheme = "text-[var(--color-secondary-800)] ring-[var(--color-secondary-200)] bg-white hover:bg-zinc-200 cursor-pointer transition-all ease-in-out duration-300 disabled:bg-[var(--color-secondary-200)] disabled:text-[var(--color-secondary-400)] disabled:ring-[var(--color-secondary-300)]";
  
  return (
    <div className={cn("w-full", parentClassName)}>
      {label && (
        <label htmlFor={htmlFor} className={cn("block text-sm font-medium pb-2 uppercase leading-5 tracking-[-0.035px]", darkTheme ? "text-[var(--color-secondary-200)]" : "text-[var(--color-secondary-800)]")}>
          {label}
        </label>
      )}
      <div className="relative w-full">
        <select
          id={htmlFor}
          value={value}
          style={style}
          className={cn("w-full p-2 ring-1 focus-visible:ring-[var(--color-secondary-600)] outline-none disabled:pointer-events-none px-4 pr-12 py-3.5 text-sm font-normal font-secondary appearance-none",
            defaultTheme,
            hasError ? 'ring-[var(--color-primary-600)]' : 'ring-[var(--color-secondary-200)]',
            darkTheme && "bg-[var(--color-secondary-800)] ring-[var(--color-secondary-700)] text-[var(--color-secondary-200)] disabled:bg-[var(--color-secondary-800)] disabled:ring-0 disabled:text-[var(--color-secondary-600)]",
            className
          )}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
          <svg
            className="w-4 h-4 text-[var(--color-secondary-600)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      {errorMessage && (
        <div
          style={{ color: "var(--color-primary-600)" }}
          className="text-sm leading-5 tracking-[-0.035px] mt-1.5"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default Select;
export type { SelectOption, SelectProps };
