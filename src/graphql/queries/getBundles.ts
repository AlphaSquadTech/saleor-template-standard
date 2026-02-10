import { gql } from "@apollo/client";

export const GET_BUNDLES = gql`
  query GetBundles($channel: String = "default-channel", $first: Int = 10) {
    collections(
      first: 10
      channel: $channel
      filter: { metadata: [{ key: "bundle", value: "true" }] }
    ) {
      edges {
        node {
          id
          name
          slug
          metadata {
            key
            value
          }
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
                    start { gross { amount currency } }
                    stop  { gross { amount currency } }
                  }
                  discount { gross { amount currency } }
                }
                media { url }
                category { id name }
              }
            }
          }
        }
      }
    }
  }
`;
