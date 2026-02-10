import { gql } from "@apollo/client"

export const GET_VEHICLE_YEARS = gql`
  query GetVehicleYears {
    attribute(slug: "year") {
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