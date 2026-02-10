import { gql } from "@apollo/client";

export const TOKEN_REFRESH_MUTATION = gql`
  mutation TokenRefresh($refreshToken: String!) {
    tokenRefresh(refreshToken: $refreshToken) {
      token
      refreshToken
      user {
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
