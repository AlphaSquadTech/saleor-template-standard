import { gql } from "@apollo/client";

export const CHECKOUT_DELIVERY_METHOD_UPDATE_WILL_CALL = gql`
  mutation CheckoutDeliveryMethodUpdateWillCall($id: ID!, $deliveryMethodId: ID!) {
    checkoutDeliveryMethodUpdate(
      id: $id
      deliveryMethodId: $deliveryMethodId
    ) {
      checkout {
        id
        deliveryMethod {
          __typename
          ... on Warehouse {
            id
            name
          }
          ... on ShippingMethod {
            id
            name
          }
        }
        subtotalPrice {
          gross {
            amount
            currency
          }
          net {
            amount
            currency
          }
          tax {
            amount
            currency
          }
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

export interface WillCallDeliveryMethodUpdateData {
  checkoutDeliveryMethodUpdate: {
    checkout: {
      id: string;
      deliveryMethod: {
        __typename: "Warehouse" | "ShippingMethod";
        id: string;
        name: string;
      } | null;
      subtotalPrice: {
        gross: {
          amount: number;
          currency: string;
        };
        net: {
          amount: number;
          currency: string;
        };
        tax: {
          amount: number;
          currency: string;
        };
      };
    };
    errors: Array<{
      field: string | null;
      message: string;
      code: string;
    }>;
  };
}

export interface WillCallDeliveryMethodUpdateVars {
  id: string;
  deliveryMethodId: string;
}