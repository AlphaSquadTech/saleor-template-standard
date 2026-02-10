import type { Metadata } from "next"
import { getStoreName } from "@/app/utils/branding"

export const metadata: Metadata = {
  title: `Order History - ${getStoreName()}`,
  description: "View your complete order history, track shipments, and manage returns. Access invoices and order details easily.",
}

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}