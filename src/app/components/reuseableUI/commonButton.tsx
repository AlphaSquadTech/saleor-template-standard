import { cn } from "@/app/utils/functions";
import React from "react";

const CommonButton = ({
  onClick,
  content,
  className,
  disabled,
  type,
  variant,
  children,
}: {
  onClick?: () => void;
  content?: string;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "tertiary" | "tertiarySecondary";
  children?: React.ReactNode;
}) => {
  return (
    <button
      onClick={onClick}
      className={cn("disabled:pointer-events-none disabled:bg-[var(--color-secondary-300)] disabled:text-[var(--color-secondary-400)]",
        variant === "primary"
          ? "bg-[var(--color-primary-600)] text-black hover:text-[var(--color-primary-500)] hover:bg-white ring-1 ring-yellow-500 disabled:ring-transparent"
          : "",
        variant === "secondary"
          ? "bg-[var(--color-secondary-200)] text-[var(--color-secondary-800)] hover:bg-[var(--color-secondary-300)]"
          : "",
        variant === "tertiary"
          ? "bg-transparent text-[var(--color-secondary-800)] hover:text-[var(--color-primary-600)] underline underline-offset-4"
          : "",
        variant === "tertiarySecondary"
          ? "bg-transparent hover:text-[var(--color-secondary-800)] text-[var(--color-primary-600)] underline underline-offset-4"
          : "",
        "py-3.5 px-4 font-secondary font-semibold cursor-pointer uppercase text-base -tracking-[0.04px] transition-all ease-in-out duration-300",
        className
      )}
      disabled={disabled}
      type={type}
    >
      {content ? content : children}
    </button>
  );
};

export default CommonButton;
