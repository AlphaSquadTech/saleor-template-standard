import { NoProductFoundIcon } from "@/app/utils/svgs/noProductFoundIcon";

interface NoDataFoundProps {
  title?: string;
  description?: string;
  className?: string;
}

export function ShopEmptyState({
  title = "No products found for your selection",
  description = "Try clearing filters or searching again.",
  className = "",
}: NoDataFoundProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center min-h-full px-4 text-center ${className}`}
    >
      <div className="max-w-lg mx-auto flex justify-center items-center flex-col text-[var(--color-secondary-800)] font-secondary">
        <div className="rounded-full bg-[var(--color-secondary-200)] p-6 ">
          <span>{NoProductFoundIcon}</span>
        </div>
        <h2 className="text-xl uppercase font-bold  text-foreground mt-5  -tracking-[0.05px]">
          {title}
        </h2>
        <p className="text-sm -tracking-[0.035px] mt-2" >{description}</p>
      </div>
    </div>
  );
}
