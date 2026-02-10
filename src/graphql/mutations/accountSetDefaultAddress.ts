"use client";

import { gql } from "@apollo/client";

export const ACCOUNT_SET_DEFAULT_ADDRESS = gql`
  mutation SetDefaultAddress($id: ID!, $type: AddressTypeEnum!) {
    accountSetDefaultAddress(id: $id, type: $type) {
      user {
        id
        defaultShippingAddress { id }
        defaultBillingAddress { id }
      }
      errors { field message code }
    }
  }
`;

export interface AccountSetDefaultAddressData {
  accountSetDefaultAddress: {
    user: {
      id: string;
      defaultShippingAddress: { id: string } | null;
      defaultBillingAddress: { id: string } | null;
    } | null;
    errors: { field: string | null; message: string; code?: string | null }[];
  };
}

export interface AccountSetDefaultAddressVars {
  id: string;
  type: "SHIPPING" | "BILLING";
}
