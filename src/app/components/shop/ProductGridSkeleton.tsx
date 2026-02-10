export default function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-[var(--color-secondary-200)] overflow-hidden animate-pulse">
          <div className="aspect-square bg-[var(--color-secondary-100)]"></div>
          <div className="p-4 space-y-2">
            <div className="h-4 bg-[var(--color-secondary-100)] rounded w-3/4"></div>
            <div className="h-4 bg-[var(--color-secondary-100)] rounded w-1/2"></div>
            <div className="h-4 bg-[var(--color-secondary-100)] rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}