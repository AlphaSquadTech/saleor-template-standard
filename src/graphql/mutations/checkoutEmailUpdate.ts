export const CHECKOUT_EMAIL_UPDATE = `
  mutation CheckoutEmailUpdate($checkoutId: ID!, $email: String!) {
    checkoutEmailUpdate(checkoutId: $checkoutId, email: $email) {
      checkout {
        id
        email
      }
      errors {
        field
        message
        code
      }
    }
  }
`;
