// Global type definitions for the application

// PayPal and Google Pay SDK Types - Declared globally
declare global {
  interface Window {
    google: typeof google & {
      payments?: {
        api: {
          PaymentsClient: new (options: {
            environment: string;
          }) => GooglePaymentsClient;
        };
      };
    };
    initMap?: () => void;
    paypal?: {
      Buttons: (config: PayPalButtonsConfig) => {
        render: (container: string) => Promise<void>;
      };
      CardFields: (config: PayPalCardFieldsConfig) => PayPalCardFieldsInstance;
      Applepay: () => {
        config: () => Promise<ApplePayConfigResponse>;
        validateMerchant: (options: {
          validationUrl: string;
          displayName?: string;
        }) => Promise<{ merchantSession: unknown }>;
        confirmOrder: (options: {
          orderId: string;
          token?: unknown;
          billingContact?: unknown;
        }) => Promise<void>;
      };
      Googlepay: () => {
        config: () => Promise<GooglePayConfigResponse>;
        confirmOrder: (options: {
          orderId: string;
          paymentMethodData: unknown;
        }) => Promise<{ status: string }>;
      };
      // PayPal SDK v6 - createInstance method
      // Used for vault flows and advanced card field integrations
      createInstance?: (config: {
        clientId?: string;
        clientToken?: string;
        components?: string[];
      }) => Promise<PayPalSDKv6Instance>;
    };
    ApplePaySession?: typeof ApplePaySession;
  }

  // Apple Pay Session API
  class ApplePaySession {
    static STATUS_SUCCESS: number;
    static STATUS_FAILURE: number;
    static canMakePayments(): boolean;
    static canMakePaymentsWithActiveCard(
      merchantIdentifier: string,
    ): Promise<boolean>;
    static supportsVersion(version: number): boolean;

    constructor(version: number, paymentRequest: ApplePayPaymentRequest);

    begin(): void;
    abort(): void;
    completeMerchantValidation(merchantSession: unknown): void;
    completePayment(status: number): void;
    completePaymentMethodSelection(update: unknown): void;
    completeShippingMethodSelection(update: unknown): void;
    completeShippingContactSelection(update: unknown): void;

    onvalidatemerchant: ((event: { validationURL: string }) => void) | null;
    onpaymentauthorized:
      | ((event: {
          payment: { token: unknown; billingContact?: unknown };
        }) => void)
      | null;
    onpaymentmethodselected: ((event: unknown) => void) | null;
    onshippingmethodselected: ((event: unknown) => void) | null;
    onshippingcontactselected: ((event: unknown) => void) | null;
    oncancel: ((event: Event) => void) | null;
  }

  interface ApplePayPaymentRequest {
    countryCode: string;
    currencyCode: string;
    supportedNetworks: string[];
    merchantCapabilities: string[];
    total: {
      label: string;
      amount: string;
      type?: string;
    };
  }

  interface GooglePaymentsClient {
    isReadyToPay(request: IsReadyToPayRequest): Promise<{ result: boolean }>;
    loadPaymentData(request: PaymentDataRequest): Promise<PaymentData>;
  }

  interface IsReadyToPayRequest {
    apiVersion: number;
    apiVersionMinor: number;
    allowedPaymentMethods: AllowedPaymentMethod[];
  }

  interface AllowedPaymentMethod {
    type: string;
    parameters: Record<string, unknown>;
    tokenizationSpecification?: Record<string, unknown>;
  }

  interface PaymentDataRequest {
    apiVersion: number;
    apiVersionMinor: number;
    allowedPaymentMethods: AllowedPaymentMethod[];
    merchantInfo: {
      merchantId?: string;
      merchantName?: string;
    };
    transactionInfo: {
      totalPriceStatus: string;
      totalPrice: string;
      currencyCode: string;
      countryCode?: string;
    };
    callbackIntents?: string[];
  }

  interface PaymentData {
    paymentMethodData: Record<string, unknown>;
  }

  interface PayPalCreateOrderData {
    fundingSource: "paypal" | "card" | "venmo" | "paylater" | string;
    paymentSource?: string;
  }

  interface PayPalActions {
    order?: {
      capture: () => Promise<any>;
      get: () => Promise<any>;
    };
  }

  interface PayPalApproveData {
    orderID: string;
    payerID?: string;
    paymentID?: string;
    billingToken?: string;
    facilitatorAccessToken?: string;
  }

  interface PayPalButtonsConfig {
    createOrder: (
      data: PayPalCreateOrderData,
      actions: PayPalActions,
    ) => Promise<string>;
    onApprove: (
      data: PayPalApproveData,
      actions: PayPalActions,
    ) => Promise<void>;
    onError?: (err: Error) => void;
    onCancel?: () => void;
    style?: {
      layout?: "vertical" | "horizontal";
      color?: "gold" | "blue" | "silver" | "white" | "black";
      shape?: "rect" | "pill";
      label?: "paypal" | "checkout" | "buynow" | "pay";
      height?: number;
    };
  }

  // PayPal Card Fields Types
  interface PayPalCardFieldsConfig {
    createOrder?: () => Promise<string>;
    createVaultSetupToken?: () => Promise<string>;
    onApprove: (data: {
      orderID: string;
      vaultSetupToken?: string;
    }) => Promise<void>;
    onCancel?: () => void;
    onError?: (err: Error) => void;
    style?: {
      input?: Record<string, string>;
      ".valid"?: Record<string, string>;
      ".invalid"?: Record<string, string>;
      ":focus"?: Record<string, string>;
    };
  }

  interface PayPalCardFieldInstance {
    render: (container: string) => void;
  }

  interface PayPalCardFieldsInstance {
    isEligible: () => boolean;
    NumberField: () => PayPalCardFieldInstance;
    ExpiryField: () => PayPalCardFieldInstance;
    CVVField: () => PayPalCardFieldInstance;
    NameField: () => PayPalCardFieldInstance;
    submit: () => Promise<void>;
  }

  interface ApplePayConfigResponse {
    countryCode: string;
    currencyCode: string;
    merchantCapabilities: string[];
    supportedNetworks: string[];
  }

  interface GooglePayConfigResponse {
    allowedPaymentMethods: AllowedPaymentMethod[];
    merchantInfo: {
      merchantId?: string;
      merchantName?: string;
    };
    isEligible: boolean;
  }

  // PayPal SDK v6 Types for Vault Without Purchase
  interface PayPalSDKInstance {
    CardFields: (config?: {
      style?: Record<string, Record<string, string>>;
    }) => {
      isEligible: () => boolean;
      NumberField: () => PayPalCardFieldInstance;
      ExpiryField: () => PayPalCardFieldInstance;
      CVVField: () => PayPalCardFieldInstance;
      NameField: () => PayPalCardFieldInstance;
    };
    createInstance: (config: {
      clientToken?: string;
      components?: string[];
    }) => Promise<PayPalSDKv6Instance>;
  }

  interface PayPalSDKv6Instance {
    createCardFieldsSavePaymentSession: () => PayPalSavePaymentSession;
    createCardFieldsPaymentSession?: () => any; // For payment flows
  }

  interface PayPalSavePaymentSession {
    // v6 SDK creates Web Components, not using render()
    createCardFieldsComponent: (config: {
      type: "number" | "expiry" | "cvv" | "name";
    }) => HTMLElement;
    submit: (setupTokenId: string) => Promise<{
      state: "succeeded" | "canceled" | "failed";
      data: {
        vaultSetupToken?: string;
        message?: string;
      };
    }>;
    destroy?: () => void;
  }
}

// Vault-related tRPC types
// Note: saleorUserId is NOT in inputs - it's extracted from JWT server-side
export interface CreateSetupTokenInput {
  paymentMethodType?: "card" | "paypal" | "venmo";
  verificationMethod?: "SCA_WHEN_REQUIRED" | "SCA_ALWAYS";
  returnUrl?: string;
  cancelUrl?: string;
  brandName?: string;
}

export interface CreateSetupTokenResponse {
  setupTokenId: string;
  status: string;
  approvalUrl: string | null;
  customerId: string;
  paymentMethodType: string;
}

export interface CreatePaymentTokenFromSetupTokenInput {
  setupTokenId: string;
}

export interface SavedCardDetails {
  brand: string;
  lastDigits: string;
  expiry: string;
}

export interface SavedPaymentMethod {
  id: string;
  type: "card" | "paypal" | "venmo";
  card?: SavedCardDetails;
  paypal?: { email: string };
  venmo?: { username: string };
}

export interface CreatePaymentTokenResponse {
  paymentTokenId: string;
  customerId: string;
  paymentMethodType: string;
  card: SavedCardDetails | null;
  paypal: { email: string } | null;
  venmo: { username: string } | null;
}

export interface ListSavedPaymentMethodsInput {
  // Empty - user is identified from JWT token
}

export interface ListSavedPaymentMethodsResponse {
  savedPaymentMethods: SavedPaymentMethod[];
}

export {};
