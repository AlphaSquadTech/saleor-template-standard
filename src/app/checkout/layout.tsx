import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export const metadata: Metadata = {
  title: `Checkout - ${getStoreName()}`,
  description: "Complete your purchase securely. Enter shipping and billing information, select delivery options, and finalize your order.",
}

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}