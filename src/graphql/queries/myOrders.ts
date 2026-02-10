import { gql } from '@apollo/client';

export const MY_ORDERS = gql`
  query MyOrders {
    me {
      id
      email
      orders(first: 10) {
        edges {
          node {
            id
            number
            created
            status
            token
            total {
              gross { amount currency }
            }
          }
        }
      }
    }
  }
`;

export type Money = { amount: number; currency: string };
export type OrderSummary = {
  id: string;
  number: string | null;
  created: string;
  status: string;
  token: string;
  total: { gross: Money };
};
export type MyOrdersData = {
  me: { id: string; email: string; orders: { edges: { node: OrderSummary }[] } } | null;
};
