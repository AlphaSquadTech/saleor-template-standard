import { gql } from '@apollo/client';

export const CHECKOUT_CUSTOMER_ATTACH = gql`
  mutation CheckoutCustomerAttach($checkoutId: ID!, $customerId: ID!) {
    checkoutCustomerAttach(checkoutId: $checkoutId, customerId: $customerId) {
      checkout {
        id
        token
        email
        user {
          id
          email
          firstName
          lastName
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

export interface CheckoutCustomerAttachVars {
  checkoutId: string;
  customerId: string;
}

export interface CheckoutCustomerAttachData {
  checkoutCustomerAttach: {
    checkout: {
      id: string;
      token: string;
      email: string;
      user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
      } | null;
    } | null;
    errors: Array<{
      field: string | null;
      message: string | null;
      code: string | null;
    }>;
  };
}