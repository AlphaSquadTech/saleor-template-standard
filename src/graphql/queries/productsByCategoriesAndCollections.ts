export const PRODUCTS_BY_CATEGORIES_AND_COLLECTIONS = `
  query ProductsByCategoriesAndCollections(
    $categoryIds: [ID!],
    $collectionIds: [ID!],
    $channel: String!,
    $first: Int!,
    $sortField: ProductOrderField!,
    $sortDirection: OrderDirection!,
    $after: String
  ) {
    products(
      filter: { categories: $categoryIds, collections: $collectionIds },
      channel: $channel,
      first: $first,
      after: $after,
      sortBy: { field: $sortField, direction: $sortDirection }
    ) {
      totalCount
      pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      edges {
        node {
          id
          name
          slug
          description
          category { id name }
          collections { id name }
          media { id url alt }
          pricing {
            priceRange {
              start { gross { amount currency } }
              stop { gross { amount currency } }
            }
          }
        }
      }
    }
  }
`;
