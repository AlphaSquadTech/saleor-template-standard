import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export const metadata: Metadata = {
  title: `Login - ${getStoreName()}`,
  description: "Sign in to your account to access order history, saved addresses, and faster checkout. New customers can create an account.",
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}