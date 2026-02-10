export const GET_ALL_CATEGORIES_WITH_PRODUCTS = `
  query GetAllCategoriesWithProducts($first: Int!, $productsFirst: Int!, $channel: String!) {
    categories(first: $first) {
      edges {
        node {
          id
          name
          slug
          parent { id name }
          children(first: 10) {
            edges {
              node {
                id
                name
                slug
                products(first: $productsFirst, channel: $channel) {
                  edges { node { id name slug } }
                }
              }
            }
          }
          products(first: $productsFirst, channel: $channel) {
            edges { node { id name slug } }
          }
        }
      }
    }
  }
`;
