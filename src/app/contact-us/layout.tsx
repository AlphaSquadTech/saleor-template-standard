import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export const metadata: Metadata = {
  title: `Contact Us - ${getStoreName()}`,
  description: "Get in touch with our customer support team. We're here to help with product questions, orders, and technical support.",
}

export default function ContactUsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}