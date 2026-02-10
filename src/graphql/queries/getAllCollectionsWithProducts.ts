export const GET_ALL_COLLECTIONS_WITH_PRODUCTS = `
  query GetAllCollectionsWithProducts($first: Int!, $productsFirst: Int!) {
    collections(first: $first) {
      edges {
        node {
          id
          name
          slug
          products(first: $productsFirst) {
            edges { node { id name slug } }
          }
        }
      }
    }
  }
`;
