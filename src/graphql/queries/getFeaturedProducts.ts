import { gql } from "@apollo/client";

export const GET_FEATURED_PRODUCTS = gql`
  query GetFeaturedProducts($slug: String!, $first: Int!) {
    collection(slug: $slug, channel: "default-channel") {
      products(first: $first) {
        edges {
          node {
            id
            name
            slug
            rating
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
            defaultVariant {
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
            }
            media {
              url
            }
            category {
              id
              name
            }
          }
        }
      }
    }
  }
`;
