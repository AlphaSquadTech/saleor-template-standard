"use client";

import { gql } from "@apollo/client";

export const REGISTER_ACCOUNT_MUTATION = gql`
  mutation RegisterAccount(
    $email: String!
    $password: String!
    $firstName: String
    $lastName: String
    $redirectUrl: String
  ) {
    accountRegister(
      input: {
        email: $email
        password: $password
        redirectUrl: $redirectUrl
        firstName: $firstName
        lastName: $lastName
      }
    ) {
      user {
        id
        email
        firstName
        lastName
        isActive
      }
      requiresConfirmation
      errors {
        field
        message
        code
      }
    }
  }
`;

export interface RegisterAccountVariables {
  email: string;
  password: string;
  firstName?: string | null;
  lastName?: string | null;
  redirectUrl?: string | null;
}

export interface RegisterAccountError {
  field: string | null;
  message: string;
  code?: string | null;
}

export interface RegisterAccountData {
  accountRegister: {
    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      isActive: boolean;
    } | null;
    requiresConfirmation: boolean;
    errors: RegisterAccountError[];
  };
}
