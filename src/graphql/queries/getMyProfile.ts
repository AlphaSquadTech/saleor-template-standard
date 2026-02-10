import { gql } from '@apollo/client';

export const GET_MY_PROFILE = gql`
  query GetMyProfile {
    me {
      id
      firstName
      lastName
      email
      isActive
    }
  }
`;

export type GetMyProfileData = {
  me: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    isActive: boolean;
  } | null;
};
