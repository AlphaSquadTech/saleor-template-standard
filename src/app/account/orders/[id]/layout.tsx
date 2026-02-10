import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Order Details - ${getStoreName()}`,
    description: `View detailed information about your order including tracking, items ordered, and shipping information.`,
  }
}

export default function OrderDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}