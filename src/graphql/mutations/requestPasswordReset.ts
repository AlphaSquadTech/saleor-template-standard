"use client";

import { gql } from "@apollo/client";

export const REQUEST_PASSWORD_RESET_MUTATION = gql`
  mutation RequestPasswordReset($email: String!, $redirectUrl: String!) {
    requestPasswordReset(email: $email, redirectUrl: $redirectUrl) {
      errors {
        field
        message
        code
      }
    }
  }
`;

export interface RequestPasswordResetVariables {
  email: string;
  redirectUrl: string;
}

export interface RequestPasswordResetError {
  field: string | null;
  message: string;
  code?: string | null;
}

export interface RequestPasswordResetData {
  requestPasswordReset: {
    errors: RequestPasswordResetError[];
  };
}
