import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export const metadata: Metadata = {
  title: `Payment Successful - ${getStoreName()}`,
  description: "Your payment has been processed successfully. Your order is confirmed and will be shipped soon.",
}

export default function AuthorizeNetSuccessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}