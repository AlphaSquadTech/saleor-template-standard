import React from "react";

export type ProductSkeletonVariant = "grid" | "swiper" | "list";

interface ProductSkeletonProps {
  variant?: ProductSkeletonVariant;
  className?: string;
}

export const ProductSkeleton: React.FC<ProductSkeletonProps> = ({
  variant = "grid",
  className,
}) => {
  const base = "group block border border-gray-200 rounded-md overflow-hidden bg-white animate-pulse";

  const imageHeights: Record<ProductSkeletonVariant, string> = {
    grid: "h-48",
    swiper: "h-48",
    list: "h-32",
  };

  return (
    <div className={`${base} ${className ?? ""}`}>
      <div className={`relative w-full ${imageHeights[variant]} bg-gray-200`} />
      <div className="p-3">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
};

export default ProductSkeleton;
