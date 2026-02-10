import { cn } from "@/app/utils/functions";
import React from "react";

interface ButtonProps {
  content: React.ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

const SecondaryButton = ({
  content,
  onClick,
  className = "",
  type = "button",
  disabled = false,
}: ButtonProps) => {
  return (
    <button
      disabled={disabled}
      type={type}
      onClick={onClick}
      className={cn(
        "font-secondary ring-1 ring-[var(--color-secondary-900)] bg-[var(--color-secondary-900)] text-[var(--color-secondary-50)] hover:bg-[var(--color-secondary-800)] transition-all ease-in-out duration-300 font-semibold cursor-pointer -tracking-[0.04px] px-4 py-2",
        className,
      )}
    >
      {content}
    </button>
  );
};

export default SecondaryButton;
