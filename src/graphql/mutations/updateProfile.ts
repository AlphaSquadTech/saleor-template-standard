import { gql } from '@apollo/client';

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($firstName: String!, $lastName: String!) {
    accountUpdate(input: { firstName: $firstName, lastName: $lastName }) {
      user { id firstName lastName email }
      errors { field message code }
    }
  }
`;

export type UpdateProfileVars = { firstName: string; lastName: string };
export type UpdateProfileData = {
  accountUpdate: {
    user: { id: string; firstName: string | null; lastName: string | null; email: string } | null;
    errors: Array<{ field: string | null; message: string | null; code: string }>;
  } | null;
};
