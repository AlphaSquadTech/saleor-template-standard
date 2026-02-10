import { gql } from "@apollo/client";
import createApolloServerClient from "../server-client";

const GET_SITE_INFO = gql`
  query SiteInfo {
    page(slug: "site-info") {
      id
      metadata {
        key
        value
      }
    }
  }
`;

export type SiteInfoKey = "Address" | "Email" | "Phone" | "Timings";

export type SiteInfoResponse = {
  page: {
    id: string;
    metadata: { key: SiteInfoKey; value: string }[];
  } | null;
};

export const fetchSiteInfo = async () => {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    console.warn("API URL not configured, skipping site info fetch");
    return null as SiteInfoResponse["page"];
  }

  try {
    const client = createApolloServerClient();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Site info fetch timeout")), 5000)
    );

    const queryPromise = client.query<{ page: SiteInfoResponse["page"]}>({
      query: GET_SITE_INFO,
      fetchPolicy: "network-only",
      errorPolicy: "ignore",
    });

    const result = await Promise.race([queryPromise, timeoutPromise]);
    return result?.data?.page ?? null;
  } catch (err) {
    console.warn(
      "Failed to fetch site info:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return null;
  }
};
