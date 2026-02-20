const BASE_URL = process.env.NEXT_PUBLIC_SEARCH_URL || "";
const PARTSLOGIC_URL = process.env.NEXT_PUBLIC_PARTSLOGIC_URL || "";
const TENANT =
  process.env.NEXT_PUBLIC_TENANT_NAME == "fuelab"
    ? "aet"
    : process.env.NEXT_PUBLIC_TENANT_NAME;

/* ----------------- Search + Product Types ----------------- */
export type Category = {
  id: number | string;
  name: string;
  description?: string | null;
  image?: number | null;
  image_id?: number | null;
  image_url?: string | null;
  product_count?: number;
  active_product_count?: number;
  children?: Category[];
  priority?: number;
};
export type Brand = { name: string; product_count: number; slug: string };
export type YMMCombinations = {
  years: Array<{ year: number; product_count: number }>;
  makes: Array<{ name: string; product_count: number; slug: string }>;
  models: Array<{ name: string; product_count: number; slug: string }>;
};

// YMM API specific types
export type YMMYear = { year: number; product_count: number };
export type YMMMake = { id: number; value: string; product_count: number };
export type YMMModel = { id: number; value: string; product_count: number };
export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  price_max: number;
  currency: string;
  brand: string;
  categories: string[];
  sku: string[];
  in_stock: boolean;
  stock_quantity: number;
  rating: number;
  image_url: string;
  images: string[];
  tenant_id: string;
  tenant_name: string;
  years: string[];
  makes: string[];
  models: string[];
  slug?: string;
};
export type ProductDetail = Product & {
  all_images: string[];
  availability_status: string;
  available_in_tenants: string[];
  category_descriptions: Record<string, string>;
  category_hierarchy: Array<{
    id: number | string;
    title: string;
    description: string | null;
    image_id: number | null;
    parent_title: string | null;
  }>;
  category_images: Record<string, string>;
  category_metadata: Array<{
    id: number | string;
    name: string;
    description: string | null;
    image_id: number | null;
    image_url: string | null;
    parent_name: string | null;
  }>;
  collections: Array<{ id: string; name: string }>;
  created_at: string;
  created_at_timestamp: number;
  cross_tenant_availability: boolean;
  description_plaintext: string;
  is_primary_tenant: boolean;
  media_url: string;
  parent_categories: string[];
  price_min: number;
  product_type: string;
  raw_availability: string;
  search_document: string;
  thumbnail_url: string;
  updated_at: string;
  variant_count: number;
  variant_names: string[];
};
export type ProductsResponse = {
  products: Product[];
  total_products: number;
  search_time_ms: number;
  filters: {
    categories: Array<{ name: string; count: number }>;
    brand: Array<{ name: string; count: number }>;
    years: Array<{ name: string; count: number }>;
    makes: Array<{ name: string; count: number }>;
    models: Array<{ name: string; count: number }>;
    price_min: Array<{ name: string; count: number }>;
    in_stock: Array<{ name: string; count: number }>;
  };
  pagination: { current_page: number; per_page: number; total_pages: number };
  tenant: { id: string; name: string };
};

/* ----------------- GraphQL Types ----------------- */
export type GraphQLProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: {
    id: string;
    name: string;
  } | null;
  productType: {
    id: string;
    name: string;
  } | null;
  media: Array<{
    id: string;
    url: string;
    alt: string;
  }>;
  pricing: {
    priceRange: {
      start: {
        gross: {
          amount: number;
          currency: string;
        };
      };
      stop: {
        gross: {
          amount: number;
          currency: string;
        };
      };
    };
  } | null;
};

export type GraphQLProductsResponse = {
  products: {
    totalCount: number;
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      endCursor: string | null;
      startCursor: string | null;
    };
    edges: Array<{
      cursor: string;
      node: GraphQLProduct;
    }>;
  };
};

export type GraphQLCategory = {
  id: string;
  name: string;
  slug: string;
  level: number;
  parent: {
    id: string;
    name: string;
  } | null;
  backgroundImage: {
    url: string;
    alt: string | null;
  } | null;
  products: {
    totalCount: number;
  };
};

export type GraphQLCategoriesResponse = {
  categories: {
    totalCount: number;
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor: string | null;
      endCursor: string | null;
    };
    edges: Array<{
      node: GraphQLCategory;
    }>;
  };
};

export type GraphQLProductType = {
  id: string;
  name: string;
  slug: string;
  hasVariants: boolean;
  isShippingRequired: boolean;
  kind: string;
  metadata: Array<{
    key: string;
    value: string;
  }>;
  products: {
    totalCount: number;
  };
};

export type GraphQLProductTypesResponse = {
  productTypes: {
    totalCount: number;
    edges: Array<{
      node: GraphQLProductType;
    }>;
  };
};

export type GlobalSearchProduct = {
  id: string;
  name: string;
  slug: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
  } | null;
  thumbnail: {
    url: string;
    alt: string | null;
  } | null;
};

export type GlobalSearchCategory = {
  id: string;
  name: string;
  slug: string;
  level: number;
  parent: {
    id: string;
    name: string;
  } | null;
  backgroundImage: {
    url: string;
    alt: string | null;
  } | null;
  products: {
    totalCount: number;
  };
};

export type GlobalSearchCollection = {
  id: string;
  name: string;
  slug: string;
  backgroundImage: {
    url: string;
    alt: string | null;
  } | null;
  products: {
    totalCount: number;
  };
};

export type GlobalSearchProductType = {
  id: string;
  name: string;
  slug: string;
  hasVariants: boolean;
};

export type GlobalSearchResponse = {
  products?: {
    edges: Array<{
      node: GlobalSearchProduct;
    }>;
  };
  categories?: {
    edges: Array<{
      node: GlobalSearchCategory;
    }>;
  };
  collections?: {
    edges: Array<{
      node: GlobalSearchCollection;
    }>;
  };
  productTypes?: {
    edges: Array<{
      node: GlobalSearchProductType;
    }>;
  };
};

// PartsLogic Search Products API Types

export type PLSearchProduct = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  primary_image?: string;
  category_id?: string;
  category_name?: string;
  category_slug?: string;
  brand_id?: string;
  brand_name?: string;
  brand_slug?: string;
  category: {
    id: string;
    name: string;
  } | null;
  productType?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  thumbnail?: {
    url: string;
    alt: string;
  } | null;
  pricing?: {
    priceRange: {
      start: {
        gross: {
          amount: number;
          currency: string;
        };
      };
      stop: {
        gross: {
          amount: number;
          currency: string;
        };
      };
    };
  } | null;
  price_min?: number;
  price_max?: number;
  default_variant_price?: number;
  currency?: string;
  media?: Array<{
    id: number;
    url: string;
    alt: string;
  }>;
  collection_ids?: number[];
  collection_names?: string[];
  skus?: string[];
  in_stock?: boolean;
  total_quantity?: number;
  wsm_id?: string;
  rating?: number;
  created_at?: number;
  updated_at?: number;
  category_path?: string[];
  category_slugs?: string[] | null;
  category_ids?: number[];
  category_images?: string[] | null;
  image_count?: number;
};

export type CategoryAPIType = {
  id: string;
  image: string;
  name: string;
  slug: string;
};

export type PLSearchCategory = {
  id: string;
  value: string;
  slug: string;
  count: number;
  media?: string;
};

export type PLSearchBrand = {
  id: string;
  value: string;
  count: number;
  slug: string;
  media?: string;
};

export type PLSearchProductsResponse = {
  products: PLSearchProduct[];
  facets: {
    brands: PLSearchBrand[];
    categories: PLSearchCategory[];
    price_ranges: Array<{ min: number; max: number; count: number }> | null;
    years: Array<{ value: string; count: number }>;
    makes: Array<{ value: string; count: number }>;
    models: Array<{ value: string; count: number }>;
  };
  pagination: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
};

/* ----------------- REST helper ----------------- */
async function httpGet<T>(pathWithQuery: string): Promise<T> {
  if (!BASE_URL) throw new Error("Missing NEXT_PUBLIC_SEARCH_URL");
  const path = pathWithQuery.startsWith("/")
    ? pathWithQuery
    : `/${pathWithQuery}`;
  const url = `${BASE_URL}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    throw new Error(
      `GET ${url} network error: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as { message?: string };
      msg = j?.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(`GET ${url} failed: ${res.status} ${msg}`);
  }
  return res.json() as Promise<T>;
}

/* ----------------- PartsLogic API helper ----------------- */
async function partsLogicGet<T>(pathWithQuery: string): Promise<T> {
  if (!PARTSLOGIC_URL) throw new Error("Missing NEXT_PUBLIC_PARTSLOGIC_URL");
  const path = pathWithQuery.startsWith("/")
    ? pathWithQuery
    : `/${pathWithQuery}`;
  const url = `${PARTSLOGIC_URL}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  } catch (e) {
    throw new Error(
      `GET ${url} network error: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as { message?: string };
      msg = j?.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(`GET ${url} failed: ${res.status} ${msg}`);
  }
  return res.json() as Promise<T>;
}
function qp(params: Record<string, string | number | boolean | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === "") return;
    sp.set(k, String(v));
  });
  return sp.toString();
}

/* ----------------- GraphQL helper ----------------- */
function normalizeGraphqlUrl(raw: string | undefined) {
  if (!raw) throw new Error("NEXT_PUBLIC_API_URL is not configured");
  const trimmed = raw.trim();
  return /\/graphql\/?$/.test(trimmed.toLowerCase())
    ? trimmed
    : trimmed.replace(/\/+$/, "") + "/graphql";
}

async function graphqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  scope = "graphql"
): Promise<T> {
  const url = normalizeGraphqlUrl(process.env.NEXT_PUBLIC_API_URL);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[${scope}] network error`, msg, { url, variables });
    throw new Error(`${scope}: network error: ${msg}`);
  }

  const text = await res.text();
  if (!res.ok) {
    console.error(`[${scope}] HTTP ${res.status}`, text.slice(0, 500));
    throw new Error(`${scope}: HTTP ${res.status}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error(`[${scope}] invalid JSON`, text.slice(0, 500));
    throw new Error(`${scope}: invalid JSON`);
  }

  const p = parsed as { data?: T; errors?: Array<{ message?: string }> };
  if (p.errors?.length) {
    console.error(`[${scope}] GraphQL errors`, p.errors);
    throw new Error(`${scope}: ${p.errors[0]?.message || "GraphQL error"}`);
  }
  if (!p.data) {
    console.error(`[${scope}] missing data`, parsed);
    throw new Error(`${scope}: invalid response (no data)`);
  }
  return p.data;
}

const ORDER_QUERY = `
  query Order($id: ID!) {
    order(id: $id) {
      id
      number
      created
      status
      paymentStatus
      total {
        gross { amount currency }
      }
      lines {
        id
        productName
        variantName
        quantity
        thumbnail { url }
        totalPrice {
          gross { amount currency }
        }
      }
    }
  }
`;

const PRODUCTS_BY_CATEGORIES_AND_PRODUCT_TYPES_QUERY = `
  query ProductsByCategoriesAndProductTypes(
    $categoryIds: [ID!], 
    $productTypeIds: [ID!], 
    $channel: String!,
    $first: Int!,
    $after: String,
    $sortField: ProductOrderField!,
    $sortDirection: OrderDirection!
  ) {
    products(
      filter: {
        categories: $categoryIds
        productTypes: $productTypeIds
      }, 
      channel: $channel,
      first: $first,
      after: $after,
      sortBy: {
        field: $sortField,
        direction: $sortDirection
      }
    ) {
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        node {
          id
          name
          slug
          description
          category {
            id
            name
          }
          productType {
            id
            name
          }
          media {
            id
            url
            alt
          }
          pricing {
            priceRange {
              start {
                gross {
                  amount
                  currency
                }
              }
              stop {
                gross {
                  amount
                  currency
                }
              }
            }
          }
        }
      }
    }
  }
`;

const GET_ALL_CATEGORIES_QUERY = `
  query GetAllCategories(
    $channel: String!
    $first: Int!
    $after: String
    $sortBy: CategorySortingInput
  ) {
    categories(
      first: $first
      after: $after
      sortBy: $sortBy
    ) {
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          name
          slug
          level
          parent {
            id
            name
          }
          backgroundImage {
            url
            alt
          }
          products(channel: $channel) {
            totalCount
          }
        }
      }
    }
  }
`;

const GET_CATEGORY_BY_SLUG_QUERY = `
  query GetCategoryBySlug($slug: String!, $channel: String!) {
    categories(first: 1, filter: { search: $slug }) {
      edges {
        node {
          id
          name
          slug
          level
          parent {
            id
            name
          }
          backgroundImage {
            url
            alt
          }
          products(channel: $channel) {
            totalCount
          }
        }
      }
    }
  }
`;

const GET_ALL_PRODUCT_TYPES_QUERY = `
  query GetAllProductTypesWithCounts($first: Int!) {
    productTypes(first: $first) {
      totalCount
      edges {
        node {
          id
          name
          slug
          hasVariants
          isShippingRequired
          kind
          metadata {
            key
            value
          }
          products(channel: "default-channel") {
            totalCount
          }
        }
      }
    }
  }
`;

const GET_PRODUCTS_BY_CATEGORY_QUERY = `
  query GetProductsByCategory(
    $categoryIds: [ID!]
    $channel: String!
    $first: Int!
    $after: String
    $search: String
  ) {
    products(
      filter: { 
        categories: $categoryIds
      }
      search: $search
      channel: $channel
      first: $first
      after: $after
    ) {
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        endCursor
        startCursor
      }
      edges {
        cursor
        node {
          id
          name
          slug
          description
          category {
            id
            name
          }
          productType {
            id
            name
          }
          media {
            id
            url
            alt
          }
          pricing {
            priceRange {
              start {
                gross {
                  amount
                  currency
                }
              }
              stop {
                gross {
                  amount
                  currency
                }
              }
            }
          }
        }
      }
    }
  }
`;

const GET_PRODUCTS_BY_PRODUCT_TYPE_QUERY = `
  query GetProductsByProductType(
    $productTypeIds: [ID!]
    $channel: String!
    $first: Int!
    $after: String
    $search: String
  ) {
    products(
      filter: { 
        productTypes: $productTypeIds
      }
      search: $search
      channel: $channel
      first: $first
      after: $after
    ) {
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        endCursor
        startCursor
      }
      edges {
        cursor
        node {
          id
          name
          slug
          description
          category {
            id
            name
          }
          productType {
            id
            name
          }
          media {
            id
            url
            alt
          }
          pricing {
            priceRange {
              start {
                gross {
                  amount
                  currency
                }
              }
              stop {
                gross {
                  amount
                  currency
                }
              }
            }
          }
        }
      }
    }
  }
`;

const GLOBAL_SEARCH_STOREFRONT_QUERY = `
  query GlobalSearchStorefront(
    $query: String!
    $channel: String!
    $includeProducts: Boolean!
    $includeCategories: Boolean!
    $includeCollections: Boolean!
    $includeProductTypes: Boolean!
  ) {
    products(first: 10, channel: $channel, filter: { search: $query }) @include(if: $includeProducts) {
      edges {
        node {
          id
          name
          slug
          updatedAt
          category {
            id
            name
          }
          thumbnail(size: 64) {
            url
            alt
          }
        }
      }
    }

    categories(first: 10, filter: { search: $query }) @include(if: $includeCategories) {
      edges {
        node {
          id
          name
          slug
          level
          parent {
            id
            name
          }
          backgroundImage(size: 64) {
            url
            alt
          }
          products(first: 1, channel: $channel) {
            totalCount
          }
        }
      }
    }

    collections(first: 10, channel: $channel, filter: { search: $query }) @include(if: $includeCollections) {
      edges {
        node {
          id
          name
          slug
          backgroundImage(size: 64) {
            url
            alt
          }
          products(first: 1) {
            totalCount
          }
        }
      }
    }

    productTypes(first: 10, filter: { search: $query }) @include(if: $includeProductTypes) {
      edges {
        node {
          id
          name
          slug
          hasVariants
        }
      }
    }
  }
`;

type OrderLine = {
  id: string;
  productName: string;
  variantName: string;
  quantity: number;
  thumbnail: { url: string };
  totalPrice: { gross: { amount: number; currency: string } };
};
type Order = {
  id: string;
  number: string;
  created: string;
  status: string;
  paymentStatus: string;
  total: { gross: { amount: number; currency: string } };
  lines: OrderLine[];
};

async function getOrderById({ orderId }: { orderId: string }) {
  const data = await graphqlFetch<{ order: Order | null }>(
    ORDER_QUERY,
    { id: orderId },
    "order"
  );
  if (!data.order) throw new Error("Order not found");
  return data.order;
}

async function getProductsByCategoriesAndProductTypes({
  categoryIds,
  productTypeIds,
  channel,
  first,
  after,
  sortField = "DATE",
  sortDirection = "ASC",
}: {
  categoryIds?: string[];
  productTypeIds?: string[];
  channel: string;
  first: number;
  after?: string;
  sortField?: "PRICE" | "DATE" | "NAME";
  sortDirection?: "ASC" | "DESC";
}) {
  // Pass null for empty arrays so GraphQL doesn't apply those filters
  const variables: Record<string, unknown> = {
    categoryIds: categoryIds?.length ? categoryIds : null,
    productTypeIds: productTypeIds?.length ? productTypeIds : null,
    channel,
    first,
    sortField,
    sortDirection,
  };

  if (after) {
    variables.after = after;
  }

  const data = await graphqlFetch<GraphQLProductsResponse>(
    PRODUCTS_BY_CATEGORIES_AND_PRODUCT_TYPES_QUERY,
    variables,
    "products"
  );
  return data;
}

async function getGraphQLCategories({
  channel,
  first = 100,
  after,
}: {
  channel: string;
  first?: number;
  after?: string;
}) {
  const variables: Record<string, unknown> = {
    channel,
    first,
    sortBy: {
      field: "PRODUCT_COUNT",
      direction: "DESC",
    },
  };

  if (after) {
    variables.after = after;
  }

  const data = await graphqlFetch<GraphQLCategoriesResponse>(
    GET_ALL_CATEGORIES_QUERY,
    variables,
    "categories"
  );
  return data;
}

async function getCategoryBySlug({
  slug,
  channel,
}: {
  slug: string;
  channel: string;
}) {
  // First try the search query for quick lookup
  const searchData = await graphqlFetch<{
    categories: {
      edges: Array<{
        node: GraphQLCategory;
      }>;
    };
  }>(GET_CATEGORY_BY_SLUG_QUERY, { slug, channel }, "category");

  // If found via search and slug matches exactly, return it
  const searchResult = searchData.categories.edges[0]?.node;
  if (searchResult && searchResult.slug === slug) {
    return searchResult;
  }

  // If not found or slug doesn't match exactly, paginate through all categories
  let hasNextPage = true;
  let after: string | null = null;
  const batchSize = 100;

  while (hasNextPage) {
    const variables: Record<string, unknown> = {
      channel,
      first: batchSize,
    };

    if (after) {
      variables.after = after;
    }

    const batchData = await graphqlFetch<GraphQLCategoriesResponse>(
      GET_ALL_CATEGORIES_QUERY,
      variables,
      "categories"
    );

    // Search for exact slug match in this batch
    const foundCategory = batchData.categories.edges.find(
      (edge) => edge.node.slug === slug
    );

    if (foundCategory) {
      return foundCategory.node;
    }

    // Check if there are more pages
    hasNextPage = batchData.categories.pageInfo.hasNextPage;
    after = batchData.categories.pageInfo.endCursor;
  }

  return null;
}

async function getGraphQLProductTypes({ first = 100 }: { first?: number }) {
  const data = await graphqlFetch<GraphQLProductTypesResponse>(
    GET_ALL_PRODUCT_TYPES_QUERY,
    {
      first,
    },
    "productTypes"
  );
  return data;
}

async function getProductsByCategory({
  categoryIds,
  channel,
  first = 100,
  after,
  search,
}: {
  categoryIds: string[];
  channel: string;
  first?: number;
  after?: string;
  search?: string;
}) {
  // Prepare variables, excluding null/undefined values
  const variables: Record<string, unknown> = {
    categoryIds,
    channel,
    first,
  };

  if (after) {
    variables.after = after;
  }

  if (search && search.trim()) {
    variables.search = search;
  }

  const data = await graphqlFetch<GraphQLProductsResponse>(
    GET_PRODUCTS_BY_CATEGORY_QUERY,
    variables,
    "products"
  );
  return data;
}

async function getProductsByProductType({
  productTypeIds,
  channel,
  first = 100,
  after,
  search,
}: {
  productTypeIds: string[];
  channel: string;
  first?: number;
  after?: string;
  search?: string;
}) {
  // Prepare variables, excluding null/undefined values
  const variables: Record<string, unknown> = {
    productTypeIds,
    channel,
    first,
  };

  if (after) {
    variables.after = after;
  }

  if (search && search.trim()) {
    variables.search = search;
  }

  const data = await graphqlFetch<GraphQLProductsResponse>(
    GET_PRODUCTS_BY_PRODUCT_TYPE_QUERY,
    variables,
    "products"
  );
  return data;
}

async function globalSearchStorefront({
  query,
  channel = "default-channel",
  includeProducts = true,
  includeCategories = true,
  includeCollections = false,
  includeProductTypes = true,
}: {
  query: string;
  channel?: string;
  includeProducts?: boolean;
  includeCategories?: boolean;
  includeCollections?: boolean;
  includeProductTypes?: boolean;
}) {
  const variables = {
    query,
    channel,
    includeProducts,
    includeCategories,
    includeCollections,
    includeProductTypes,
  };

  const data = await graphqlFetch<GlobalSearchResponse>(
    GLOBAL_SEARCH_STOREFRONT_QUERY,
    variables,
    "globalSearch"
  );
  return data;
}

function transformGraphQLProductToProduct(
  graphqlProduct: GraphQLProduct
): Product {
  const media = graphqlProduct.media?.[0];
  const pricing = graphqlProduct.pricing?.priceRange;
  const startPrice = pricing?.start?.gross?.amount || 0;
  const stopPrice = pricing?.stop?.gross?.amount || 0;

  return {
    id: graphqlProduct.id,
    name: graphqlProduct.name,
    description: graphqlProduct.description || "",
    price: startPrice,
    price_max: stopPrice,
    currency: pricing?.start?.gross?.currency || "USD",
    brand: "",
    categories: graphqlProduct.category ? [graphqlProduct.category.name] : [],
    sku: [],
    in_stock: true,
    stock_quantity: 0,
    rating: 0,
    image_url: media?.url || "",
    images: graphqlProduct.media?.map((m) => m.url) || [],
    tenant_id: "",
    tenant_name: "",
    years: [],
    makes: [],
    models: [],
    slug: graphqlProduct.slug,
  };
}

function getImageUrlFromProductTypeMetadata(
  productType: GraphQLProductType
): string | null {
  const imageUrlMetadata = productType.metadata.find(
    (meta) => meta.key === "image-url"
  );
  if (
    imageUrlMetadata &&
    imageUrlMetadata.value &&
    imageUrlMetadata.value.trim() !== ""
  ) {
    return imageUrlMetadata.value;
  }
  return null;
}

/* ----------------- PL Option Set Types ----------------- */
export interface PLOptionSetVariant {
  id: number;
  option_set_id: number;
  product_variant_id: string;
  product_variant_name: string;
  base_variant_required: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PLOptionSet {
  id: number;
  name: string;
  type: "enum" | "multi-enum" | "text" | "date" | "date-time" | "image";
  required: boolean;
  hidden: boolean;
  label: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  variants?: PLOptionSetVariant[];
}

export interface PLOptionSetsResponse {
  data: PLOptionSet[];
}

/* ----------------- Public API ----------------- */
export { transformGraphQLProductToProduct, getImageUrlFromProductTypeMetadata };

export const shopApi = {
  getOrderById,
  getProductsByCategoriesAndProductTypes,
  getGraphQLCategories,
  getCategoryBySlug,
  getGraphQLProductTypes,
  getProductsByCategory,
  getProductsByProductType,
  globalSearchStorefront,

  async getCategories(): Promise<{ tenant: string; categories: Category[] }> {
    const search = qp({ tenant: TENANT });
    return httpGet(`/search/api/categories?${search}`);
  },

  async getBrands(): Promise<{
    brands: Brand[];
    total_brands: number;
    tenant: string;
  }> {
    const search = qp({ tenant: TENANT });
    return httpGet(`/search/api/brands?${search}`);
  },

  async getYMMCombinations(): Promise<{
    combinations: YMMCombinations;
    tenant: string;
    total_years: number;
    total_makes: number;
    total_models: number;
  }> {
    const search = qp({ tenant: TENANT });
    return httpGet(`/search/api/ymm/combinations?${search}`);
  },

  async getProductById(id: string): Promise<ProductDetail> {
    const query = qp({ tenant: TENANT });
    return httpGet(`/search/api/products/${id}?${query}`);
  },

  async searchProducts(
    params: {
      q?: string;
      category?: string | string[];
      brand?: string | string[];
      years?: string | string[];
      makes?: string | string[];
      models?: string | string[];
      per_page?: number;
      page?: number;
      sort?: string;
      in_stock?: boolean;
      min_price?: number;
      max_price?: number;
    } = {}
  ): Promise<ProductsResponse> {
    const normalize = (v?: string | string[]) =>
      Array.isArray(v) ? v.join(",") : v;
    const query = qp({
      q: params.q ?? "*",
      tenant: TENANT,
      category: normalize(params.category),
      brand: normalize(params.brand),
      years: normalize(params.years),
      makes: normalize(params.makes),
      models: normalize(params.models),
      per_page: params.per_page ?? 10,
      page: params.page ?? 1,
      sort: params.sort,
      in_stock: params.in_stock,
      min_price: params.min_price,

      max_price: params.max_price,
    });
    return httpGet(`/search/api/search/multi-tenant?${query}`);
  },

  // YMM (Year/Make/Model) API functions
  async pingYMM(): Promise<{
    message: string;
    status: string;
  }> {
    return partsLogicGet(`/ping`);
  },
  async getYears(): Promise<{
    success: boolean;
    data: YMMYear[];
    message: string;
  }> {
    return partsLogicGet(`/api/search/fitments/years`);
  },
  async getRootTypes(): Promise<{
    success: boolean;
    data: Array<{
      id: number;
      name: string;
    }>;
    message: string;
  }> {
    return partsLogicGet("/api/fitment-search/root-types");
  },
  async getFitmentValuesApi(query: number | string): Promise<{
    success: boolean;
    data: {
      id: number;
      value: string;
    };
    message: string;
  }> {
    return partsLogicGet(`/api/fitment-search/values/${query}`);
  },
  async getFitmentChildAPI(query: string): Promise<{
    success: boolean;
    data: Array<{
      id: number;
      value: string;
    }>;
    message: string;
  }> {
    return partsLogicGet(`/api/fitment-search/child-types/${query}`);
  },

  async getMakes(yearId: number): Promise<{
    success: boolean;
    data: YMMMake[];
    message: string;
  }> {
    return partsLogicGet(`/api/search/fitments/makes?year_id=${yearId}`);
  },

  async getModels(
    yearId: number,
    makeId: number
  ): Promise<{
    success: boolean;
    data: YMMModel[];
    message: string;
  }> {
    return partsLogicGet(
      `/api/search/fitments/models?year_id=${yearId}&make_id=${makeId}`
    );
  },

  async searchProductsPL(params: {
    q?: string;
    page?: number;
    per_page?: number;
    fitment_pairs?: string;
  }): Promise<PLSearchProductsResponse> {
    const query = qp({
      q: params.q,
      fitment_pairs: params.fitment_pairs,
      page: params.page ?? 1,
      per_page: params.per_page ?? 20,
    });
    return partsLogicGet(`/api/search/products?${query}`);
  },

  async categoryProductPL(): Promise<{ categories: CategoryAPIType[] }> {
    return partsLogicGet("/api/categories?page=1&per_page=100");
  },

  async brandsProductPL(): Promise<{ brands: CategoryAPIType[] }> {
    return partsLogicGet("/api/brands?page=1&per_page=100");
  },
  async getProductOptionSets(productId: string): Promise<PLOptionSetsResponse> {
    return partsLogicGet(`/api/storefront/products/${productId}/option-sets`);
  },

  async getProductsBySlug({
    slug,
    page = 1,
    per_page = 20,
    search,
    filterType = "category_slug",
  }: {
    slug: string;
    page?: number;
    per_page?: number;
    search?: string;
    filterType?: "category_slug" | "brand_slug";
  }): Promise<PLSearchProductsResponse> {
    const query = qp({
      q: search || undefined,
      [filterType]: slug,
      page,
      per_page,
    });
    return partsLogicGet(`/api/search/products?${query}`);
  },
};
