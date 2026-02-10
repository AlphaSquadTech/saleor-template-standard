export const GET_USER_WITH_CHECKOUT = `
  query GetUserWithCheckout {
    me {
      id
      firstName
      lastName
      email
      metadata {
        key
        value
      }
    }
  }
`;

export interface UserWithCheckoutData {
  me: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    metadata: Array<{
      key: string;
      value: string;
    }>;
  } | null;
}