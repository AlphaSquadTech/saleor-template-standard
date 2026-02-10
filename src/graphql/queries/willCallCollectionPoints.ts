import { gql } from "@apollo/client";

export const GET_CHECKOUT_COLLECTION_POINTS = gql`
  query GetCheckoutCollectionPoints($checkoutId: ID!) {
    checkout(id: $checkoutId) {
      id
      availableCollectionPoints {
        id
        name
        clickAndCollectOption
        isPrivate
        address {
          streetAddress1
          city
          postalCode
          countryArea
          country {
            code
            country
          }
        }
      }
    }
  }
`;

export interface CollectionPointAddress {
  streetAddress1: string;
  city: string;
  postalCode: string;
  countryArea: string;
  country: {
    code: string;
    country: string;
  };
}

export interface CollectionPoint {
  id: string;
  name: string;
  clickAndCollectOption: string;
  isPrivate: boolean;
  address: CollectionPointAddress;
}

export interface GetCheckoutCollectionPointsData {
  checkout: {
    id: string;
    availableCollectionPoints: CollectionPoint[];
  };
}

export interface GetCheckoutCollectionPointsVars {
  checkoutId: string;
}