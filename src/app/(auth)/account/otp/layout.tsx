import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export const metadata: Metadata = {
  title: `Verify Code - ${getStoreName()}`,
  description: "Enter the verification code sent to your email or phone to complete the authentication process.",
}

export default function OtpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}