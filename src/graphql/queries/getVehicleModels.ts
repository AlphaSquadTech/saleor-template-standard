import { gql } from "@apollo/client"

export const GET_VEHICLE_MODELS = gql`
  query GetVehicleModels {
    attribute(slug: "model") {
      id
      name
      slug
      choices(first: 100) {
        edges {
          node {
            id
            name
            slug
            value
          }
        }
      }
    }
  }
`