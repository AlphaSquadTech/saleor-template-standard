export const ADD_VOUCHER_TO_CHECKOUT = `
  mutation AddVoucherToCheckout($checkoutId: ID!, $promoCode: String!) {
    checkoutAddPromoCode(checkoutId: $checkoutId, promoCode: $promoCode) {
      checkout {
        id
        voucherCode
        discount {
          amount
          currency
        }
        totalPrice {
          gross {
            amount
            currency
          }
        }
        subtotalPrice {
          gross {
            amount
            currency
          }
        }
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const REMOVE_VOUCHER_FROM_CHECKOUT = `
  mutation RemoveVoucherFromCheckout($checkoutId: ID!, $promoCode: String!) {
    checkoutRemovePromoCode(checkoutId: $checkoutId, promoCode: $promoCode) {
      checkout {
        id
        voucherCode
        discount {
          amount
          currency
        }
        totalPrice {
          gross {
            amount
            currency
          }
        }
        subtotalPrice {
          gross {
            amount
            currency
          }
        }
      }
      errors {
        field
        code
        message
      }
    }
  }
`;