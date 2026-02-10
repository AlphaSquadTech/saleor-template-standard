import { cn } from "@/app/utils/functions";
import { CloseEyeIcon } from "@/app/utils/svgs/closeEyeIcon";
import { EyeIcon } from "@/app/utils/svgs/eyeIcon";
import React from "react";
const Input = ({
  label,
  name,
  type,
  placeholder,
  value,
  onChange,
  required,
  disabled,
  readOnly,
  hasError = false,
  className,
  parentClassName,
  errorMessage,
  autoComplete,
  darkTheme = false,
  htmlFor,
  id,
  maxLength,
  onFocus,
  onBlur,
}: {
  label?: string;
  name: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  parentClassName?: string;
  hasError?: boolean;
  errorMessage?: string;
  autoComplete?: string;
  darkTheme?: boolean;
  htmlFor?: string;
  id?: string;
  maxLength?: number;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const defaultTheme =
    "text-[var(--color-secondary-800)] ring-[var(--color-secondary-200)] bg-white  disabled:bg-[var(--color-secondary-200)] disabled:text-[var(--color-secondary-400)] disabled:placeholder:text-[var(--color-secondary-400)] disabled:ring-[var(--color-secondary-300)]";
  return (
    <div className={parentClassName}>
      {label && (
        <label
          htmlFor={htmlFor}
          className={cn(
            "block text-sm font-medium pb-2 uppercase leading-5 tracking-[-0.035px]",
            darkTheme
              ? "text-[var(--color-secondary-200)]"
              : "text-[var(--color-secondary-800)]"
          )}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={showPassword ? "text" : type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          maxLength={maxLength}
          autoComplete={autoComplete}
          className={cn(
            "w-full p-2 ring-1 focus-visible:ring-[var(--color-secondary-600)] outline-none disabled:pointer-events-none px-4 py-3.5 text-sm font-normal font-secondary",
            defaultTheme,
            hasError
              ? "ring-[var(--color-primary-600)]"
              : "ring-[var(--color-secondary-200)]",
            darkTheme &&
              "bg-[var(--color-secondary-800)] ring-[var(--color-secondary-700)] placeholder:text-[var(--color-secondary-500)] text-[var(--color-secondary-200)] disabled:bg-[var(--color-secondary-800)] disabled:ring-0 disabled:placeholder:text-[var(--color-secondary-600)] disabled:text-[var(--color-secondary-600)]",
            className
          )}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className={cn(
              "absolute right-4 top-5 transform",
              disabled ? "pointer-events-none" : "cursor-pointer"
            )}
          >
            {showPassword ? EyeIcon : CloseEyeIcon}
          </button>
        )}
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

export default Input;
