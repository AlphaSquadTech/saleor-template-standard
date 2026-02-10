import { gql } from "@apollo/client";
import createApolloServerClient from "../server-client";

const GET_SOCIAL_LINKS = gql`
  query SocialMediaLinks {
    page(slug: "social-media-links") {
      id
      metadata {
        key
        value
      }
    }
  }
`;

export type SocialKey = "facebook" | "instagram" | "twitter" | "youtube";

export type SocialLinksResponse = {
  page: {
    id: string;
    metadata: { key: SocialKey; value: string }[];
  } | null;
};

export const fetchSocialLinks = async () => {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    console.warn("API URL not configured, skipping social links fetch");
    return null as SocialLinksResponse["page"];
  }

  try {
    const client = createApolloServerClient();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Social links fetch timeout")), 5000)
    );

    const queryPromise = client.query<{ page: SocialLinksResponse["page"] }>({
      query: GET_SOCIAL_LINKS,
      fetchPolicy: "network-only",
      errorPolicy: "ignore",
    });

    const result = await Promise.race([queryPromise, timeoutPromise]);
    return result?.data?.page ?? null;
  } catch (err) {
    console.warn(
      "Failed to fetch social links:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return null;
  }
};
