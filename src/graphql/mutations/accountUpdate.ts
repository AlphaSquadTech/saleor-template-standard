export const ACCOUNT_UPDATE = `
  mutation AccountUpdate($input: AccountInput!) {
    accountUpdate(input: $input) {
      user {
        id
        metadata {
          key
          value
        }
      }
      errors {
        field
        message
      }
    }
  }
`;

export const ACCOUNT_METADATA_UPDATE = `
  mutation UpdateMetadata($id: ID!, $input: [MetadataInput!]!) {
    updateMetadata(id: $id, input: $input) {
      item {
        metadata {
          key
          value
        }
      }
      errors {
        field
        message
      }
    }
  }
`;