import Link from "next/link";
import { fetchSiteInfo } from "@/graphql/queries/getSiteInfo";

function normalizePhone(raw: string) {
  const digits = raw.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

function IconMail(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

function IconPhone(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.62 2.6a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.48-1.14a2 2 0 0 1 2.11-.45c.83.29 1.7.5 2.6.62A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconClock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export default async function TopBar() {
  const page = await fetchSiteInfo();

  const get = (k: string) =>
    page?.metadata
      ?.find((m) => m.key.toLowerCase() === k.toLowerCase())
      ?.value?.trim() || "";

  const email = get("Email");
  const phone = get("Phone");
  const timings = get("Timings");

  // If nothing to show, render nothing
  if (![email, phone, timings].some(Boolean)) return null;

  const phoneHref = phone
    ? normalizePhone(phone.split(/\r?\n/).pop() || phone)
    : null;

  return (
    <div
      className="w-full border-b"
      style={{
        backgroundColor: "var(--color-secondary-950)",
        borderColor: "var(--color-secondary-800)",
      }}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2 py-2 md:py-2.5">
          {/* Left: Contact */}
          <div
            className="flex items-center gap-4 text-xs sm:text-sm"
            style={{ color: "var(--color-secondary-50)" }}
          >
            {email && (
              <div className="group flex items-center gap-1.5">
                <IconMail className="text-white group-hover:text-[var(--color-primary)] transition-colors" />
                <Link
                  aria-label="Email"
                  prefetch={false}
                  href={`mailto:${email}`}
                  className="text-white hover:text-[var(--color-primary)] transition-colors"
                >
                  {email}
                </Link>
              </div>
            )}
            {phone && (
              <div className="group flex items-center gap-1.5">
                <IconPhone className="text-white group-hover:text-[var(--color-primary)] transition-colors" />
                {phoneHref ? (
                  <Link
                    aria-label="Phone"
                    prefetch={false}
                    href={phoneHref}
                    className="text-white group-hover:text-[var(--color-primary)] transition-colors"
                  >
                    {phone}
                  </Link>
                ) : (
                  <span className="text-white group-hover:text-[var(--color-primary)] transition-colors">
                    {phone}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: Timings */}
          {timings && (
            <div
              className="group flex items-center gap-1.5 text-xs sm:text-sm"
              style={{ color: "var(--color-secondary-50)" }}
            >
              <div className="mb-[2px]">
                <IconClock className="opacity-80 transition-colors" />
              </div>
              <span className="transition-colors">
                {timings}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
