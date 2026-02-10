import { gql } from '@apollo/client';

export const CHECKOUT_PAYMENT_CREATE = gql`
  mutation CheckoutPaymentCreate(
  $checkoutId: ID!
  $input: PaymentInput!
) {
  checkoutPaymentCreate(
    checkoutId: $checkoutId
    input: $input
  ) {
    payment {
      id
      gateway
      token
      creditCard {
        brand
        firstDigits
        lastDigits
        expMonth
        expYear
      }
      total {
        amount
        currency
      }
      capturedAmount {
        amount
        currency
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

export interface PaymentInput {
  gateway: string;
  token?: string;
  amount?: number;
  returnUrl?: string;
  storePaymentMethod?: boolean;
}

export interface CheckoutPaymentCreateVars {
  checkoutId: string;
  input: PaymentInput;
}

export interface CheckoutPaymentCreateData {
  checkoutPaymentCreate: {
    payment: {
      id: string;
      gateway: string;
      token: string | null;
      creditCard: {
        brand: string;
        firstDigits: string;
        lastDigits: string;
        expMonth: number;
        expYear: number;
      } | null;
      total: {
        amount: number;
        currency: string;
      };
      capturedAmount: {
        amount: number;
        currency: string;
      };
    } | null;
    errors: Array<{
      field: string | null;
      message: string;
      code: string;
    }>;
  };
}