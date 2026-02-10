"use client";

import { gql } from "@apollo/client";

export const ACCOUNT_ADDRESS_UPDATE = gql`
  mutation UpdateAddress($id: ID!, $input: AddressInput!) {
    accountAddressUpdate(id: $id, input: $input) {
      address {
        id
        firstName
        lastName
        streetAddress1
        city
        postalCode
        country { code country }
        phone
      }
      errors { field message code }
    }
  }
`;

export interface AddressUpdateInput {
  firstName: string;
  lastName: string;
  phone?: string | null;
  companyName?: string | null;
  streetAddress1: string;
  streetAddress2?: string | null;
  city: string;
  postalCode: string;
  country: string; // ISO code
  countryArea?: string | null;
}

export interface AccountAddressUpdateData {
  accountAddressUpdate: {
    address: {
      id: string;
      firstName: string;
      lastName: string;
      streetAddress1: string;
      city: string;
      postalCode: string;
      country: { code: string; country: string };
      phone?: string | null;
    } | null;
    errors: { field: string | null; message: string; code?: string | null }[];
  };
}

export interface AccountAddressUpdateVars {
  id: string;
  input: AddressUpdateInput;
}
