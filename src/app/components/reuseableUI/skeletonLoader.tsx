import React from "react";

interface SkeletonLoaderProps {
  type?: "card" | "text" | "image" | "hero" | "category" | "product";
  count?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type = "card",
  count = 1,
  className,
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case "hero":
        return (
          <div
            className={`relative w-full md:h-[546px] h-[414px] bg-gray-200 animate-pulse ${
              className ?? ""
            }`}
          >
            <div className="container mx-auto relative flex flex-col lg:flex-row items-start justify-center px-2 gap-6 md:gap-8 lg:gap-10 py-10 md:py-12 lg:py-20 ">
              <div className="w-full">
                <div className="h-16 w-3/4 bg-gray-300 rounded mb-4"></div>
                <div className="h-[72px] w-1/2 bg-gray-300 rounded mb-6"></div>
              </div>
              <div className="w-full max-w-[420px] h-[380px] bg-gray-300 lg:mr-5" />
            </div>
          </div>
        );

      case "category":
        return (
          <div
            className={`group block border border-gray-200 rounded-md overflow-hidden bg-white ${
              className ?? ""
            }`}
          >
            <div className="relative w-full h-[246px] bg-gray-200 animate-pulse">
              <div className="absolute top-0 flex flex-col justify-between w-full h-full z-10 p-8">
                <div className="h-16 w-full bg-gray-300 rounded "></div>
                <div className="h-6 w-1/2 bg-gray-300 rounded "></div>
              </div>
            </div>
          </div>
        );

      case "product":
        return (
          <div
            className={`group block border border-[var(--color-secondary-200)] bg-white ${
              className ?? ""
            }`}
          >
            <div className="relative w-full aspect-[3/4] bg-gray-200 animate-pulse" />
            <div className="p-3">
              <div className="h-5 mb-1 bg-gray-200  w-1/3"></div>
              <div className="h-7 bg-gray-200  w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200  w-1/2 mb-2"></div>
            </div>
          </div>
        );

      case "text":
        return (
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        );

      default:
        return (
          <div
            className={`bg-gray-200 animate-pulse rounded ${className ?? ""}`}
          />
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <React.Fragment key={index}>{renderSkeleton()}</React.Fragment>
      ))}
    </>
  );
};
