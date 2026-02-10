import Link from "next/link"
import { fetchSocialLinks, SocialKey } from "@/graphql/queries/getSocialLinks"
import { socialIconsConfig } from "@/app/utils/constant"

export type SocialIconKey = keyof typeof socialIconsConfig

const apiKeyToIconKey: Partial<Record<SocialKey, SocialIconKey>> = {
  facebook: "FB",
  instagram: "IG",
  twitter: "X",
  youtube: "YT",
}

export default async function SocialLinks({
  fallback,
}: {
  fallback?: { name: string; href: string; icon: SocialIconKey }[]
}) {
  const page = await fetchSocialLinks()

  let items: { name: string; href: string; icon: SocialIconKey }[] | null = null

  if (page?.metadata?.length) {
    items = page.metadata
      .map((m) => {
        const icon = apiKeyToIconKey[m.key as SocialKey]
        if (!icon || !(icon in socialIconsConfig)) return null
        const friendlyName: Record<SocialIconKey, string> = {
          X: "X",
          IG: "Instagram",
          FB: "Facebook",
          YT: "YouTube",
        }
        const href = (m.value || "").trim()
        if (!href) return null
        return { name: friendlyName[icon], href, icon }
      })
      .filter(Boolean) as { name: string; href: string; icon: SocialIconKey }[]
  }

  const list = items && items.length > 0 ? items : fallback || []
  if (!list.length) return null

  return (
    <div className="flex items-center justify-center lg:justify-start gap-4">
      {list.map((s) => {
        const Icon = socialIconsConfig[s.icon]
        if (!Icon) return null
        return (
          <Link
            key={s.name}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-400 transition-colors"
            aria-label={s.name}
            style={{ color: "var(--color-secondary-50)" }}
          >
            <span className="inline-block h-6 w-6">{Icon}</span>
          </Link>
        )
      })}
    </div>
  )
}
