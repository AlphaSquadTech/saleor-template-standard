"use client";

import React from "react";

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  name?: string;
  error?: string;
  suffix?: string; // Add suffix prop
}

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(({ 
  label,
  name,
  error,
  suffix,
  className = "",
  ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Label */}
      {label && (
        <label
          style={{
            color: "var(--color-secondary-200)",
          }}
          htmlFor={name}
          className="text-sm font-secondary -tracking-wide"
        >
          {label}
        </label>
      )}

      {/* Input with optional suffix */}
      <div className="relative">
        <input
          style={{
            backgroundColor: "var(--color-secondary-800)",
            border: error
              ? "var(--color-primary-600)"
              : "var(--color-secondary-600)",
            color: "black",
          }}
          autoComplete="off"
          id={name}
          name={name}
          ref={ref}
          className={`border font-secondary !placeholder-[var(--color-secondary-400)] placeholder:font-normal px-4 py-3 text-sm leading-6
            focus:outline-none custom-placeholder !bg-transparent w-full
            ${suffix ? 'pr-12' : ''}
            ${className}`}
          {...props}
        />
        
        {/* Suffix */}
        {suffix && (
          <div 
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm pointer-events-none"
            style={{
              color: "var(--color-secondary-400)",
            }}
          >
            {suffix}
          </div>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Placeholder styling */}
      <style jsx>{`
        .custom-placeholder::placeholder {
          color: var(--color-secondary-500);
        }
      `}</style>
    </div>
  );
});

InputField.displayName = "InputField";

export default InputField;