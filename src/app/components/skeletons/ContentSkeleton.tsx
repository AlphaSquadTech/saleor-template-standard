export default function ContentSkeleton() {
  return (
    <div className="w-full animate-pulse">
      <div className="h-6 w-40 bg-[var(--color-secondary-800)]/30 rounded mb-4" />
      <div className="h-4 w-full bg-[var(--color-secondary-800)]/20 rounded mb-2" />
      <div className="h-4 w-[90%] bg-[var(--color-secondary-800)]/20 rounded mb-2" />
      <div className="h-4 w-[80%] bg-[var(--color-secondary-800)]/20 rounded mb-6" />
      <div className="h-6 w-56 bg-[var(--color-secondary-800)]/30 rounded mb-4" />
      <div className="h-4 w-full bg-[var(--color-secondary-800)]/20 rounded mb-2" />
      <div className="h-4 w-[85%] bg-[var(--color-secondary-800)]/20 rounded mb-2" />
      <div className="h-4 w-[70%] bg-[var(--color-secondary-800)]/20 rounded" />
    </div>
  )
}
