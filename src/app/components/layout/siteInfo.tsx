import Link from "next/link"
import { fetchSiteInfo } from "@/graphql/queries/getSiteInfo"

function normalizePhone(raw: string) {
  const digits = raw.replace(/[^\d+]/g, "")
  return digits ? `tel:${digits}` : null
}

function lines(v: string) {
  return v.split(/\r?\n/).filter(Boolean)
}

export default async function SiteInfo() {
  const page = await fetchSiteInfo()

  const get = (k: string) =>
    page?.metadata
      ?.find((m) => m.key.toLowerCase() === k.toLowerCase())
      ?.value?.trim() || ""

  const address = get("Address")
  const email = get("Email")
  const phone = get("Phone")
  const timings = get("Timings")

  const allEmpty = [address, email, phone, timings].every((v) => !v)
  if (allEmpty) return null

  return (
    <div className="flex flex-col w-full gap-3">
      <span
        style={{ color: "var(--color-primary-600)" }}
        className="font-semibold text-lg text-center md:text-left lg:text-right"
      >
        SITE INFO
      </span>
      <div className="flex flex-col gap-2">
        {address && (
          <div
            className="text-base text-center md:text-left lg:text-right"
            style={{ color: "var(--color-secondary-100)" }}
          >
            {lines(address).map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        )}

        {email && (
          <Link
            prefetch={false}
            href={`mailto:${email}`}
            className="text-base hover:opacity-80 transition-opacity text-center md:text-left lg:text-right"
            style={{ color: "var(--color-secondary-100)" }}
          >
            {email}
          </Link>
        )}

        {phone && (
          <div
            className="text-base text-center md:text-left lg:text-right"
            style={{ color: "var(--color-secondary-100)" }}
          >
            {(() => {
              const phLines = lines(phone)
              const last = phLines[phLines.length - 1]
              const telHref = normalizePhone(last || phone)
              return (
                <>
                  {phLines.slice(0, -1).map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                  {last && telHref ? (
                    <Link
                      prefetch={false}
                      href={telHref}
                      className="hover:opacity-80 transition-opacity"
                      style={{ color: "var(--color-secondary-100)" }}
                    >
                      {last}
                    </Link>
                  ) : (
                    last && <div>{last}</div>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {timings && (
          <div
            className="text-base text-center md:text-left lg:text-right"
            style={{ color: "var(--color-secondary-100)" }}
          >
            {timings}
          </div>
        )}
      </div>
    </div>
  )
}
