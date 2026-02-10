import { gql } from '@apollo/client';

export const CHECKOUT_CREATE = `
  mutation CheckoutCreate($input: CheckoutCreateInput!) {
    checkoutCreate(input: $input) {
      checkout { 
        id 
        token
        availablePaymentGateways {
          id
          name
          config {
            field
            value
          }
        }
      }
      errors { field message }
    }
  }
`;

export const CHECKOUT_BY_ID = gql`
  query CheckoutById($id: ID!) {
    checkout(id: $id) {
      id
      token
      availablePaymentGateways {
        id
        name
        config {
          field
          value
        }
      }
    }
  }
`;

export const CHECKOUT_LINES_ADD = `
  mutation CheckoutLinesAdd($id: ID!, $lines: [CheckoutLineInput!]!) {
    checkoutLinesAdd(id: $id, lines: $lines) {
      checkout {
        id
        token
        totalPrice { gross { amount currency } }
        subtotalPrice { gross { amount currency } }
        lines {
          id
          quantity
          totalPrice { gross { amount currency } }
          variant {
            id
            name
            sku
            product {
              name
              thumbnail { url }
            }
            pricing {
              price { gross { amount currency } }
            }
          }
        }
      }
      errors { field message }
    }
  }
`;

export const CHECKOUT_LINES_UPDATE = `
  mutation CheckoutLinesUpdate($id: ID!, $lines: [CheckoutLineUpdateInput!]!) {
    checkoutLinesUpdate(id: $id, lines: $lines) {
      checkout {
        id
        token
        totalPrice { gross { amount currency } }
        subtotalPrice { gross { amount currency } }
        lines {
          id
          quantity
          totalPrice { gross { amount currency } }
          variant {
            id
            name
            sku
            product {
              name
              thumbnail { url }
            }
            pricing {
              price { gross { amount currency } }
            }
          }
        }
      }
      errors { field message }
    }
  }
`;

export const CHECKOUT_LINES_DELETE = `
  mutation CheckoutLinesDelete($id: ID!, $linesIds: [ID!]!) {
    checkoutLinesDelete(id: $id, linesIds: $linesIds) {
      checkout {
        id
        token
        totalPrice { gross { amount currency } }
        subtotalPrice { gross { amount currency } }
        lines {
          id
          quantity
          totalPrice { gross { amount currency } }
          variant {
            id
            name
            sku
            product {
              name
              thumbnail { url }
            }
            pricing {
              price { gross { amount currency } }
            }
          }
        }
      }
      errors { field message }
    }
  }
`;
