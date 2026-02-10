export type PaymentProcessingState = {
  isModalOpen: boolean;
  paymentProcessingLoading: boolean;
  error: boolean;
  success: boolean;
};

export type AddressForm = {
  id?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  companyName?: string;
  streetAddress1: string;
  streetAddress2?: string;
  city: string;
  postalCode: string;
  country: string; // ISO code, e.g., 'US'
  countryArea?: string;
};

export type KountConfiguration = {
  blockCheckout: boolean;
  blockedCheckoutMessage: string;
  activePaymentMethods: string[];
  ipExclusions: string[];
};

export type KountConfigResponse = {
  appConfiguration: KountConfiguration;
};

export type KountFraudCheckRequest = {
  merchantOrderId: string;
  deviceSessionId: string;
  userIp: string;
  account: {
    id: string;
    type: "REGISTERED";
    creationDateTime: string;
    username: string;
    accountIsActive: boolean;
  };
  items: Array<{
    id: string;
    price: number;
    description: string;
    name: string;
    quantity: number;
    category: string;
    subCategory: string;
    isDigital: boolean;
    sku: string;
  }>;
  fulfillment: Array<{
    merchantFulfillmentId: string;
    type: "LOCAL_DELIVERY" | "STORE_PICK_UP";
    status: "UNFULFILLED";
    items: Array<{
      id: string;
      quantity: number;
    }>;
    shipping: {
      amount: number;
      provider: string;
      method: string;
    };
    recipientPerson: {
      name: {
        first: string;
        family: string;
      };
      emailAddress: string;
      phoneNumber: string;
      address: {
        line1: string;
        line2?: string;
        city: string;
        region: string;
        postalCode: string;
        countryCode: string;
      };
    };
  }>;
  transactions: Array<{
    merchantTransactionId: string;
    subtotal: number;
    orderTotal: number;
    currency: string;
    transactionStatus: "PENDING";
    billedPerson: {
      name: {
        first: string;
        family: string;
      };
      emailAddress: string;
      phoneNumber: string;
      address: {
        line1: string;
        line2?: string;
        city: string;
        region: string;
        postalCode: string;
        countryCode: string;
      };
    };
    items: Array<{
      id: string;
      quantity: number;
    }>;
    tax: {
      isTaxable: boolean;
      taxableCountryCode: string;
      taxAmount: number;
    };
  }>;
};

export type KountFraudCheckResponse = {
  version: string;
  order: {
    orderId: string;
    merchantOrderId: string;
    channel: string;
    deviceSessionId: string;
    creationDateTime: string;
    riskInquiry: {
      decision: string;
      omniscore: number;
      persona: {
        uniqueCards: number;
        uniqueDevices: number;
        uniqueEmails: number;
        riskiestCountry: string;
        totalBankApprovedOrders: number;
        totalBankDeclinedOrders: number;
        maxVelocity: number;
        riskiestRegion: string;
      };
      device: Record<string, unknown>;
      segmentExecuted: {
        segment: {
          id: string;
          name: string;
          priority: number;
        };
        policiesExecuted: Record<string, unknown>[];
        tags: Record<string, unknown>[];
      };
      email: Record<string, unknown>;
      policyManagement: Record<string, unknown>;
      reasonCode: string;
    };
    transactions: Array<{
      transactionId: string;
      merchantTransactionId: string;
      payment: Array<{
        cardBrand: string;
      }>;
      processorMerchantId: string;
    }>;
    fulfillment: Array<{
      fulfillmentId: string;
      merchantFulfillmentId: string;
    }>;
  };
  warnings: Record<string, unknown>[];
};
