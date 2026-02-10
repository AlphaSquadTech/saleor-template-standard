"use client";

interface SearchLoadingOverlayProps {
  isVisible: boolean;
  searchTerm: string;
}

export default function SearchLoadingOverlay({ isVisible, searchTerm }: SearchLoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-20">
      <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-xl shadow-lg border border-[var(--color-secondary-200)] max-w-sm text-center">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-[var(--color-primary-200)] border-t-[var(--color-primary-600)] rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-b-[var(--color-primary-400)] rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-[var(--color-secondary-800)]">
            Searching Products
          </h3>
          <p className="text-sm text-[var(--color-secondary-600)]">
            Looking for &ldquo;{searchTerm}&rdquo;...
          </p>
          <p className="text-xs text-[var(--color-secondary-500)]">
            This may take a few moments
          </p>
        </div>
      </div>
    </div>
  );
}