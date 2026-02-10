import { gql } from "@apollo/client"

export const GET_VEHICLE_MAKES = gql`
  query GetVehicleMakes {
    attribute(slug: "make") {
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