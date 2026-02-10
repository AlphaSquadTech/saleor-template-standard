import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export const metadata: Metadata = {
  title: `Account Settings - ${getStoreName()}`,
  description: "Update your profile information, change password, and manage account preferences. Keep your account secure and up to date.",
}

export default function AccountSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}