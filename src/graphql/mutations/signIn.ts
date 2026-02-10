"use client";

import { gql } from "@apollo/client";

export const SIGN_IN_MUTATION = gql`
  mutation SignIn($email: String!, $password: String!) {
    tokenCreate(email: $email, password: $password) {
      token
      refreshToken
      user {
        id
        email
        firstName
        lastName
        isActive
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

export interface SignInVariables {
  email: string;
  password: string;
}

export interface SignInError {
  field: string | null;
  message: string;
  code?: string | null;
}

export interface SignInData {
  tokenCreate: {
    token: string | null;
    refreshToken: string | null;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      isActive: boolean;
    } | null;
    errors: SignInError[];
  };
}
