import { gql } from '@apollo/client';

export type Money = { 
  amount: number; 
  currency: string; 
};

export type Price = { 
  gross: Money; 
  net: Money;
  tax?: Money;
};

export type Thumbnail = {
  url: string;
  alt: string | null;
};

export type MetadataItem = {
  key: string;
  value: string;
};

export type OrderLine = {
  id: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  quantityFulfilled: number;
  isShippingRequired: boolean;
  thumbnail: Thumbnail | null;
  unitPrice: Price;
  totalPrice: Price;
  taxRate: number | null;
  translatedProductName?: string;
  translatedVariantName?: string;
  metadata?: MetadataItem[] | null;
  variant?: {
    id: string;
    sku: string | null;
    name: string;
    metadata?: MetadataItem[] | null;
    product: {
      id: string;
      name: string;
      category?: {
        name: string;
      } | null;
    };
  } | null;
};

export type Address = {
  firstName: string;
  lastName: string;
  companyName?: string | null;
  streetAddress1: string;
  streetAddress2?: string | null;
  city: string;
  postalCode: string;
  country: {
    code: string;
    country: string;
  };
  countryArea?: string | null;
  phone?: string | null;
};

export type FulfillmentLine = {
  id: string;
  quantity: number;
  orderLine: {
    id: string;
    productName: string;
  };
};

export type Fulfillment = {
  id: string;
  status: string;
  trackingNumber: string | null;
  lines: FulfillmentLine[];
};

export type Voucher = {
  id: string;
  name: string | null;
  code: string;
};

export type OrderDetailData = {
  orderByToken: {
    id: string;
    number: string;
    created: string;
    languageCodeEnum: string;
    status: string;
    statusDisplay: string;
    shippingAddress: Address | null;
    billingAddress: Address | null;
    shippingMethodName: string | null;
    shippingPrice: Price;
    subtotal: Price;
    total: Price;
    undiscountedTotal: Price;
    discountName: string | null;
    voucher: Voucher | null;
    lines: OrderLine[];
    fulfillments: Fulfillment[];
  } | null;
};

export const ORDER_DETAIL = gql`
  query OrderDetail($token: UUID!) {
    orderByToken(token: $token) {
      id
      number
      created
      languageCodeEnum
      status
      statusDisplay
      shippingAddress {
        firstName 
        lastName 
        companyName 
        streetAddress1 
        streetAddress2 
        city 
        postalCode
        country { 
          code 
          country 
        } 
        countryArea 
        phone
      }
      billingAddress {
        firstName 
        lastName 
        companyName 
        streetAddress1 
        streetAddress2 
        city 
        postalCode
        country { 
          code 
          country 
        } 
        countryArea 
        phone
      }
      shippingMethodName
      shippingPrice { 
        gross { amount currency } 
        net { amount currency } 
      }
      subtotal { 
        gross { amount currency } 
        net { amount currency } 
      }
      total { 
        gross { amount currency } 
        net { amount currency } 
      }
      undiscountedTotal { 
        gross { amount currency } 
        net { amount currency } 
      }
      discountName
      voucher { 
        id 
        name 
        code 
      }
      lines {
        id
        productName
        variantName
        quantity
        metadata {
          key
          value
        }
        quantityFulfilled
        isShippingRequired
        thumbnail(size: 256) { 
          url 
          alt 
        }
        unitPrice { 
          gross { amount currency } 
          net { amount currency } 
        }
        totalPrice { 
          gross { amount currency } 
          net { amount currency } 
        }
        taxRate
        variant {
          id
          sku
          name
          metadata {
            key
            value
          }
          product {
            id
            name
            category {
              name
            }
          }
        }
      }
      fulfillments {
        id
        status
        trackingNumber
        lines {
          id
          quantity
          orderLine { 
            id 
            productName 
          }
        }
      }
    }
  }
`;
