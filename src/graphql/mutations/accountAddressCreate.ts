"use client";

import { gql } from "@apollo/client";

export const ACCOUNT_ADDRESS_CREATE = gql`
  mutation AddAddress($input: AddressInput!) {
    accountAddressCreate(input: $input) {
      user { id }
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

export interface AddressInput {
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

export interface AccountAddressCreateData {
  accountAddressCreate: {
    user: { id: string } | null;
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

export interface AccountAddressCreateVars {
  input: AddressInput;
}
