import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export const metadata: Metadata = {
  title: `Forgot Password - ${getStoreName()}`,
  description: "Reset your password securely. Enter your email address and we'll send you instructions to create a new password.",
}

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}