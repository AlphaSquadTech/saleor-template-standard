import { gql } from '@apollo/client';

export const CHECKOUT_COMPLETE = gql`
  mutation CheckoutComplete($checkoutId: ID!) {
    checkoutComplete(checkoutId: $checkoutId) {
      order {
        id
        number
        status
        total {
          gross {
            amount
            currency
          }
        }
        user {
          email
        }
        lines {
          id
          productName
          variantName
          quantity
          totalPrice {
            gross {
              amount
              currency
            }
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

export interface CheckoutCompleteVars {
  checkoutId: string;
}

export interface CheckoutCompleteData {
  checkoutComplete: {
    order: {
      id: string;
      number: string;
      status: string;
      total: {
        gross: {
          amount: number;
          currency: string;
        };
      };
      user?: {
        email: string;
      };
      lines: Array<{
        id: string;
        productName: string;
        variantName: string;
        quantity: number;
        totalPrice: {
          gross: {
            amount: number;
            currency: string;
          };
        };
      }>;
    } | null;
    errors: Array<{
      field: string | null;
      message: string;
      code: string;
    }>;
  };
}