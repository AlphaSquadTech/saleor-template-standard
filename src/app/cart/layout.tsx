import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export const metadata: Metadata = {
  title: `Cart - ${getStoreName()}`,
  description: "Review your selected items, update quantities, and proceed to checkout. Secure shopping with fast shipping options available.",
}

export default function CartLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}