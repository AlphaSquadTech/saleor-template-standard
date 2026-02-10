import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export const metadata: Metadata = {
  title: `Address Book - ${getStoreName()}`,
  description: "Manage your shipping and billing addresses. Add, edit, or remove addresses for faster checkout.",
}

export default function AddressLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}