import { gql } from "@apollo/client";

export const PRODUCT_DETAILS_BY_ID = gql`
  query ProductDetailsById($slug: String!, $channel: String!) {
    product(slug: $slug, channel: $channel) {
      id
      name
      slug
      defaultVariant {
        id
        sku
        quantityAvailable
        pricing {
          price {
            gross {
              amount
              currency
            }
          }
          priceUndiscounted {
            gross {
              amount
              currency
            }
          }
        }
      }
      description
      metadata {
        key
        value
      }
      media {
        id
        url
        alt
      }
      collections {
        id
        name
      }
      category {
        id
        name
      }
      metadata {
        key
        value
      }
      pricing {
        onSale
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
        discount {
          gross {
            amount
            currency
          }
        }
      }
      variants {
        id
        name
        sku
        quantityAvailable
        weight {
          unit
          value
        }
        metadata {
          key
          value
        }
        attributes {
          attribute {
            id
            name
            slug
          }
          values {
            id
            name
            slug
          }
        }
        pricing {
          price {
            gross {
              amount
              currency
            }
          }
          priceUndiscounted {
            gross {
              amount
              currency
            }
          }
        }
      }
    }
  }
`;

// --- Types ---

export interface Money {
  amount: number;
  currency: string;
}

export interface TaxedMoney {
  gross: Money;
}

export interface PriceRange {
  start: TaxedMoney | null;
  stop: TaxedMoney | null;
}

export interface ProductMedia {
  id: string;
  url: string;
  alt: string | null;
}

export interface ProductCollection {
  id: string;
  name: string;
}

export interface ProductAttributeDef {
  id: string;
  name: string;
  slug: string;
}

export interface ProductAttributeValue {
  id: string;
  name: string;
  slug: string;
}

export interface ProductVariantAttribute {
  attribute: ProductAttributeDef | null;
  values: Array<ProductAttributeValue | null>;
}

export interface ProductVariantWeight {
  unit: string;
  value: number;
}

export interface ProductVariantPricing {
  price: TaxedMoney | null;
  priceUndiscounted: TaxedMoney | null;
}

export interface ProductVariantMetadata {
  key: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  quantityAvailable: number | null;
  weight: ProductVariantWeight | null;
  metadata: ProductVariantMetadata[];
  attributes: ProductVariantAttribute[];
  pricing: ProductVariantPricing | null;
}

export interface ProductPricing {
  onSale: boolean | null;
  priceRange: PriceRange | null;
  discount: TaxedMoney | null;
}

export interface ProductMetadata {
  key: string;
  value: string;
}

export interface DefaultVariant {
  id: string;
  sku: string;
  quantityAvailable: number | null;
  pricing: ProductVariantPricing | null;
}

export interface ProductDetailsByIdData {
  product: {
    id: string;
    name: string;
    slug: string;
    defaultVariant: DefaultVariant | null;
    description: string | null;
    metadata: ProductMetadata[];
    media: ProductMedia[];
    collections: ProductCollection[];
    pricing: ProductPricing | null;
    variants: ProductVariant[];
    category: { id: string; name: string } | null;
  } | null;
}

export interface ProductDetailsByIdVars {
  slug: string;
  channel: string;
}
