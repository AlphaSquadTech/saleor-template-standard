import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export const metadata: Metadata = {
  title: `Reset Password - ${getStoreName()}`,
  description: `Create a new password for your account. Enter your new password to regain access to your ${getStoreName()} account.`,
}

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}