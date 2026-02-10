import { Suspense } from "react"
import Link from "next/link"
import AncillaryContent from "@/app/components/ancillary/AncillaryContent"
import ContentSkeleton from "@/app/components/skeletons/ContentSkeleton"

export default function ContactUsPage() {
  const derivedTitle = "Contact Us"

  return (
    <main className="h-full w-full">
      <div className="container mx-auto max-w-[1276px]">
        <div className="flex flex-col items-start w-full px-4 md:px-6 py-12 md:py-16 lg:py-24">
          <div className="flex flex-col items-start gap-5 mb-6 w-full">
            <nav aria-label="Breadcrumb" className="text-sm text-[var(--color-secondary-500)]">
              <ol className="flex items-center gap-2">
                <li><Link href="/" className="hover:underline">Home</Link></li>
                <li className="opacity-60">/</li>
                <li><Link href="/contact-us" className="hover:underline">Contact Us</Link></li>
              </ol>
            </nav>
            <h1 className="text-4xl font-semibold tracking-tight">{derivedTitle}</h1>
          </div>

          <section className="w-full">
            <Suspense fallback={<ContentSkeleton />}>
              <AncillaryContent slug="contact-us" />
            </Suspense>
          </section>
        </div>
      </div>
    </main>
  )
}
