import { gql } from '@apollo/client';

export interface UpdateCheckoutMetadataInput {
  key: string;
  value: string;
}

export interface UpdateCheckoutMetadataVariables {
  id: string;
  input: UpdateCheckoutMetadataInput[];
}

export interface UpdateCheckoutMetadataData {
  updateMetadata: {
    item: {
      id: string;
      token: string;
      metadata: {
        key: string;
        value: string;
      }[];
    } | null;
    errors: {
      field: string | null;
      message: string;
    }[];
  };
}

export const UPDATE_CHECKOUT_METADATA = gql`
  mutation UpdateCheckoutMetadata($id: ID!, $input: [MetadataInput!]!) {
    updateMetadata(id: $id, input: $input) {
      item {
        ... on Checkout {
          id
          token
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