import { gql } from "@apollo/client";

export const GET_DISCOUNT_OFFERS = gql`
  query GetDiscountOffers($first: Int!) {
      promotions(first: $first) {
        edges {
          node {
            id
            name
            description
            endDate
            startDate
            type
          }
        }
      }
  }
`;
