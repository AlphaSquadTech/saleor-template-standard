export const CHECKOUT_SHIPPING_ADDRESS_UPDATE = `
  mutation CheckoutShippingAddressUpdate($id: ID!, $shippingAddress: AddressInput!) {
    checkoutShippingAddressUpdate(id: $id, shippingAddress: $shippingAddress) {
      checkout { id }
      errors { field message }
    }
  }
`;

export const CHECKOUT_BILLING_ADDRESS_UPDATE = `
  mutation CheckoutBillingAddressUpdate($id: ID!, $billingAddress: AddressInput!) {
    checkoutBillingAddressUpdate(id: $id, billingAddress: $billingAddress) {
      checkout { id }
      errors { field message }
    }
  }
`;

export const CHECKOUT_DELIVERY_METHOD_UPDATE = `
  mutation CheckoutDeliveryMethodUpdate($id: ID!, $deliveryMethodId: ID!) {
    checkoutDeliveryMethodUpdate(id: $id, deliveryMethodId: $deliveryMethodId) {
      checkout { 
        id
        totalPrice {
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
        shippingPrice {
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
      errors { field message }
    }
  }
`;

export const ACCOUNT_ADDRESS_CREATE = `
  mutation AddAddress($input: AddressInput!) {
    accountAddressCreate(input: $input) {
      address { id }
      errors { field message }
    }
  }
`;

export const ACCOUNT_SET_DEFAULT_ADDRESS = `
  mutation SetDefaultAddress($id: ID!, $type: AddressTypeEnum!) {
    accountSetDefaultAddress(id: $id, type: $type) {
      user { id }
      errors { field message }
    }
  }
`;

export const CHECKOUT_PAYMENT_CREATE = `
  mutation CheckoutPaymentCreate($checkoutId: ID!, $gateway: String!, $token: String!) {
    checkoutPaymentCreate(
      checkoutId: $checkoutId
      input: { gateway: $gateway, token: $token }
    ) {
      payment { 
        id 
        chargeStatus
        gateway
        isActive
        created
        capturedAmount { amount currency }
        total { amount currency }
      }
      errors { field message code }
    }
  }
`;

export const CHECKOUT_COMPLETE = `
  mutation CheckoutComplete($checkoutId: ID!) {
    checkoutComplete(checkoutId: $checkoutId) {
      order { id userEmail isPaid chargeStatus paymentStatus }
      errors { field message }
    }
  }
`;
