import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export const metadata: Metadata = {
  title: `Create Account - ${getStoreName()}`,
  description: `Create your new account to enjoy faster checkout, order tracking, and exclusive member benefits. Join ${getStoreName()} today.`,
}

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}