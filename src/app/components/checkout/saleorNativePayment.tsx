"use client";

import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  PaymentProcessingState,
  type KountConfigResponse,
  type KountFraudCheckRequest,
} from "@/graphql/types/checkout";
import { useRouter } from "next/navigation";
import { useMutation, useLazyQuery } from "@apollo/client";
import {
  CHECKOUT_COMPLETE,
  type CheckoutCompleteVars,
  type CheckoutCompleteData,
} from "@/graphql/mutations/checkoutComplete";
import {
  CHECKOUT_PAYMENT_CREATE,
  type CheckoutPaymentCreateVars,
  type CheckoutPaymentCreateData,
} from "@/graphql/mutations/checkoutPaymentCreate";
import {
  CHECKOUT_CUSTOMER_ATTACH,
  type CheckoutCustomerAttachVars,
  type CheckoutCustomerAttachData,
} from "@/graphql/mutations/checkoutCustomerAttach";
import { CHECKOUT_BY_ID } from "@/graphql/mutations/checkoutCreate";
import { gql } from "@apollo/client";
import { useGlobalStore } from "@/store/useGlobalStore";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import ReCAPTCHA from "react-google-recaptcha";
import Input from "../reuseableUI/input";
import LoadingUI from "../reuseableUI/loadingUI";
import { gtmAddPaymentInfo, Product } from "../../utils/googleTagManager";
import { useAppConfiguration } from "@/app/components/providers/ServerAppConfigurationProvider";
import { kountApi, type KountOrderUpdateRequest } from "@/lib/api/kount";
import { PayPalPayment } from "./paypalPayment";
import { AffirmPayment } from "./affirmPayment";
import {
  getUserIP,
  generateTransactionId,
  formatRFC3339Date,
  generateDeviceSessionId,
  detectPaymentType,
} from "../../utils/ipDetection";
import {
  UPDATE_CHECKOUT_METADATA,
  type UpdateCheckoutMetadataVariables,
  type UpdateCheckoutMetadataData,
} from "@/graphql/mutations/updateCheckoutMetadata";
import Image from "next/image";

interface PaymentGateway {
  id: string;
  name: string;
  config: Array<{
    field: string;
    value: string;
  }>;
}

interface SaleorNativePaymentProps {
  checkoutId: string;
  totalAmount: number;
  onSuccess: () => void;
  onError: (message: string) => void;
  onCheckoutBlocked?: (message: string) => void;
  setIsProcessingPayment: (state: PaymentProcessingState) => void;
  availablePaymentGateways?: PaymentGateway[];
  kountConfig?: KountConfigResponse | null;
  onStartPayment?: () => Promise<void> | void;
  selectedShippingId?: string;
  userEmail?: string;
  guestEmail?: string;
  lineItems?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    category?: string;
    sku?: string;
  }>;
  billingAddress?: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
  };
  shippingAddress?: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
  };
  questionsValid?: boolean;
  termsAccepted?: boolean;
  termsData?: { page?: { isPublished: boolean } | null };
  onTermsModalOpen?: () => void;
  onTermsAcceptedChange?: (accepted: boolean) => void;
  taxInfo?: {
    totalTax: number;
    shippingTax: number;
    subtotalNet: number;
    shippingNet: number;
    currency: string;
  } | null;
  disabled?: boolean;
  onPaymentReady?: (triggerPayment: () => Promise<void>) => void;
}

interface CardData {
  cardNumber: string;
  expirationDate: string;
  cardCode: string;
  fullName: string;
}

interface AuthorizeNetResponse {
  messages: {
    resultCode: string;
    message?: Array<{ text: string }>;
  };
  opaqueData?: {
    dataValue: string;
  };
}

const CHECKOUT_DELIVERY_METHOD_UPDATE = gql`
  mutation CheckoutDeliveryMethodUpdate($id: ID!, $deliveryMethodId: ID!) {
    checkoutDeliveryMethodUpdate(id: $id, deliveryMethodId: $deliveryMethodId) {
      checkout {
        id
        deliveryMethod {
          ... on ShippingMethod {
            id
            name
          }
          ... on Warehouse {
            id
            name
          }
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

interface CheckoutDeliveryMethodUpdateVars {
  id: string;
  deliveryMethodId: string;
}

interface CheckoutDeliveryMethodUpdateData {
  checkoutDeliveryMethodUpdate: {
    checkout: {
      id: string;
      deliveryMethod: {
        id: string;
        name: string;
      } | null;
    } | null;
    errors: Array<{
      field: string | null;
      message: string;
      code: string;
    }>;
  };
}

// Helper function to get payment gateway icon (using SVG for lightweight icons)
const getPaymentGatewayIcon = (gatewayId: string): React.ReactElement => {
  if (gatewayId === "mirumee.payments.authorize_net") {
    // Authorize.Net icon
    return (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
      </svg>
    );
  } else if (gatewayId === "saleor.app.payment.stripe") {
    // Stripe icon
    return (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#635BFF">
        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
      </svg>
    );
  } else if (gatewayId === "saleor.app.payment.paypal") {
    // PayPal icon
    return (
      <Image
        src={"https://www.paypalobjects.com/js-sdk-logos/2.3.2/pp-blue.svg"}
        alt="Stripe"
        width={24}
        height={24}
        quality={85}
        sizes="100vw"
        className="size-6 object-center"
      />
    );
  } else if (gatewayId === "saleor.app.affirm") {
    // Affirm icon
    return (
      <svg
        width="25"
        height="25"
        viewBox="0 0 175 129"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#clip0_2525_341)">
          <path
            d="M28.5299 125.9C21.2699 114.84 17.0399 101.64 17.0399 87.4498C17.0399 48.6898 48.5699 17.1598 87.3299 17.1598C126.09 17.1598 157.62 48.6898 157.62 87.4498C157.62 101.63 153.38 114.84 146.13 125.9H165.81C171.52 114.29 174.74 101.24 174.74 87.4498C174.74 39.2498 135.53 0.0498047 87.3399 0.0498047C39.1499 0.0498047 -0.0600586 39.2598 -0.0600586 87.4498C-0.0600586 101.24 3.15994 114.29 8.86994 125.9H28.5299Z"
            fill="#4A4AF4"
          />
          <path
            d="M88.5098 45.9199C75.7098 45.9199 60.9798 51.9499 52.9798 58.3299L60.2798 73.6999C66.6898 67.8299 77.0598 62.8199 86.4098 62.8199C95.2998 62.8199 100.2 65.7899 100.2 71.7799C100.2 75.8099 96.9398 78.0799 90.7998 78.6399C67.7398 80.7599 49.8198 87.9599 49.8198 105.66C49.8198 119.7 59.9398 128.18 76.5898 128.18C87.7298 128.18 96.4798 121.99 101.2 113.82V125.89H121.96V75.2999C121.97 54.4099 107.44 45.9199 88.5098 45.9199ZM82.4498 111.96C75.7198 111.96 72.0298 109.08 72.0298 104.35C72.0298 94.4899 84.0798 92.1099 99.7698 92.1099C99.7698 102.43 92.8598 111.96 82.4498 111.96Z"
            fill="black"
          />
        </g>
        <defs>
          <clipPath id="clip0_2525_341">
            <rect width="174.82" height="128.16" fill="white" />
          </clipPath>
        </defs>
      </svg>
    );
  }
  // Default credit card icon
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
    </svg>
  );
};

// Helper function to get payment gateway display name
const getPaymentGatewayDisplayName = (gatewayName: string): string => {
  if (gatewayName.toLowerCase().includes("authorize")) {
    return "Authorize.Net";
  } else if (gatewayName.toLowerCase().includes("stripe")) {
    return "Stripe";
  } else if (gatewayName.toLowerCase().includes("paypal")) {
    return "PayPal";
  } else if (gatewayName.toLowerCase().includes("affirm")) {
    return "Affirm";
  }
  return gatewayName;
};

export function SaleorNativePayment({
  checkoutId,
  totalAmount,
  onSuccess,
  onError,
  onCheckoutBlocked,
  setIsProcessingPayment,
  availablePaymentGateways = [],
  kountConfig,
  onStartPayment,
  selectedShippingId,
  userEmail,
  guestEmail,
  lineItems = [],
  billingAddress,
  shippingAddress,
  questionsValid = true,
  termsAccepted = true,
  termsData,
  onTermsModalOpen,
  onTermsAcceptedChange,
  taxInfo,
  disabled = false,
  onPaymentReady,
}: SaleorNativePaymentProps) {
  // Filter out dummy payment gateways
  const filteredPaymentGateways = availablePaymentGateways.filter(
    (gateway) =>
      !gateway.id.toLowerCase().includes("dummy") &&
      !gateway.name.toLowerCase().includes("dummy")
  );

  const router = useRouter();
  const { isLoggedIn, user } = useGlobalStore();
  const { recaptchaRef, resetRecaptcha } = useRecaptcha();
  const config = useAppConfiguration();
  const gtmConfig = config.getGoogleTagManagerConfig();

  const [cardData, setCardData] = useState<CardData>({
    cardNumber: "",
    expirationDate: "",
    cardCode: "",
    fullName: "",
  });

  const [selectedPaymentGateway, setSelectedPaymentGateway] = useState<string>("");

  useEffect(() => {
    if (!disabled && filteredPaymentGateways.length > 0 && !selectedPaymentGateway) {
      setSelectedPaymentGateway(filteredPaymentGateways[0].id);
    }
  }, [filteredPaymentGateways]);
  
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [recaptchaValue, setRecaptchaValue] = useState<string | null>(null);
  const [_isFraudCheckRunning, setIsFraudCheckRunning] = useState(false);
  const [kountOrderData, setKountOrderData] = useState<{
    kountOrderId: string;
    transactionId: string;
  } | null>(null);
  const [lastFraudCheckData, setLastFraudCheckData] = useState<{
    kountOrderId: string;
    transactionId: string;
  } | null>(null);
  const [isPaymentInProgress, setIsPaymentInProgress] = useState(false);
  const [isCustomerAttached, setIsCustomerAttached] = useState(false);
  const [fraudCheckCompleted, setFraudCheckCompleted] = useState(false);

  // Reset customer attachment and fraud check state when checkout ID changes
  useEffect(() => {
    setIsCustomerAttached(false);
    setFraudCheckCompleted(false);
  }, [checkoutId]);

  // Reset fraud check state when email changes
  useEffect(() => {
    const effectiveEmail = user?.email || userEmail || guestEmail;
    if (effectiveEmail) {
      setFraudCheckCompleted(false);
      setKountOrderData(null);
      setLastFraudCheckData(null);
    }
  }, [user?.email, userEmail, guestEmail]);

  const [checkoutComplete] = useMutation<
    CheckoutCompleteData,
    CheckoutCompleteVars
  >(CHECKOUT_COMPLETE);
  const [checkoutPaymentCreate] = useMutation<
    CheckoutPaymentCreateData,
    CheckoutPaymentCreateVars
  >(CHECKOUT_PAYMENT_CREATE);
  const [attachCustomer] = useMutation<
    CheckoutCustomerAttachData,
    CheckoutCustomerAttachVars
  >(CHECKOUT_CUSTOMER_ATTACH);
  const [updateDeliveryMethod] = useMutation<
    CheckoutDeliveryMethodUpdateData,
    CheckoutDeliveryMethodUpdateVars
  >(CHECKOUT_DELIVERY_METHOD_UPDATE);
  const [updateCheckoutMetadata] = useMutation<
    UpdateCheckoutMetadataData,
    UpdateCheckoutMetadataVariables
  >(UPDATE_CHECKOUT_METADATA);
  const [getCheckoutById] = useLazyQuery(CHECKOUT_BY_ID);

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!cardData.cardNumber.replace(/\s/g, "")) {
      errors.cardNumber = "Card number is required";
    } else if (
      !/^[\d\s]{13,19}$/.test(cardData.cardNumber.replace(/\s/g, ""))
    ) {
      errors.cardNumber = "Please enter a valid card number";
    }

    if (!cardData.expirationDate) {
      errors.expirationDate = "Expiration date is required";
    } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardData.expirationDate)) {
      errors.expirationDate = "Please enter a valid expiration date (MM/YY)";
    }

    if (!cardData.cardCode) {
      errors.cardCode = "Security code is required";
    } else if (!/^\d{3,4}$/.test(cardData.cardCode)) {
      errors.cardCode = "Please enter a valid security code";
    }

    if (!cardData.fullName.trim()) {
      errors.fullName = "Cardholder name is required";
    }

    // Only require reCAPTCHA if enabled for checkout
    if (config.isRecaptchaEnabledFor("checkout") && !recaptchaValue) {
      errors.recaptcha = "Please complete the reCAPTCHA verification";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [cardData, recaptchaValue, config]);

  const formatCardNumber = (value: string): string => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const formatExpirationDate = (value: string): string => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  const handleInputChange = useCallback(
    (field: string, value: string) => {
      let formattedValue = value;

      if (field === "cardNumber") {
        formattedValue = formatCardNumber(value);
      } else if (field === "expirationDate") {
        formattedValue = formatExpirationDate(value);
      } else if (field === "cardCode") {
        formattedValue = value.replace(/[^0-9]/g, "");
        if (formattedValue.length > 4) return;
      }

      setCardData((prev) => ({ ...prev, [field]: formattedValue }));

      // Clear validation error for this field
      if (validationErrors[field]) {
        setValidationErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [validationErrors]
  );

  // Function to perform Kount fraud check
  const performKountFraudCheck = useCallback(async () => {
    // Prevent duplicate fraud checks
    if (fraudCheckCompleted) {
      return kountOrderData;
    }

    if (!kountConfig?.appConfiguration || !lineItems.length) {
      return;
    }

    const { activePaymentMethods, ipExclusions } = kountConfig.appConfiguration;

    // Check if selected payment method requires fraud detection
    const shouldPerformFraudCheck = activePaymentMethods.some(
      (method) => method.toLowerCase() === selectedPaymentGateway.toLowerCase()
    );

    if (!shouldPerformFraudCheck) {
      return;
    }

    // Variable to store fraud check data
    let kountData: { kountOrderId: string; transactionId: string } | null =
      null;

    try {
      setIsFraudCheckRunning(true);

      // Get user IP first
      const userIp = await getUserIP();

      // Check if user IP is in exclusions list - if so, bypass fraud check
      if (
        ipExclusions &&
        Array.isArray(ipExclusions) &&
        ipExclusions.includes(userIp)
      ) {
        setFraudCheckCompleted(true); // Mark as completed to prevent duplicate calls
        return null; // Return null to indicate no fraud check data
      }

      // Prepare account info
      const effectiveEmail = user?.email || userEmail || guestEmail;
      if (!effectiveEmail) {
        return null;
      }

      const accountId = user?.id || effectiveEmail || `guest-${checkoutId}`;
      const accountUsername = effectiveEmail;
      const accountCreationDate = new Date().toISOString(); // Always use current time for simplicity

      // Generate a valid device session ID that meets Kount requirements
      const deviceSessionId = generateDeviceSessionId(user?.id, checkoutId);

      // Prepare request data
      const fraudCheckRequest: KountFraudCheckRequest = {
        merchantOrderId: checkoutId,
        deviceSessionId: deviceSessionId,
        userIp,
        account: {
          id: accountId,
          type: "REGISTERED",
          creationDateTime: formatRFC3339Date(new Date(accountCreationDate)),
          username: accountUsername,
          accountIsActive: true,
        },
        items: lineItems.map((item) => ({
          id: item.id,
          price: Math.round(item.price * 100), // Convert dollars to cents
          description: item.name,
          name: item.name,
          quantity: item.quantity,
          category: item.category || "Products",
          subCategory: "",
          isDigital: false,
          sku: item.sku || "", // Use actual SKU only
        })),
        fulfillment: [
          {
            merchantFulfillmentId: checkoutId,
            type: "LOCAL_DELIVERY",
            status: "UNFULFILLED",
            items: lineItems.map((item) => ({
              id: item.id,
              quantity: item.quantity,
            })),
            shipping: {
              amount: 0, // Will be updated with actual shipping cost
              provider: "Standard",
              method: "STANDARD",
            },
            recipientPerson: {
              name: {
                first: shippingAddress?.firstName || "Guest",
                family: shippingAddress?.lastName || "User",
              },
              emailAddress: effectiveEmail,
              phoneNumber: shippingAddress?.phone || "+15551234567",
              address: {
                line1: shippingAddress?.address || "123 Main St",
                city: shippingAddress?.city || "Unknown",
                region: shippingAddress?.state || "Unknown",
                postalCode: shippingAddress?.zipCode || "00000",
                countryCode: shippingAddress?.country || "US",
              },
            },
          },
        ],
        transactions: [
          {
            merchantTransactionId: generateTransactionId(),
            subtotal: Math.round(totalAmount * 100), // Convert dollars to cents
            orderTotal: Math.round(totalAmount * 100), // Convert dollars to cents
            currency: "USD",
            transactionStatus: "PENDING",
            billedPerson: {
              name: {
                first:
                  billingAddress?.firstName ||
                  shippingAddress?.firstName ||
                  "Guest",
                family:
                  billingAddress?.lastName ||
                  shippingAddress?.lastName ||
                  "User",
              },
              emailAddress: effectiveEmail,
              phoneNumber:
                billingAddress?.phone ||
                shippingAddress?.phone ||
                "+15551234567",
              address: {
                line1:
                  billingAddress?.address ||
                  shippingAddress?.address ||
                  "123 Main St",
                city:
                  billingAddress?.city || shippingAddress?.city || "Unknown",
                region:
                  billingAddress?.state || shippingAddress?.state || "Unknown",
                postalCode:
                  billingAddress?.zipCode ||
                  shippingAddress?.zipCode ||
                  "00000",
                countryCode:
                  billingAddress?.country || shippingAddress?.country || "US",
              },
            },
            items: lineItems.map((item) => ({
              id: item.id,
              quantity: item.quantity,
            })),
            tax: {
              isTaxable: (taxInfo?.totalTax || 0) > 0,
              taxableCountryCode:
                billingAddress?.country || shippingAddress?.country || "US",
              taxAmount: Math.round((taxInfo?.totalTax || 0) * 100), // Convert dollars to cents
            },
          },
        ],
      };

      // Perform fraud check
      const fraudCheckResponse = await kountApi.performFraudCheck(
        fraudCheckRequest
      );

      // Store Kount order data for later update calls
      kountData = {
        kountOrderId: fraudCheckResponse.order.orderId,
        transactionId:
          fraudCheckResponse.order.transactions[0]?.transactionId ||
          generateTransactionId(),
      };

      setKountOrderData(kountData);
      setLastFraudCheckData(kountData); // Store as backup for immediate use
      setFraudCheckCompleted(true); // Mark fraud check as completed

      // Save fraud check results to checkout metadata
      const riskInquiry = fraudCheckResponse.order.riskInquiry;
      const persona = riskInquiry.persona;

      const metadataInput = [
        { key: "kount_decision", value: riskInquiry.decision },
        { key: "omniscore", value: riskInquiry.omniscore.toString() },
        { key: "uniqueCards", value: persona.uniqueCards.toString() },
        { key: "uniqueDevices", value: persona.uniqueDevices.toString() },
        { key: "uniqueEmails", value: persona.uniqueEmails.toString() },
        { key: "riskiestCountry", value: persona.riskiestCountry },
        {
          key: "totalBankApprovedOrders",
          value: persona.totalBankApprovedOrders.toString(),
        },
        {
          key: "totalBankDeclinedOrders",
          value: persona.totalBankDeclinedOrders.toString(),
        },
        { key: "maxVelocity", value: persona.maxVelocity.toString() },
        { key: "riskiestRegion", value: persona.riskiestRegion },
      ];

      await updateCheckoutMetadata({
        variables: {
          id: checkoutId,
          input: metadataInput,
        },
      }).catch((error) => {
        // Handle checkout resolution errors immediately
        if (error.message?.includes("Couldn't resolve to a node")) {
          throw new Error(
            "Your checkout session has expired during fraud check. Please refresh the page and try again."
          );
        }
        throw error;
      });

      // Check if decision is DECLINE and if checkout should be blocked
      const { blockCheckout, blockedCheckoutMessage } =
        kountConfig.appConfiguration;
      const decision = riskInquiry.decision;

      if (decision === "DECLINE" && blockCheckout) {
        const errorMessage =
          blockedCheckoutMessage ||
          "Your order cannot be processed due to security concerns. Please contact support for assistance.";

        // Always call the blocked callback to show UI
        if (onCheckoutBlocked) {
          onCheckoutBlocked(errorMessage);
        }

        // Always throw error to stop payment processing completely
        const blockingError = new Error(errorMessage);
        (
          blockingError as Error & { isKountBlocking: boolean }
        ).isKountBlocking = true;
        throw blockingError;
      }
    } catch (error) {
      // If the error is due to blocked checkout, always re-throw to stop payment processing
      if (
        error instanceof Error &&
        (error as Error & { isKountBlocking?: boolean }).isKountBlocking
      ) {
        throw error; // Re-throw blocking error to stop payment processing
      }

      // Handle specific GraphQL/checkout errors
      if (
        error instanceof Error &&
        error.message.includes("Couldn't resolve to a node")
      ) {
        throw new Error(
          "Your checkout session has expired. Please refresh the page and try again."
        );
      }

      // Don't block the payment process if fraud check API fails
    } finally {
      setIsFraudCheckRunning(false);
    }

    // Return the kount data (could be null if fraud check was bypassed or failed)
    return kountData;
  }, [
    kountConfig,
    selectedPaymentGateway,
    lineItems,
    user,
    userEmail,
    guestEmail,
    checkoutId,
    totalAmount,
    shippingAddress,
    billingAddress,
    updateCheckoutMetadata,
    onCheckoutBlocked,
    fraudCheckCompleted,
    setFraudCheckCompleted,
    kountOrderData,
  ]);

  // Function to update Kount order with payment result
  const updateKountOrderStatus = useCallback(
    async (
      isSuccess: boolean,
      paymentToken: string,
      cardNumber: string,
      providedKountData?: { kountOrderId: string; transactionId: string } | null
    ) => {
      // Use provided data first, then fallback to state data
      const dataToUse =
        providedKountData || kountOrderData || lastFraudCheckData;

      if (!dataToUse) {
        return;
      }

      try {
        const bin = cardNumber.replace(/\s/g, "").substring(0, 6);
        const detectedPaymentType = detectPaymentType(
          cardNumber,
          selectedPaymentGateway
        );

        const updateRequest: KountOrderUpdateRequest = {
          kountOrderId: dataToUse.kountOrderId,
          transactions: [
            {
              transactionId: dataToUse.transactionId,
              paymentStatus: isSuccess ? "AUTHORIZED" : "REFUSED",
              authorizationStatus: {
                authResult: isSuccess ? "Approved" : "Declined",
                verificationResponse: {
                  cvvStatus: "Match", // Could be enhanced to detect actual CVV status
                  avsStatus: "Y", // Could be enhanced to detect actual AVS status
                },
              },
              payment: {
                type: detectedPaymentType,
                paymentToken: paymentToken,
                bin: bin,
              },
            },
          ],
        };

        await kountApi.updateKountOrder(updateRequest);
      } catch {
        // Don't fail the payment process if Kount update fails
      }
    },
    [kountOrderData, lastFraudCheckData]
  );

  const processPayment = useCallback(async () => {
    // Prevent duplicate payment processing
    if (isPaymentInProgress) {
      return;
    }

    if (!validateForm()) return;

    // Validate checkout ID exists and is accessible before starting payment
    try {
      const checkoutValidation = await getCheckoutById({
        variables: { id: checkoutId },
      });

      if (!checkoutValidation.data?.checkout) {
        onError(
          "Your checkout session has expired. Please refresh the page and try again."
        );
        return;
      }

      // Check if customer is already attached to this checkout
      const checkout = checkoutValidation.data.checkout;
      if (isLoggedIn && user?.id && checkout.user?.id === user.id) {
        setIsCustomerAttached(true);
      }
    } catch (validationError) {
      if (
        validationError instanceof Error &&
        validationError.message.includes("Couldn't resolve to a node")
      ) {
        onError(
          "Your checkout session has expired. Please refresh the page and try again."
        );
      } else {
        onError(
          "Unable to validate checkout. Please refresh the page and try again."
        );
      }
      return;
    }

    // Check reCAPTCHA verification before payment if enabled
    if (config.isRecaptchaEnabledFor("checkout") && !recaptchaValue) {
      onError(
        "Please complete the reCAPTCHA verification before proceeding with payment."
      );
      return;
    }

    // Set payment in progress flag
    setIsPaymentInProgress(true);

    // Variable to store fraud check data across the whole payment process
    let currentFraudCheckData: {
      kountOrderId: string;
      transactionId: string;
    } | null = null;

    try {
      // STEP 1: FRAUD CHECK FIRST - before any processing or loading states
      currentFraudCheckData = (await performKountFraudCheck()) || null;

      // STEP 2: Only if fraud check passes, start payment processing
      setIsProcessing(true);
      setIsProcessingPayment({
        isModalOpen: true,
        paymentProcessingLoading: true,
        error: false,
        success: false,
      });
    } catch (error) {
      // Handle fraud check blocking error
      if (
        error instanceof Error &&
        (error as Error & { isKountBlocking?: boolean }).isKountBlocking
      ) {
        // Blocked UI is already shown via onCheckoutBlocked callback
        // Just ensure processing states are reset
        setIsProcessing(false);
        setIsPaymentInProgress(false);
        setIsProcessingPayment({
          isModalOpen: false,
          paymentProcessingLoading: false,
          error: false,
          success: false,
        });
        return; // Stop all processing
      }

      // For other fraud check errors, continue with payment
    }

    // Declare paymentToken in broader scope for error handling
    let paymentToken = "";

    try {
      // Call onStartPayment callback if provided
      if (onStartPayment) {
        await onStartPayment();
      }

      // Store selectedShippingId for payment recovery scenarios
      if (selectedShippingId) {
        try {
          const paymentData = {
            selectedShippingId,
            timestamp: Date.now(),
          };
          localStorage.setItem(
            "pendingPaymentData",
            JSON.stringify(paymentData)
          );
        } catch {
          // Continue if storage fails
        }
      }

      // Attach customer if logged in and not already attached
      if (isLoggedIn && user?.email && user?.id && !isCustomerAttached) {
        try {
          await attachCustomer({
            variables: {
              checkoutId,
              customerId: user.id,
            },
          }).catch((error) => {
            // Handle checkout resolution errors immediately
            if (error.message?.includes("Couldn't resolve to a node")) {
              throw new Error(
                "Your checkout session has expired while attaching customer. Please refresh the page and try again."
              );
            }
            // Handle already attached error specifically
            if (
              error.message?.includes(
                "cannot reassign a checkout that is already attached"
              )
            ) {
              setIsCustomerAttached(true);
              return; // Don't throw error, just continue
            }
          });

          // Mark as attached after successful call
          setIsCustomerAttached(true);
        } catch (error) {
          // Re-throw checkout expiration errors, continue for others
          if (
            error instanceof Error &&
            error.message.includes("checkout session has expired")
          ) {
            throw error;
          }
          // Handle already attached error specifically
          if (
            error instanceof Error &&
            error.message.includes(
              "cannot reassign a checkout that is already attached"
            )
          ) {
            setIsCustomerAttached(true);
          }
        }
      }

      // Set delivery method if provided
      if (selectedShippingId) {
        try {
          const deliveryResult = await updateDeliveryMethod({
            variables: {
              id: checkoutId,
              deliveryMethodId: selectedShippingId,
            },
          }).catch((error) => {
            // Handle checkout resolution errors immediately
            if (error.message?.includes("Couldn't resolve to a node")) {
              throw new Error(
                "Your checkout session has expired while setting delivery method. Please refresh the page and try again."
              );
            }
            throw error;
          });

          if (
            deliveryResult.data?.checkoutDeliveryMethodUpdate?.errors?.length
          ) {
            const deliveryErrors =
              deliveryResult.data.checkoutDeliveryMethodUpdate.errors;
            setIsProcessingPayment({
              isModalOpen: false,
              paymentProcessingLoading: false,
              error: true,
              success: false,
            });
            onError(
              `Failed to set delivery method: ${deliveryErrors[0].message}`
            );
            return;
          }
        } catch {
          setIsProcessingPayment({
            isModalOpen: false,
            paymentProcessingLoading: false,
            error: true,
            success: false,
          });
          onError("Failed to set delivery method. Please try again.");
          return;
        }
      }

      // Track payment info event
      if (lineItems.length > 0) {
        const products: Product[] = lineItems.map((item, index) => ({
          item_id: item.id,
          item_name: item.name,
          item_category: item.category || "Products",
          price: item.price,
          quantity: item.quantity,
          currency: "USD",
          index: index,
        }));

        const totalValue = lineItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        const paymentMethodName = selectedPaymentGateway.includes(
          "authorize_net"
        )
          ? "authorize_net"
          : selectedPaymentGateway.includes("stripe")
          ? "stripe"
          : selectedPaymentGateway.includes("dummy")
          ? "dummy"
          : "other";

        gtmAddPaymentInfo(
          products,
          "USD",
          totalValue,
          undefined,
          paymentMethodName,
          gtmConfig?.container_id
        );
      }

      // Step 1: Get selected payment gateway from available gateways or checkout
      let selectedGateway;

      if (filteredPaymentGateways.length > 0) {
        selectedGateway = filteredPaymentGateways.find(
          (gateway) => gateway.id === selectedPaymentGateway
        );
      } else {
        // Fallback: Get gateway from checkout if not provided via props
        const checkoutResult = await getCheckoutById({
          variables: { id: checkoutId },
        });
        selectedGateway =
          checkoutResult.data?.checkout?.availablePaymentGateways?.find(
            (gateway: {
              id: string;
              config?: Array<{ field: string; value: string }>;
            }) => gateway.id === selectedPaymentGateway
          );
      }

      if (!selectedGateway) {
        setIsProcessingPayment({
          isModalOpen: false,
          paymentProcessingLoading: false,
          error: true,
          success: false,
        });
        onError(
          `Selected payment gateway "${selectedPaymentGateway}" is not available`
        );
        return;
      }

      // Step 2: Handle payment based on gateway type

      if (selectedPaymentGateway === "mirumee.payments.authorize_net") {
        // Extract Authorize.Net credentials
        const gatewayConfig = selectedGateway.config || [];
        const clientKey = gatewayConfig.find(
          (c: { field: string; value: string }) => c.field === "client_key"
        )?.value;
        const apiLoginID = gatewayConfig.find(
          (c: { field: string; value: string }) => c.field === "api_login_id"
        )?.value;

        if (!clientKey || !apiLoginID) {
          setIsProcessingPayment({
            isModalOpen: false,
            paymentProcessingLoading: false,
            error: true,
            success: false,
          });
          onError("Authorize.Net credentials not configured properly");
          return;
        }

        // Generate Authorize.Net payment nonce using Accept.js
        paymentToken = await new Promise<string>((resolve, reject) => {
          // Check if Accept.js is loaded
          if (typeof window.Accept === "undefined") {
            reject(
              new Error(
                "Authorize.Net Accept.js not loaded. Please refresh the page and try again."
              )
            );
            return;
          }

          const secureData = {
            cardData: {
              cardNumber: cardData.cardNumber.replace(/\s/g, ""),
              month: cardData.expirationDate.split("/")[0],
              year: "20" + cardData.expirationDate.split("/")[1],
              cardCode: cardData.cardCode,
              fullName: cardData.fullName,
            },
            authData: {
              clientKey,
              apiLoginID,
            },
          };

          window.Accept.dispatchData(
            secureData,
            (response: AuthorizeNetResponse) => {
              if (response.messages.resultCode === "Error") {
                const errorMessage =
                  response.messages.message?.[0]?.text ||
                  "Payment tokenization failed";
                reject(new Error(errorMessage));
              } else {
                // Use the OTS token from Authorize.Net
                resolve(response.opaqueData?.dataValue || "");
              }
            }
          );
        });
      } else if (selectedPaymentGateway === "saleor.app.payment.stripe") {
        // For Stripe, we would handle Stripe Elements integration here
        // For now, we'll use a placeholder token
        paymentToken = "stripe_payment_token_placeholder";
      } else if (selectedPaymentGateway.includes("dummy")) {
        // For dummy payment gateways, use a test token
        paymentToken = "dummy_payment_token";
      } else {
        setIsProcessingPayment({
          isModalOpen: false,
          paymentProcessingLoading: false,
          error: true,
          success: false,
        });
        onError(
          `Payment gateway "${selectedPaymentGateway}" is not supported yet`
        );
        return;
      }

      // Step 3: Create payment with token

      const paymentResult = await checkoutPaymentCreate({
        variables: {
          checkoutId,
          input: {
            gateway: selectedPaymentGateway,
            token: paymentToken,
            amount: totalAmount,
          },
        },
      }).catch((error) => {
        // Handle checkout resolution errors immediately
        if (error.message?.includes("Couldn't resolve to a node")) {
          throw new Error(
            "Your checkout session has expired. Please refresh the page and try again."
          );
        }
        throw error;
      });

      if (paymentResult.data?.checkoutPaymentCreate?.errors?.length) {
        const paymentErrors = paymentResult.data.checkoutPaymentCreate.errors;
        setIsProcessingPayment({
          isModalOpen: false,
          paymentProcessingLoading: false,
          error: true,
          success: false,
        });
        onError(`Payment creation failed: ${paymentErrors[0].message}`);
        return;
      }

      if (!paymentResult.data?.checkoutPaymentCreate?.payment) {
        setIsProcessingPayment({
          isModalOpen: false,
          paymentProcessingLoading: false,
          error: true,
          success: false,
        });
        onError("Payment creation failed: No payment was created");
        return;
      }

      // Step 4: Complete checkout

      const result = await checkoutComplete({
        variables: {
          checkoutId,
        },
      }).catch((error) => {
        // Handle checkout resolution errors immediately
        if (error.message?.includes("Couldn't resolve to a node")) {
          throw new Error(
            "Your checkout session has expired during payment completion. Please refresh the page and try again."
          );
        }
        throw error;
      });

      const { order, errors } = result.data?.checkoutComplete || {};

      if (errors && errors.length > 0) {
        const errorMessage = errors.map((e) => e.message).join(", ");
        setIsProcessingPayment({
          isModalOpen: false,
          paymentProcessingLoading: false,
          error: true,
          success: false,
        });
        onError(`Checkout completion failed: ${errorMessage}`);
        return;
      }

      if (order) {
        // Update Kount with successful payment
        // Use the fraud check data returned from the fraud check function since state might not be updated yet
        await updateKountOrderStatus(
          true,
          paymentToken,
          cardData.cardNumber,
          currentFraudCheckData
        );

        setIsProcessingPayment({
          isModalOpen: false,
          paymentProcessingLoading: false,
          error: false,
          success: true,
        });

        const orderId = order.id;
        const orderNumber = order.number;
        const orderTotal = order.total.gross.amount;

        router.push(
          `/order-confirmation?orderId=${orderId}&orderNumber=${orderNumber}&total=${orderTotal}`
        );
        onSuccess();
      } else {
        setIsProcessingPayment({
          isModalOpen: false,
          paymentProcessingLoading: false,
          error: true,
          success: false,
        });
        onError(
          "Payment completed but no order was created. Please contact support."
        );
      }
    } catch (error) {
      // Update Kount with failed payment if we have payment token
      if (paymentToken) {
        await updateKountOrderStatus(
          false,
          paymentToken,
          cardData.cardNumber,
          currentFraudCheckData
        );
      }

      setIsProcessingPayment({
        isModalOpen: false,
        paymentProcessingLoading: false,
        error: true,
        success: false,
      });

      if (error instanceof Error) {
        // Handle specific checkout expiration errors with user-friendly message
        if (
          error.message.includes("Couldn't resolve to a node") ||
          error.message.includes("checkout session has expired")
        ) {
          onError(
            "Your checkout session has expired. Please refresh the page and try again."
          );
        } else {
          onError(`Payment failed: ${error.message}`);
        }
      } else {
        onError("An unexpected error occurred during payment processing.");
      }

      // Reset reCAPTCHA on error
      setRecaptchaValue(null);
      resetRecaptcha();
    } finally {
      setIsProcessing(false);
      setIsPaymentInProgress(false);
    }
  }, [
    validateForm,
    cardData,
    checkoutId,
    totalAmount,
    onStartPayment,
    isLoggedIn,
    user,
    attachCustomer,
    lineItems,
    selectedShippingId,
    checkoutPaymentCreate,
    checkoutComplete,
    router,
    onSuccess,
    onError,
    setIsProcessingPayment,
    updateDeliveryMethod,
    getCheckoutById,
    recaptchaValue,
    resetRecaptcha,
    setRecaptchaValue,
    performKountFraudCheck,
    onCheckoutBlocked,
    updateKountOrderStatus,
    isPaymentInProgress,
    isCustomerAttached,
    setIsCustomerAttached,
    setLastFraudCheckData,
    fraudCheckCompleted,
    setFraudCheckCompleted,
  ]);

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await processPayment();
    },
    [processPayment]
  );

  // Store processPayment in a ref to avoid infinite loop
  const processPaymentRef = useRef(processPayment);
  useEffect(() => {
    processPaymentRef.current = processPayment;
  }, [processPayment]);

  // Expose payment trigger function to parent - only call once
  useEffect(() => {
    if (onPaymentReady) {
      const triggerPayment = () => processPaymentRef.current();
      onPaymentReady(triggerPayment);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPaymentReady]);

  // Show loading state initially to match original behavior
  if (isProcessing) {
    return (
      <div className="space-y-4">
        <LoadingUI className="h-32" />
        <p className="text-center text-sm text-[var(--color-secondary-600)]">
          Processing payment...
        </p>
      </div>
    );
  }

  // Check if PayPal is selected
  const isPayPalSelected =
    selectedPaymentGateway === "saleor.app.payment.paypal";

  // Check if Affirm is selected
  const isAffirmSelected = selectedPaymentGateway === "saleor.app.affirm";

  // For PayPal, we don't use the form submit approach
  if (isPayPalSelected) {
    return (
      <div className="">
        {/* Payment Method Selection */}
        {filteredPaymentGateways.length > 0 && (
          <div
            className={`bg-white border border-[var(--color-secondary-200)] p-4 ${
              disabled ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredPaymentGateways.map((gateway) => (
                <label
                  key={gateway.id}
                  className={`relative flex items-center gap-3 ring-1 p-2 transition-all duration-200 ${
                    disabled
                      ? "cursor-not-allowed opacity-50 pointer-events-none"
                      : "cursor-pointer"
                  } ${
                    selectedPaymentGateway === gateway.id
                      ? "ring-[var(--color-primary-100)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)] accent-[var(--color-primary-600)]"
                      : "ring-gray-300 hover:bg-gray-50"
                  } ${disabled ? "" : "hover:bg-gray-50"}`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    className="absolute w-full h-full opacity-0"
                    value={gateway.id}
                    checked={selectedPaymentGateway === gateway.id}
                    onChange={(e) => setSelectedPaymentGateway(e.target.value)}
                    disabled={disabled}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    {getPaymentGatewayIcon(gateway.id)}
                    <span className="font-medium text-base/none font-secondary">
                      {getPaymentGatewayDisplayName(gateway.name)}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
        <div
          className={`bg-white border border-[var(--color-secondary-200)] p-4 ${
            disabled ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          {/* PayPal Payment Component */}
          <PayPalPayment
            checkoutId={checkoutId}
            totalAmount={totalAmount}
            currency="USD"
            onSuccess={onSuccess}
            onError={onError}
            setIsProcessingPayment={setIsProcessingPayment}
            userEmail={userEmail}
            guestEmail={guestEmail}
            termsAccepted={termsAccepted}
            termsData={termsData}
            onTermsModalOpen={onTermsModalOpen}
            onTermsAcceptedChange={onTermsAcceptedChange}
            questionsValid={questionsValid}
          />
        </div>
      </div>
    );
  }

  // For Affirm, we don't use the form submit approach
  if (isAffirmSelected) {
    return (
      <div className="">
        {/* Payment Method Selection */}
        {filteredPaymentGateways.length > 0 && (
          <div
            className={`bg-white border border-[var(--color-secondary-200)] p-4 ${
              disabled ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredPaymentGateways.map((gateway) => (
                <label
                  key={gateway.id}
                  className={`flex items-center gap-3 ring-1 p-2 transition-all duration-200 ${
                    selectedPaymentGateway === gateway.id
                      ? "ring-[var(--color-primary-600)] bg-[var(--color-primary-50)]"
                      : "ring-[var(--color-secondary-200)] hover:ring-[var(--color-secondary-300)]"
                  } cursor-pointer`}
                >
                  <input
                    type="radio"
                    name="paymentGateway"
                    value={gateway.id}
                    checked={selectedPaymentGateway === gateway.id}
                    onChange={(e) => setSelectedPaymentGateway(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-2">
                    {getPaymentGatewayIcon(gateway.id)}
                    <span className="text-sm font-medium text-[var(--color-secondary-800)]">
                      {getPaymentGatewayDisplayName(gateway.name)}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
        <div
          className={`bg-white border border-[var(--color-secondary-200)] p-4 ${
            disabled ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          {/* Affirm Payment Component */}
          <AffirmPayment
            checkoutId={checkoutId}
            totalAmount={totalAmount}
            currency="USD"
            onSuccess={onSuccess}
            onError={onError}
            setIsProcessingPayment={setIsProcessingPayment}
            userEmail={userEmail}
            guestEmail={guestEmail}
            termsAccepted={termsAccepted}
            termsData={termsData}
            onTermsModalOpen={onTermsModalOpen}
            onTermsAcceptedChange={onTermsAcceptedChange}
            questionsValid={questionsValid}
          />
        </div>
      </div>
    );
  }

  // For other payment methods (Authorize.Net, Stripe, etc.), show card form
  return (
    <div className="space-y-6">
      <form onSubmit={handleFormSubmit}>
        {/* Payment Method Selection */}
        {filteredPaymentGateways.length > 0 && (
          <div
            className={`bg-white border border-[var(--color-secondary-200)] p-4 ${
              disabled ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredPaymentGateways.map((gateway) => (
                <label
                  key={gateway.id}
                  className={`flex items-center gap-3 ring-1 p-2 transition-all duration-200 ${
                    disabled
                      ? "cursor-not-allowed opacity-50 pointer-events-none"
                      : "cursor-pointer"
                  } ${
                    selectedPaymentGateway === gateway.id
                      ? "ring-[var(--color-primary-100)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)] accent-[var(--color-primary-600)]"
                      : "ring-gray-300 hover:bg-gray-50"
                  } ${disabled ? "" : "hover:bg-gray-50"}`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={gateway.id}
                    checked={selectedPaymentGateway === gateway.id}
                    onChange={(e) => setSelectedPaymentGateway(e.target.value)}
                    disabled={disabled}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    {getPaymentGatewayIcon(gateway.id)}
                    <span className="font-medium text-base/none font-secondary">
                      {getPaymentGatewayDisplayName(gateway.name)}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        <div
          className={`bg-white border border-[var(--color-secondary-200)] p-4 ${
            disabled ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          <div className="space-y-4">
            {/* Cardholder Name */}
            <div>
              <Input
                name="fullName"
                label="Cardholder Name"
                htmlFor="fullName"
                type="text"
                id="fullName"
                value={cardData.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                className={`w-full ${
                  validationErrors.fullName
                    ? "border-red-300 focus:ring-red-500"
                    : "border-[var(--color-secondary-300)]"
                } py-2`}
                placeholder="John Doe"
                disabled={disabled}
              />
              {validationErrors.fullName && (
                <p className="text-red-500 text-xs mt-1">
                  {validationErrors.fullName}
                </p>
              )}
            </div>

            {/* Card Number */}
            <div>
              <Input
                name="cardNumber"
                label="Card Number"
                htmlFor="cardNumber"
                type="text"
                id="cardNumber"
                value={cardData.cardNumber}
                onChange={(e) =>
                  handleInputChange("cardNumber", e.target.value)
                }
                className={`w-full ${
                  validationErrors.cardNumber
                    ? "border-red-300 focus:ring-red-500"
                    : "border-[var(--color-secondary-300)]"
                } py-2`}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                disabled={disabled}
              />
              {validationErrors.cardNumber && (
                <p className="text-red-500 text-xs mt-1">
                  {validationErrors.cardNumber}
                </p>
              )}
            </div>

            {/* Expiration Date and Security Code */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  name="expirationDate"
                  label="Expiration Date"
                  htmlFor="expirationDate"
                  type="text"
                  id="expirationDate"
                  value={cardData.expirationDate}
                  onChange={(e) =>
                    handleInputChange("expirationDate", e.target.value)
                  }
                  className={`w-full ${
                    validationErrors.expirationDate
                      ? "border-red-300 focus:ring-red-500"
                      : "border-[var(--color-secondary-300)]"
                  } py-2`}
                  placeholder="MM/YY"
                  maxLength={5}
                  disabled={disabled}
                />
                {validationErrors.expirationDate && (
                  <p className="text-red-500 text-xs mt-1">
                    {validationErrors.expirationDate}
                  </p>
                )}
              </div>

              <div>
                <Input
                  name="cardCode"
                  label="Security Code"
                  htmlFor="cardCode"
                  type="text"
                  id="cardCode"
                  value={cardData.cardCode}
                  onChange={(e) =>
                    handleInputChange("cardCode", e.target.value)
                  }
                  className={`w-full ${
                    validationErrors.cardCode
                      ? "border-red-300 focus:ring-red-500"
                      : "border-[var(--color-secondary-300)]"
                  } py-2`}
                  placeholder="123"
                  maxLength={4}
                  disabled={disabled}
                />
                {validationErrors.cardCode && (
                  <p className="text-red-500 text-xs mt-1">
                    {validationErrors.cardCode}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Conditional reCAPTCHA for checkout */}
        {config.isRecaptchaEnabledFor("checkout") && (
          <div className="flex flex-col items-start py-4">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={config.getGoogleRecaptchaConfig()?.site_key || ""}
              theme="light"
              size="normal"
              onChange={(value) => {
                setRecaptchaValue(value);
                // Clear recaptcha error when user completes it
                if (value && validationErrors.recaptcha) {
                  setValidationErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.recaptcha;
                    return newErrors;
                  });
                }
              }}
              onExpired={() => {
                setRecaptchaValue(null);
                resetRecaptcha();
              }}
              onError={() => {
                setRecaptchaValue(null);
                resetRecaptcha();
              }}
            />
            {validationErrors.recaptcha && (
              <p className="text-red-500 text-xs mt-2 text-center">
                {validationErrors.recaptcha}
              </p>
            )}
          </div>
        )}

        {/* reCAPTCHA Notice - only show when reCAPTCHA is enabled */}
        {config.isRecaptchaEnabledFor("checkout") && (
          <div className="text-xs text-[var(--color-secondary-600)] text-center py-2">
            This site is protected by reCAPTCHA and the Google{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Privacy Policy
            </a>{" "}
            and{" "}
            <a
              href="https://policies.google.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Terms of Service
            </a>{" "}
            apply.
          </div>
        )}

        {/* Terms and Conditions */}
        {termsData?.page?.isPublished && (
          <div className="flex items-start gap-2 w-full py-2">
            <input
              style={{ accentColor: "var(--color-primary-600)" }}
              type="checkbox"
              id="termsAcceptedPayment"
              className="w-5 h-5 cursor-pointer mt-0.5"
              checked={termsAccepted}
              onChange={(e) => onTermsAcceptedChange?.(e.target.checked)}
            />
            <label
              htmlFor="termsAcceptedPayment"
              style={{ color: "var(--color-secondary-600)" }}
              className="text-sm lg:text-base tracking-[-0.04px] cursor-pointer"
            >
              I agree to the{" "}
              <button
                type="button"
                onClick={onTermsModalOpen}
                className="font-semibold text-[var(--color-primary-500)] hover:underline focus:underline focus:outline-none"
              >
                Terms and Conditions
              </button>
            </label>
          </div>
        )}

        {/* Payment Button - Moved to OrderSummary */}
      </form>
    </div>
  );
}
