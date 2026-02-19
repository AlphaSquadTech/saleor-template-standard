/**
 * tRPC Client for PayPal Payment App
 *
 * Authentication: All requests use storefront JWT tokens. The user ID is
 * extracted server-side from the JWT - you do NOT pass saleorUserId in requests.
 */

import { createTRPCClient, httpLink } from "@trpc/client";
import type {
  ListSavedPaymentMethodsInput,
  ListSavedPaymentMethodsResponse,
} from "@/types/global";

// Type definitions for the Payment App's tRPC procedures
type PaymentAppClient = {
  customerVault: {
    listSavedPaymentMethods: {
      query: (
        input: ListSavedPaymentMethodsInput,
      ) => Promise<ListSavedPaymentMethodsResponse>;
    };
  };
};

/**
 * Get the PayPal Payment App URL from environment variables
 * This should be set to your Payment App's base URL
 */
const getPaymentAppUrl = () => {
  const url = process.env.NEXT_PUBLIC_PAYPAL_APP_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_PAYPAL_APP_URL is not defined. Please add it to your .env file.",
    );
  }
  return url;
};

/**
 * Get the authentication token for the current user
 * This is used to authenticate requests to the Payment App
 */
const getAuthToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

/**
 * Get the Saleor API URL from environment variables
 * The Payment App needs this to make requests to Saleor
 */
const getSaleorApiUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not defined. Please add it to your .env file.",
    );
  }
  return url;
};

/**
 * Create the tRPC client instance
 * This is a singleton that will be reused across the application
 *
 * Headers:
 * - authorization-bearer: The buyer's Saleor JWT token
 * - saleor-api-url: Your Saleor GraphQL API URL
 */
export const paymentAppClient = createTRPCClient({
  links: [
    httpLink({
      url: `${getPaymentAppUrl()}/api/trpc`,
      headers: () => {
        const token = getAuthToken();
        const saleorApiUrl = getSaleorApiUrl();

        return {
          ...(token ? { "authorization-bearer": token } : {}),
          "saleor-api-url": saleorApiUrl,
        };
      },
    }),
  ],
}) as unknown as PaymentAppClient;

export const vaultApi = {
  async listSavedPaymentMethods(): Promise<ListSavedPaymentMethodsResponse> {
    try {
      return await paymentAppClient.customerVault.listSavedPaymentMethods.query(
        {},
      );
    } catch (error) {
      console.error("Error listing saved payment methods:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to list saved payment methods",
      );
    }
  },
};
