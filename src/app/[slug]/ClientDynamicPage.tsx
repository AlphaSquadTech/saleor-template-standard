"use client";

import { DynamicPageData } from "@/graphql/queries/getDynamicPageBySlug";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";
import DynamicPageRenderer from "../components/dynamicPage/DynamicPageRenderer";
import { NoProductFoundIcon } from "../utils/svgs/noProductFoundIcon";

interface ClientDynamicPageProps {
  slug: string;
}

export default function ClientDynamicPage({ slug }: ClientDynamicPageProps) {
  const [pageData, setPageData] = useState<DynamicPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPageData() {
      try {
        
        const response = await fetch(`/api/dynamic-page/${slug}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            notFound();
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setPageData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load page');
      } finally {
        setLoading(false);
      }
    }

    fetchPageData();
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg">Loading page...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-10">
          <h1 className="text-7xl font-normal font-primary mb-4">
            404
          </h1>
          <p className="font-normal text-3xl text-zinc-500">
            Page Not Found
          </p>
          <div className="border border-black rounded-full w-fit mx-auto p-2">
            <span className="[&>svg]:size-14">{NoProductFoundIcon}</span>
          </div>
        </div>
      </main>
    );
  }

  if (!pageData) {
    notFound();
    return null;
  }

  return (
    <main className="min-h-screen">
      <DynamicPageRenderer pageData={pageData} />
    </main>
  );
}