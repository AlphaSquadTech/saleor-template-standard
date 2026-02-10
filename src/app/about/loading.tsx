import ContentSkeleton from "@/app/components/skeletons/ContentSkeleton"

export default function Loading() {
  return (
    <main className="h-full w-full">
      <div className="container mx-auto max-w-[1276px]">
        <div className="flex flex-col items-start w-full py-24">
          <div className="flex flex-col items-start gap-5 mb-6 w-full">
            <div className="h-5 w-24 bg-[var(--color-secondary-800)]/30 rounded" />
            <div className="h-9 w-64 bg-[var(--color-secondary-800)]/30 rounded" />
          </div>
          <ContentSkeleton />
        </div>
      </div>
    </main>
  )
}
