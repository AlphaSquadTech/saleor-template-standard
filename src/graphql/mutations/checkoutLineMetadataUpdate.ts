/**
 * Mutation to update metadata on a checkout line.
 * Uses Saleor's generic updateMetadata mutation with the CheckoutLine ID.
 *
 * Note: The `id` parameter is the CheckoutLine ID (not Checkout ID),
 * obtained from the response of `checkoutLinesAdd`.
 */
export const UPDATE_CHECKOUT_LINE_METADATA = `
  mutation UpdateCheckoutLineMetadata($id: ID!, $input: [MetadataInput!]!) {
    updateMetadata(id: $id, input: $input) {
      item {
        ... on CheckoutLine {
          id
          metadata {
            key
            value
          }
        }
      }
      errors {
        field
        message
      }
    }
  }
`;

export interface MetadataInput {
  key: string;
  value: string;
}

export interface UpdateCheckoutLineMetadataVars {
  id: string;
  input: MetadataInput[];
}

export interface CheckoutLineMetadataResponse {
  updateMetadata: {
    item: {
      id: string;
      metadata: Array<{
        key: string;
        value: string;
      }>;
    } | null;
    errors: Array<{
      field: string | null;
      message: string;
    }>;
  };
}
