import type { Metadata } from "next";
import { getStoreName } from "@/app/utils/branding";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Site Map - ${getStoreName()}`,
    description: `Explore the comprehensive site map of ${getStoreName()} to easily navigate through all sections and find what you're looking for quickly.`,
  };
}

export default function SiteMapPostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
