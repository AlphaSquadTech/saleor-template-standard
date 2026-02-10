"use client";

import { gql } from "@apollo/client";

export const ME_ADDRESSES_QUERY = gql`
  query MeAddresses {
    me {
      id
      email
      defaultShippingAddress { id }
      defaultBillingAddress { id }
      addresses {
        id
        firstName
        lastName
        phone
        companyName
        streetAddress1
        streetAddress2
        city
        postalCode
        country { code country }
        countryArea
      }
    }
  }
`;

export interface Country {
  code: string;
  country: string;
}

export interface Address {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  companyName?: string | null;
  streetAddress1: string;
  streetAddress2?: string | null;
  city: string;
  postalCode: string;
  country: Country;
  countryArea?: string | null;
}

export interface MeAddressesData {
  me: {
    id: string;
    email: string;
    defaultShippingAddress: { id: string } | null;
    defaultBillingAddress: { id: string } | null;
    addresses: Address[];
  } | null;
}
