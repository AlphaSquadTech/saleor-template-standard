import { gql } from "@apollo/client";

export const GET_CHANNELS = gql`
  query GetChannels {
    channels {
      id
      name
      slug
      isActive
      warehouses {
        id
        name
        slug
        email
        isPrivate
        address {
          streetAddress1
          streetAddress2
          city
        phone
          postalCode
          countryArea
          country {
            code
            country
          }
        }
        privateMetadata {
          key
          value
        }
      }
    }
  }
`;


export interface Address {
  streetAddress1?: string;
  streetAddress2?: string;
  city?: string;
  phone?: string;
  postalCode?: string;
  countryArea?: string;
  country?: {
    code: string;
    country: string;
  };
}

export interface PrivateMetadata {
  key: string;
  value: string;
}

export interface Warehouse {
  id: string;
  name: string;
  slug: string;
  email?: string;
  isPrivate: boolean;
  address?: Address;
  privateMetadata?: PrivateMetadata[];
}


export interface Channel {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  warehouses: Warehouse[];
}

export interface GetChannelsData {
  channels: Channel[];
}