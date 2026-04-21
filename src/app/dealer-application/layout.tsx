import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dealer Application | Shop",
  description: "Apply to become an authorized dealer and connect with our team about wholesale opportunities.",
  alternates: {
    canonical: "/dealer-application",
  },
};

export default function DealerApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
