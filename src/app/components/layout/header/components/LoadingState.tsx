interface LoadingStateProps {
  className?: string;
}

export const LoadingState = ({ className = "" }: LoadingStateProps) => {
  return (
    <div
      className={`animate-pulse container mx-auto flex justify-center ${className}`}
    >
      <div className="flex items-center gap-8">
        <div className="h-5 bg-gray-300 rounded w-16"></div>
        <div className="h-5 bg-gray-300 rounded w-20"></div>
        <div className="h-5 bg-gray-300 rounded w-20"></div>
        <div className="h-5 bg-gray-300 rounded w-20"></div>
        <div className="h-5 bg-gray-300 rounded w-20"></div>
        <div className="h-5 bg-gray-300 rounded w-14"></div>
        <div className="h-5 bg-gray-300 rounded w-18"></div>
      </div>
    </div>
  );
};
