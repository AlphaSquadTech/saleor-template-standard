"use client";

import { gql } from "@apollo/client";

export const SET_PASSWORD_MUTATION = gql`
  mutation SetNewPassword($email: String!, $token: String!, $password: String!) {
    setPassword(email: $email, token: $token, password: $password) {
      token
      refreshToken
      user {
        id
        email
        firstName
        lastName
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

export interface SetPasswordVariables {
  email: string;
  token: string;
  password: string;
}

export interface SetPasswordError {
  field: string | null;
  message: string;
  code?: string | null;
}

export interface SetPasswordData {
  setPassword: {
    token: string | null;
    refreshToken: string | null;
    user: {
      id: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
    } | null;
    errors: SetPasswordError[];
  };
}
