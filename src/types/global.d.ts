// Global type definitions for the application

// PayPal and Google Pay SDK Types - Declared globally
declare global {
  interface Window {
    google: typeof google & {
      payments?: {
        api: {
          PaymentsClient: new (options: { environment: string }) => GooglePaymentsClient;
        };
      };
    };
    initMap?: () => void;
    paypal?: {
      Buttons: (config: PayPalButtonsConfig) => {
        render: (container: string) => Promise<void>;
      };
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
    };
    ApplePaySession?: typeof ApplePaySession;
  }

  // Apple Pay Session API
  class ApplePaySession {
    static STATUS_SUCCESS: number;
    static STATUS_FAILURE: number;
    static canMakePayments(): boolean;
    static canMakePaymentsWithActiveCard(merchantIdentifier: string): Promise<boolean>;
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
    onpaymentauthorized: ((event: { payment: { token: unknown; billingContact?: unknown } }) => void) | null;
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

  interface PayPalButtonsConfig {
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
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
}

export {};
