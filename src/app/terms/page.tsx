import React from "react";
import type { Metadata } from "next";
import Heading from "../components/reuseableUI/heading";
import Breadcrumb from "../components/reuseableUI/breadcrumb";
import Section from "../components/reuseableUI/section";
import { TermsAndConditionsSections } from "./constant";
import { getStoreName } from "@/app/utils/branding";

export const metadata: Metadata = {
  title: `Terms - ${getStoreName()}`,
  description: `Read the terms and conditions for using ${getStoreName()} services and purchasing products.`,
}

export default function TermsAndConditionsPage() {
  return (
    <main className="h-full w-full">
      <div className="container mx-auto max-w-[1276px] ">
        <div className="flex flex-col items-start w-full gap-16 py-24">
          <div className="flex flex-col items-start gap-5 w-full">
            <Breadcrumb
              items={[
                { text: "Home", link: "/" },
                { text: "Terms & Conditions", link: "/terms" },
              ]}
            />
            <Heading content="Terms & Conditions" />
          </div>
          {TermsAndConditionsSections.map((section, index) => (
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
