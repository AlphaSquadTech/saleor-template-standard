import React from "react";
import { DynamicPageData } from "@/graphql/queries/getDynamicPageBySlug";
import HtmlWidgetRenderer from "./HtmlWidgetRenderer";

interface DynamicPageRendererProps {
  pageData: DynamicPageData;
}

export default function DynamicPageRenderer({
  pageData,
}: DynamicPageRendererProps) {
  return <HtmlWidgetRenderer content={pageData.content || ""} />;
}
