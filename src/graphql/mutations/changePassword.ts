import { gql } from '@apollo/client';

export const CHANGE_PASSWORD = gql`
  mutation ChangePassword($oldPassword: String!, $newPassword: String!) {
    passwordChange(oldPassword: $oldPassword, newPassword: $newPassword) {
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

export type ChangePasswordVars = { oldPassword: string; newPassword: string };
export type ChangePasswordData = {
  passwordChange: {
    user: { id: string; email: string } | null;
    errors: Array<{ field: string | null; message: string | null; code: string }>;
  } | null;
};
