"use client";

import { gql } from "@apollo/client";

export const ACCOUNT_ADDRESS_DELETE = gql`
  mutation DeleteAddress($id: ID!) {
    accountAddressDelete(id: $id) {
      user { id }
      errors { field message code }
    }
  }
`;

export interface AccountAddressDeleteData {
  accountAddressDelete: {
    user: { id: string } | null;
    errors: { field: string | null; message: string; code?: string | null }[];
  };
}

export interface AccountAddressDeleteVars {
  id: string;
}
