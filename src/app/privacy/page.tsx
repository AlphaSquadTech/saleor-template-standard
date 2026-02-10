import React from "react";
import type { Metadata } from "next";
import Heading from "../components/reuseableUI/heading";
import Breadcrumb from "../components/reuseableUI/breadcrumb";
import Section from "../components/reuseableUI/section";
import { privacyPolicySections } from "./constant";
import { getStoreName } from "@/app/utils/branding";

export const metadata: Metadata = {
  title: `Privacy - ${getStoreName()}`,
  description: `Understand how ${getStoreName()} handles your privacy and personal data. Our commitment to protecting your information.`,
}

export default function PrivacyPolicyPage() {
  return (
    <main className="h-full w-full">
      <div className="container mx-auto max-w-[1276px] ">
        <div className="flex flex-col items-start w-full gap-16 px-4 md:px-6 py-12 md:py-16 lg:py-24">
          <div className="flex flex-col items-start gap-5 w-full">
            <Breadcrumb
              items={[
                { text: "Home", link: "/" },
                { text: "Privacy Policy", link: "/privacy" },
              ]}
            />
            <Heading content="Privacy Policy" />
          </div>
          {privacyPolicySections.map((section, index) => (
            <Section
              key={index}
              title={section.title}
              description={section.description}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
