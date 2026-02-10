import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export const metadata: Metadata = {
  title: `Contact - ${getStoreName()}`,
  description: `Contact ${getStoreName()} for customer support, product inquiries, or general questions. Multiple ways to reach our team.`,
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}