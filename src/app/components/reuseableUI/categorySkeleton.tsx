import React from "react";

export type CategorySkeletonVariant = "grid" | "swiper";

interface CategorySkeletonProps {
  variant?: CategorySkeletonVariant;
  className?: string;
}

export const CategorySkeleton: React.FC<CategorySkeletonProps> = ({
  variant = "grid",
  className,
}) => {
  const base = "group block border border-gray-200 rounded-md overflow-hidden bg-white animate-pulse";
  const imageHeights: Record<CategorySkeletonVariant, string> = {
    grid: "h-40",
    swiper: "h-48",
  };

  return (
    <div className={`${base} ${className ?? ""}`}>
      <div className={`relative w-full ${imageHeights[variant]} bg-gray-200`} />
      <div className="p-3">
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
};

export default CategorySkeleton;
