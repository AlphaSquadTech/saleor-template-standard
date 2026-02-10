import { gql } from "@apollo/client";
import createApolloServerClient from "../server-client";

// GraphQL: fetch a single page by slug that includes metadata key/value pairs
const GET_PAYMENT_METHODS = gql`
  query PaymentMethods {
    page(slug: "payment-methods") {
      id
      metadata {
        key
        value
      }
    }
  }
`;

export type PaymentMethodFlagKey =
  | "VISA"
  | "MasterCard"
  | "Amex"
  | "PayPal"
  | "GooglePay"
  | "Discover"
  | "ApplePay";

export type PaymentMethodsResponse = {
  page: {
    id: string;
    metadata: { key: PaymentMethodFlagKey; value: string }[];
  } | null;
};

export const fetchPaymentMethods = async () => {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    // Same behavior as other fetchers: be tolerant when API is not configured
    console.warn("API URL not configured, skipping payment methods fetch");
    return null as PaymentMethodsResponse["page"];
  }

  try {
    const client = createApolloServerClient();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Payment methods fetch timeout")), 5000)
    );

    const queryPromise = client.query<{ page: PaymentMethodsResponse["page"]}>({
      query: GET_PAYMENT_METHODS,
      fetchPolicy: "network-only",
      errorPolicy: "ignore",
    });

    const result = await Promise.race([queryPromise, timeoutPromise]);
    return result?.data?.page ?? null;
  } catch (err) {
    console.warn(
      "Failed to fetch payment methods:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return null;
  }
};
