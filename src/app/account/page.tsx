import { redirect } from 'next/navigation';
import type { Metadata } from "next";
import { getStoreName } from "@/app/utils/branding";

export const metadata: Metadata = {
  title: `My Account - ${getStoreName()}`,
  description: "Manage your account, view order history, update addresses, and track shipments. Your shopping dashboard.",
}

export default function AccountIndexPage() {
  // Redirect to My Profile as the default landing page for /account
  redirect('/account/settings');
  return null;
}
