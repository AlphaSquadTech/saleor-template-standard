import { gql } from "@apollo/client";
import createApolloServerClient from "../server-client";

export const GET_CONTACT_PAGE = gql`
  query Contact($first: Int = 1) {
    pages(first: $first, filter: { slugs: "contact" }) {
      edges {
        node {
          id
          title
          content
          metadata {
            key
            value
          }
        }
      }
    }
  }
`;

export type ContactMetadata = {
  key: string;
  value: string;
};

export type ContactPageNode = {
  id: string;
  title: string;
  content: string | null;
  metadata: ContactMetadata[];
};

export type ContactPageEdge = {
  node: ContactPageNode;
};

export type ContactPageResponse = {
  pages: {
    edges: ContactPageEdge[];
  };
};

export type ContactPageData = {
  id: string;
  title: string;
  content: string | null;
  contactFormEnabled: boolean;
  productInquiryFormEnabled: boolean;
  recaptchaEnabled: boolean;
  fields: string[];
  description: string | null;
  emailTo: string | null;
  emailCc: string | null;
  emailBcc: string | null;
  emailSubject: string | null;
  successMessage: string | null;
};

export function parseContactPageMetadata(node: ContactPageNode): ContactPageData {
  const metadata = node.metadata.reduce((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {} as Record<string, string>);

  return {
    id: node.id,
    title: node.title,
    content: node.content,
    contactFormEnabled: metadata.contact_form === "true",
    productInquiryFormEnabled: metadata.product_inquiry_form === "true",
    recaptchaEnabled: metadata.reCAPTCHA === "true",
    fields: metadata.fields ? metadata.fields.split(",").map((f) => f.trim()) : [],
    description: metadata.description || null,
    emailTo: metadata.email_to || null,
    emailCc: metadata.email_cc || null,
    emailBcc: metadata.email_bcc || null,
    emailSubject: metadata.email_subject || null,
    successMessage: metadata.success_message || null,
  };
}

export async function fetchContactPage(): Promise<ContactPageData | null> {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    console.warn("API URL not configured, skipping contact page fetch");
    return null;
  }

  try {
    const client = createApolloServerClient();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Contact page fetch timeout")), 5000)
    );

    const queryPromise = client.query<ContactPageResponse>({
      query: GET_CONTACT_PAGE,
      variables: { first: 1 },
      fetchPolicy: "network-only",
      errorPolicy: "ignore",
    });

    const result = await Promise.race([queryPromise, timeoutPromise]);
    const edges = result?.data?.pages?.edges;

    if (edges && edges.length > 0) {
      return parseContactPageMetadata(edges[0].node);
    }

    return null;
  } catch (err) {
    console.warn(
      "Failed to fetch contact page:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return null;
  }
}
