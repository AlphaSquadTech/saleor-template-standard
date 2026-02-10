export const GET_CHECKOUT_TOTAL = `
  query GetCheckoutTotal($id: ID!) {
    checkout(id: $id) {
      id
      totalPrice { gross { amount currency } }
    }
  }
`;

export const GET_CHECKOUT_DETAILS = `
  query GetCheckoutDetails($id: ID!) {
    checkout(id: $id) {
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
      deliveryMethod {
        ... on ShippingMethod {
          id
          name
          price { 
            amount 
            currency 
          }
        }
      }
      lines {
        id
        quantity
        totalPrice { 
          gross { 
            amount 
            currency 
          } 
        }
        variant {
          id
          name
          pricing {
            price { 
              gross { 
                amount 
                currency 
              } 
            }
            priceUndiscounted { 
              gross { 
                amount 
                currency 
              } 
            }
          }
          product {
            id
            name
            thumbnail { 
              url 
            }
            pricing {
              onSale
              priceRange {
                start { 
                  gross { 
                    amount 
                    currency 
                  } 
                }
                stop { 
                  gross { 
                    amount 
                    currency 
                  } 
                }
              }
              discount { 
                gross { 
                  amount 
                  currency 
                } 
              }
            }
            metadata {
              key
              value
            }
          }
        }
      }
    }
  }
`;


export const GET_CHECKOUT_SHIPPING_METHODS = `
  query GetCheckoutShippingMethods($id: ID!) {
    checkout(id: $id) {
      id
      availableShippingMethods {
        id
        name
        price { amount currency }
        minimumDeliveryDays
        maximumDeliveryDays
      }
    }
  }
`;

export const GET_USER_ACTIVE_CHECKOUT = `
  query GetUserActiveCheckout {
    me {
      id
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
    }
  }
`;

export const GET_PAYMENT_GATEWAYS = `
  query GetPaymentGateways($checkoutId: ID!) {
    checkout(id: $checkoutId) {
      availablePaymentGateways {
        id
        name
        config {
          field
          value
        }
        currencies
      }
    }
  }
`;
