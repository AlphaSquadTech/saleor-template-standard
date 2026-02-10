"use client";
import AddressManagement from "@/app/components/checkout/AddressManagement";
import CheckoutHeader from "@/app/components/checkout/CheckoutHeader";
import ContactDetailsSection from "@/app/components/checkout/ContactDetailsSection";
import DeliveryMethodSection from "@/app/components/checkout/DeliveryMethodSection";
import DealerShippingSection from "@/app/components/checkout/DealerShippingSection";
import WillCallSection from "@/app/components/checkout/WillCallSection";
import OrderSummary from "@/app/components/checkout/OrderSummary";
import PaymentStep from "@/app/components/checkout/paymentStep";
import CheckoutQuestions from "@/app/components/checkout/CheckoutQuestions";
import CheckoutTermsModal from "@/app/components/checkout/CheckoutTermsModal";
import { 
  GET_CHECKOUT_TERMS_AND_CONDITIONS, 
  type CheckoutTermsAndConditionsResponse 
} from "@/graphql/queries/getCheckoutTermsAndConditions";
import {
  ACCOUNT_SET_DEFAULT_ADDRESS,
  type AccountSetDefaultAddressData,
  type AccountSetDefaultAddressVars,
} from "@/graphql/mutations/accountSetDefaultAddress";
import {
  CHECKOUT_BILLING_ADDRESS_UPDATE,
  CHECKOUT_DELIVERY_METHOD_UPDATE,
} from "@/graphql/mutations/checkout";
import {
  ADD_VOUCHER_TO_CHECKOUT,
  REMOVE_VOUCHER_FROM_CHECKOUT,
} from "@/graphql/mutations/checkoutAddVoucher";
import { CHECKOUT_EMAIL_UPDATE } from "@/graphql/mutations/checkoutEmailUpdate";
import {
  GET_CHECKOUT_DETAILS,
  GET_CHECKOUT_SHIPPING_METHODS,
  GET_PAYMENT_GATEWAYS,
} from "@/graphql/queries/checkout";
import {
  GET_CHECKOUT_COLLECTION_POINTS,
  type GetCheckoutCollectionPointsData,
  type GetCheckoutCollectionPointsVars,
  type CollectionPoint,
} from "@/graphql/queries/willCallCollectionPoints";
import {
  CHECKOUT_DELIVERY_METHOD_UPDATE_WILL_CALL,
  type WillCallDeliveryMethodUpdateData,
  type WillCallDeliveryMethodUpdateVars,
} from "@/graphql/mutations/willCallDeliveryMethod";
import {
  ME_ADDRESSES_QUERY,
  type MeAddressesData,
} from "@/graphql/queries/meAddresses";
import {
  AddressForm,
  type PaymentProcessingState,
  type KountConfigResponse,
} from "@/graphql/types/checkout";
import { useGlobalStore } from "@/store/useGlobalStore";
import { useMutation, useQuery, useApolloClient, gql } from "@apollo/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EmptyState from "../components/reuseableUI/emptyState";
import LoadingUI from "../components/reuseableUI/loadingUI";
import { gtmAddShippingInfo, Product } from "../utils/googleTagManager";
import { useAppConfiguration } from "../components/providers/ServerAppConfigurationProvider";
import { kountApi } from "@/lib/api/kount";

/* ----------------- small helpers ----------------- */
const shallowEq = (
  a: Record<string, unknown> | null,
  b: Record<string, unknown> | null
) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (a[k] !== b[k]) return false;
  return true;
};
const isMethodAvailable = (id: string | null, list: ShippingMethod[]) =>
  !!(id && list.some((m) => m.id === id));

// Product restriction validation helpers
interface MetadataItem {
  key: string;
  value: string;
}

interface ProductData {
  name: string;
  metadata: MetadataItem[];
}

interface VariantData {
  product: ProductData;
}

interface CheckoutLineData {
  variant: VariantData;
}

interface CheckoutData {
  lines: CheckoutLineData[];
}

const checkProductRestrictions = (
  checkoutData: CheckoutData,
  userState: string,
  userZipCode: string
): Array<{ productName: string; checkoutMessage: string }> => {
  const restrictions: Array<{ productName: string; checkoutMessage: string }> = [];
  
  if (!checkoutData?.lines) return restrictions;

  checkoutData.lines.forEach((line: CheckoutLineData) => {
    const product = line.variant?.product;
    if (!product?.metadata) return;

    const metadata = product.metadata;
    let restrictedStates: string[] = [];
    let restrictedZipCodes: (string | number)[] = [];
    let checkoutMessage = '';
    let shippingIsActive = false;

    // Parse metadata
    metadata.forEach((meta: MetadataItem) => {
      if (meta.key === 'restricted_states' && meta.value) {
        try {
          restrictedStates = JSON.parse(meta.value);
        } catch {
          console.warn('Failed to parse restricted_states:', meta.value);
        }
      }
      if (meta.key === 'restricted_zip_codes' && meta.value) {
        try {
          restrictedZipCodes = JSON.parse(meta.value);
        } catch {
          console.warn('Failed to parse restricted_zip_codes:', meta.value);
        }
      }
      if (meta.key === 'checkout_message' && meta.value) {
        checkoutMessage = meta.value;
      }
      if (meta.key === 'shipping_isactive' && meta.value) {
        shippingIsActive = meta.value.toLowerCase() === 'true';
      }
    });

    // Only apply restrictions if shipping_isactive is true
    if (!shippingIsActive) {
      return;
    }

    // Check if user's state or zip code matches restrictions
    const stateMatches = userState && restrictedStates.includes(userState.toUpperCase());
    const zipMatches = userZipCode && restrictedZipCodes.some(zip => 
      String(zip) === userZipCode || String(zip) === userZipCode.split('-')[0]
    );

    if ((stateMatches || zipMatches) && checkoutMessage) {
      restrictions.push({
        productName: product.name,
        checkoutMessage
      });
    }
  });

  return restrictions;
};

/** NEW: timing + retry helpers */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 4,
  baseDelayMs = 250
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      // exp backoff + small jitter
      const delay = baseDelayMs * Math.pow(2, i) + Math.floor(Math.random() * 50);
      await sleep(delay);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Operation failed after retries");
}

/* ----------------- types ----------------- */

interface DeliveryMethodError extends Error {
  isDeliveryMethodError: boolean;
}

function createDeliveryMethodError(message: string): DeliveryMethodError {
  const error = new Error(message) as DeliveryMethodError;
  error.isDeliveryMethodError = true;
  return error;
}

type AddressInputTS = {
  firstName: string;
  lastName: string;
  streetAddress1: string;
  city: string;
  postalCode: string;
  country: string;
  countryArea?: string;
  phone?: string | null;
};
type AccountAddressLite = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  streetAddress1?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: { code?: string | null; country?: string | null } | null;
  countryArea?: string | null;
  phone?: string | null;
  companyName?: string | null;
};
type ShippingMethod = {
  id: string;
  name: string;
  price: { amount: number; currency: string };
  minimumDeliveryDays?: number | null;
  maximumDeliveryDays?: number | null;
};
interface GraphQLShippingMethod {
  id: string;
  name: string;
  price: { amount: number; currency: string };
  minimumDeliveryDays?: number | null;
  maximumDeliveryDays?: number | null;
}
interface GraphQLShippingMethodsResponse {
  data?: { checkout?: { availableShippingMethods?: GraphQLShippingMethod[] } };
  errors?: Array<{ message: string }>;
}

/* ----------------- Checkout Page ----------------- */
const DEBUG_HALT_AFTER_PAYMENT = false;

export default function CheckoutPage() {
  const {
    cartItems: items,
    totalAmount,
    isLoggedIn,
    guestEmail,
    guestShippingInfo,
    checkoutId,
    setCheckoutId,
    checkoutToken,
    setCheckoutToken,
    selectedShippingMethodId: globalSelectedShippingId,
    setSelectedShippingMethodId,
  } = useGlobalStore();
  const user = useGlobalStore((state) => state.user);
  const { getGoogleTagManagerConfig, isWillCallEnabled } = useAppConfiguration();
  const gtmConfig = getGoogleTagManagerConfig();
  const route = useRouter();
  const apolloClient = useApolloClient();
  const [isClient, setIsClient] = useState(false);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [userHasSelectedDelivery, setUserHasSelectedDelivery] = useState<boolean>(false);
  const [isProcessingSelection, setIsProcessingSelection] = useState(false);
  const [useShippingAsBilling, setUseShippingAsBilling] = useState<boolean>(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState<PaymentProcessingState>({
    isModalOpen: false,
    paymentProcessingLoading: false,
    error: false,
    success: false,
  });
  const [saleorTotal, setSaleorTotal] = useState<number | null>(null);
  const [taxInfo, setTaxInfo] = useState<{
    totalTax: number;
    shippingTax: number;
    subtotalNet: number;
    shippingNet: number;
    currency: string;
  } | null>(null);

  // NEW: fine-grained UX flags + race control
  const [isUpdatingDelivery, setIsUpdatingDelivery] = useState(false);
  const [isCalculatingTotal, setIsCalculatingTotal] = useState(false);
  const [isRecoveringDelivery, setIsRecoveringDelivery] = useState(false);
  const [isCalculatingTax, setIsCalculatingTax] = useState(false);
  const [paymentTriggerFn, setPaymentTriggerFn] = useState<{ fn: (() => Promise<void>) | null }>({ fn: null });



  // Dealer shipping state
  const [isShipToDealer, setIsShipToDealer] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<{
    id: string;
    name: string;
    address: {
      streetAddress1?: string;
      city?: string;
      postalCode?: string;
      countryArea?: string;
      country?: { country?: string; code?: string };
    };
    phone?: string;
    distance?: string;
    hours?: string;
    comments?: string;
    state?: string;
  } | null>(null);

  // Checkout questions state
  const [, setCheckoutQuestionAnswers] = useState<Record<string, string>>({});
  const [areCheckoutQuestionsValid, setAreCheckoutQuestionsValid] = useState(true);
  const [saveCheckoutQuestions, setSaveCheckoutQuestions] = useState<(() => Promise<void>) | null>(null);

  // Terms and conditions state
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  // Product restriction state
  const [productRestrictions, setProductRestrictions] = useState<Array<{
    productName: string;
    checkoutMessage: string;
  }>>([]);
  const [hasRestrictionViolations, setHasRestrictionViolations] = useState(false);

  // Voucher state
  const [voucherInfo, setVoucherInfo] = useState<{
    voucherCode: string | null;
    discount: { amount: number; currency: string } | null;
  } | null>(null);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  // Kount fraud detection state
  const [kountConfig, setKountConfig] = useState<KountConfigResponse | null>(null);
  const [_isKountConfigLoading, setIsKountConfigLoading] = useState(false);
  const [_kountConfigError, setKountConfigError] = useState<string | null>(null);

  // Will Call state
  const [collectionPoints, setCollectionPoints] = useState<CollectionPoint[]>([]);
  const [selectedCollectionPointId, setSelectedCollectionPointId] = useState<string | null>(null);
  const [isWillCallSelected, setIsWillCallSelected] = useState(false);
  const [willCallLoading, setWillCallLoading] = useState(false);
  const [willCallError, setWillCallError] = useState<string | null>(null);

  // Query for terms and conditions page
  const { data: termsData } = useQuery<CheckoutTermsAndConditionsResponse>(
    GET_CHECKOUT_TERMS_AND_CONDITIONS,
    {
      variables: { slug: "checkout-terms-and-conditions" },
      fetchPolicy: "cache-first",
    }
  );

  // Request deduplication refs
  const fetchingMethodsRef = useRef(false);
  const updatingDeliveryRef = useRef(false);
  const totalsAbortRef = useRef<AbortController | null>(null);
  const lastAddressHashRef = useRef<string>("");
  const lastFetchedAtRef = useRef<number>(0); // NEW: throttle repeated fetches
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null); // NEW: debounce validation
  const addressHashAttemptedRef = useRef<Set<string>>(new Set()); // Track addresses we've attempted

  const [shippingInfo, setShippingInfo] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    email: "",
    phone: "",
    country: "US",
  });

  // Email validation function
  const validateEmail = useCallback((email: string) => {
    if (!email || email.trim() === '') {
      return "Email address is required.";
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address.";
    }
    
    return null; // No error
  }, []);

  // Helper function to handle GraphQL errors and checkout session issues
  const handleGraphQLError = useCallback((error: Error | unknown, operation: string = "operation") => {
    const errorMessage = (error instanceof Error ? error.message : String(error));
    
    // Check for "Couldn't resolve to a node" error which indicates expired/invalid checkout session
    if (errorMessage.includes("Couldn't resolve to a node")) {
      const userFriendlyMessage = `Your checkout session has expired. Please refresh the page to start a new checkout session.`;
      console.error(`${operation} failed: Checkout session expired`, error);
      return new Error(userFriendlyMessage);
    }
    
    // Check for other common session/auth errors
    if (errorMessage.includes("session") || errorMessage.includes("expired") || 
        errorMessage.includes("401") || errorMessage.includes("403")) {
      const userFriendlyMessage = `Your session has expired. Please refresh the page and try again.`;
      console.error(`${operation} failed: Session expired`, error);
      return new Error(userFriendlyMessage);
    }
    
    // Check for network errors
    if (errorMessage.includes("network") || errorMessage.includes("Failed to fetch") || 
        errorMessage.includes("NetworkError")) {
      const userFriendlyMessage = `Network connection issue. Please check your connection and try again.`;
      console.error(`${operation} failed: Network error`, error);
      return new Error(userFriendlyMessage);
    }
    
    // Default error handling
    console.error(`${operation} failed:`, error);
    return new Error(errorMessage || `${operation} failed. Please try again.`);
  }, []);

  // NEW: Add postal code validation
  const isValidPostalCode = useCallback((postalCode: string, country: string) => {
    if (!postalCode || !country) return false;

    const trimmedCode = postalCode.trim();
    if (trimmedCode.length === 0) return false;

    // Common postal code patterns
    const patterns = {
      US: /^\d{5}(-\d{4})?$/, // 12345 or 12345-6789
      CA: /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/, // A1A 1A1 or A1A1A1
      UK: /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/, // Various UK formats
      AU: /^\d{4}$/, // 1234
      DE: /^\d{5}$/, // 12345
      FR: /^\d{5}$/, // 12345
      JP: /^\d{3}-?\d{4}$/, // 123-4567 or 1234567
      PK: /^\d{5}$/, // 12345
    };

    const pattern = patterns[country as keyof typeof patterns];
    if (pattern) {
      return pattern.test(trimmedCode);
    }

    // Generic fallback: allow alphanumeric postal codes 3-10 characters
    return /^[A-Za-z0-9\s-]{3,10}$/.test(trimmedCode);
  }, []);

  const missingForDelivery = useMemo(() => {
    const miss: string[] = [];
    if (!shippingInfo.firstName) miss.push("First name");
    if (!shippingInfo.lastName) miss.push("Last name");
    if (!shippingInfo.address) miss.push("Street address");
    if (!shippingInfo.city) miss.push("City");
    if (!shippingInfo.zipCode) miss.push("Postal code");
    else if (!isValidPostalCode(shippingInfo.zipCode, shippingInfo.country)) {
      miss.push("Valid postal code");
    }
    if (!shippingInfo.country) miss.push("Country");
    return miss;
  }, [shippingInfo, isValidPostalCode]);

  const [billingInfo, setBillingInfo] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "US",
    phone: "",
    email: "",
  });

  const [formData, setFormData] = useState<AddressForm>({
    firstName: "",
    lastName: "",
    phone: "",
    companyName: "",
    streetAddress1: "",
    streetAddress2: "",
    city: "",
    postalCode: "",
    country: "US",
    countryArea: "",
  });

  useEffect(() => setIsClient(true), []);

  // Fetch Kount configuration on component mount
  useEffect(() => {
    if (!isClient) return;
    
    const fetchKountConfig = async () => {
      setIsKountConfigLoading(true);
      setKountConfigError(null);
      
      try {
        const config = await kountApi.getKountConfig();
        setKountConfig(config);
      } catch (error) {
        // Silently handle Kount config errors as it's optional in some environments
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch fraud detection configuration';
        setKountConfigError(errorMessage);
        // Only log if it's not a 404 (which is expected when Kount is not configured)
        if (!errorMessage.includes('not configured')) {
          console.error('Failed to fetch Kount configuration:', error);
        }
      } finally {
        setIsKountConfigLoading(false);
      }
    };

    fetchKountConfig();
  }, [isClient]);

  const resetCheckoutState = useCallback(() => {
    setShippingMethods([]);
    setShippingLoading(false);
    setShippingError(null);
    setSelectedShippingId(null);
    setUserHasSelectedDelivery(false);
    setIsUpdatingDelivery(false);
    setIsCalculatingTotal(false);
    setIsRecoveringDelivery(false);
    setIsCalculatingTax(false);
    setSaleorTotal(null);
    setTaxInfo(null); // Reset tax information

    fetchingMethodsRef.current = false;
    updatingDeliveryRef.current = false;
    lastAddressHashRef.current = "";
    lastDeliveryRef.current = null;
    lastShippingRef.current = null;
    lastBillingRef.current = null;
    lastFetchedAtRef.current = 0; // Reset fetch timing
    addressHashAttemptedRef.current.clear(); // Clear attempted addresses

    setSelectedShippingMethodId(null);

    if (totalsAbortRef.current) {
      totalsAbortRef.current.abort();
      totalsAbortRef.current = null;
    }

    // Clear any pending validation timeouts
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
      validationTimeoutRef.current = null;
    }
  }, [setSelectedShippingMethodId]);

  useEffect(() => {
    if (!isClient) return;
    try {
      const url = new URL(window.location.href);
      const idFromUrl = url.searchParams.get("checkoutId");
      const idFromStorage = localStorage.getItem("checkoutId");
      const tokenFromStorage = localStorage.getItem("checkoutToken");
      const effective = idFromUrl || idFromStorage || null;

      // If checkout ID is changing, clear shipping method selection
      if (effective && effective !== checkoutId) {
        setCheckoutId(effective);
        setSelectedShippingMethodId(null);

        // begin_checkout event is now tracked on cart page when user clicks "Proceed to Checkout"
      }

      if (tokenFromStorage && tokenFromStorage !== checkoutToken)
        setCheckoutToken?.(tokenFromStorage);
      if (idFromUrl && idFromUrl !== idFromStorage)
        localStorage.setItem("checkoutId", idFromUrl);
    } catch { }
  }, [isClient, checkoutId, checkoutToken, setCheckoutId, setCheckoutToken, setSelectedShippingMethodId]);

  const endpoint = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_API_URL || "/api/graphql";
    const lower = raw.trim().toLowerCase();
    return /\/graphql\/?$/.test(lower) ? raw.trim() : raw.replace(/\/+$/, "") + "/graphql";
  }, []);

  const updateShippingAddress = useCallback(
    async (id: string, addr: AddressInputTS) => {
      const variables = { checkoutId: id, shippingAddress: addr };
      
      // Enhanced query to include tax information
      const enhancedQuery = `
        mutation CheckoutShippingAddressUpdate($checkoutId: ID!, $shippingAddress: AddressInput!) {
          checkoutShippingAddressUpdate(checkoutId: $checkoutId, shippingAddress: $shippingAddress) {
            checkout {
              id
              shippingAddress {
                streetAddress1
                city
                postalCode
                country {
                  code
                }
                countryArea
              }
              totalPrice {
                gross {
                  amount
                  currency
                }
                net {
                  amount
                  currency
                }
                tax {
                  amount
                  currency
                }
              }
              shippingPrice {
                gross {
                  amount
                  currency
                }
                net {
                  amount
                  currency
                }
                tax {
                  amount
                  currency
                }
              }
              subtotalPrice {
                gross {
                  amount
                  currency
                }
                net {
                  amount
                  currency
                }
                tax {
                  amount
                  currency
                }
              }
              lines {
                quantity
                totalPrice {
                  gross {
                    amount
                    currency
                  }
                  net {
                    amount
                    currency
                  }
                  tax {
                    amount
                    currency
                  }
                }
                variant {
                  id
                  name
                }
              }
            }
            errors {
              field
              message
            }
          }
        }
      `;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: enhancedQuery, variables }),
      });
      if (!res.ok) throw new Error("Failed to update shipping address");
      const json = await res.json();
      const errs = json.data?.checkoutShippingAddressUpdate?.errors as Array<{ message?: string }> | undefined;
      if (errs?.length) throw new Error(errs[0]?.message || "Shipping address update error");
      
      // Extract and store tax information
      const checkout = json.data?.checkoutShippingAddressUpdate?.checkout;
      if (checkout) {
        try {
          const subtotalTax = checkout.subtotalPrice?.tax?.amount || 0;
          const shippingTax = checkout.shippingPrice?.tax?.amount || 0;
          const subtotalNet = checkout.subtotalPrice?.net?.amount || 0;
          const shippingNet = checkout.shippingPrice?.net?.amount || 0;
          const currency = checkout.totalPrice?.gross?.currency || 'USD';
          
  
          
          setTaxInfo({
            totalTax: subtotalTax,
            shippingTax,
            subtotalNet,
            shippingNet,
            currency
          });

          // Update the Saleor total with the gross amount including tax
          const grossTotal = checkout.totalPrice?.gross?.amount;
          if (typeof grossTotal === 'number') {
            setSaleorTotal(grossTotal);
          }
        } catch (taxError) {
          console.warn('Failed to parse tax information:', taxError);
          // Don't throw error, just log it so address update still succeeds
        }
      }
    },
    [endpoint]
  );

  const updateBillingAddress = useCallback(
    async (id: string, addr: AddressInputTS) => {
      try {
        const variables = { id, billingAddress: addr };
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: CHECKOUT_BILLING_ADDRESS_UPDATE, variables }),
        });
        if (!res.ok) throw new Error("Failed to update billing address");
        
        const json = await res.json();
        
        // Check for GraphQL errors
        if (json.errors && json.errors.length > 0) {
          const graphqlError = json.errors[0];
          throw handleGraphQLError(graphqlError, "Billing address update");
        }
        
        const errs = json.data?.checkoutBillingAddressUpdate?.errors as Array<{ message?: string }> | undefined;
        if (errs?.length) {
          const errorMessage = errs[0]?.message || "Billing address update error";
          throw handleGraphQLError(new Error(errorMessage), "Billing address update");
        }
      } catch (error) {
        // If it's already a handled error, rethrow it
        if (error instanceof Error && 
            (error.message.includes("checkout session") || error.message.includes("session has expired"))) {
          throw error;
        }
        // Otherwise, handle it
        throw handleGraphQLError(error, "Billing address update");
      }
    },
    [endpoint, handleGraphQLError]
  );

  const updateCheckoutEmail = useCallback(
    async (id: string, email: string, onError?: (message: string) => void) => {
      try {
        const variables = { checkoutId: id, email };
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: CHECKOUT_EMAIL_UPDATE, variables }),
        });
        if (!res.ok) throw new Error("Failed to update checkout email");

        const json = await res.json();

        // Check for GraphQL errors
        if (json.errors && json.errors.length > 0) {
          const graphqlError = json.errors[0];
          const errorMessage = graphqlError.message || "GraphQL error";
          if (onError) onError(errorMessage);
          return;
        }

        const errs = json.data?.checkoutEmailUpdate?.errors as Array<{ message?: string }> | undefined;
        if (errs?.length) {
          const errorMessage = errs[0]?.message || "Email update error";
          if (onError) onError(errorMessage);
          return;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Email update failed";
        if (onError) onError(errorMessage);
      }
    },
    [endpoint]
  );

  const getCheckoutDetails = useCallback(
    async (id: string, signal?: AbortSignal) => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: GET_CHECKOUT_DETAILS, variables: { id } }),
          signal,
        });
        if (!res.ok) throw new Error("Failed to fetch checkout details");
        
        const json = await res.json();
        
        // Check for GraphQL errors
        if (json.errors && json.errors.length > 0) {
          const graphqlError = json.errors[0];
          throw handleGraphQLError(graphqlError, "Get checkout details");
        }
        
        const checkout = json.data?.checkout;
        if (!checkout) {
          throw handleGraphQLError(new Error("Unable to determine checkout details"), "Get checkout details");
        }
        
        const rawTotal = checkout.totalPrice?.gross?.amount;
        const rawSubtotal = checkout.subtotalPrice?.gross?.amount;
        const lines = checkout.lines || [];
        const deliveryMethod = checkout.deliveryMethod;
        
        // Extract voucher information
        const voucherCode = checkout.voucherCode || null;
        const discount = checkout.discount ? {
          amount: checkout.discount.amount,
          currency: checkout.discount.currency
        } : null;
        
        return {
          total: rawTotal,
          subtotal: rawSubtotal,
          lines,
          deliveryMethod,
          voucherInfo: { voucherCode, discount },
          fullCheckoutData: checkout, // Include full checkout data for validation
        };
      } catch (error) {
        // If it's already a handled error, rethrow it
        if (error instanceof Error && 
            (error.message.includes("checkout session") || error.message.includes("session has expired"))) {
          throw error;
        }
        // Otherwise, handle it
        throw handleGraphQLError(error, "Get checkout details");
      }
    },
    [endpoint, handleGraphQLError]
  );

  const updateDeliveryMethod = useCallback(
    async (id: string, methodId: string) => {
      if (updatingDeliveryRef.current) return;
      updatingDeliveryRef.current = true;
      try {
        const variables = { id, deliveryMethodId: methodId };
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: CHECKOUT_DELIVERY_METHOD_UPDATE, variables }),
        });
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Failed to set delivery method: ${res.status} ${res.statusText} ${errorText}`);
        }
        
        const json = await res.json();
        
        // Check for GraphQL errors
        if (json.errors && json.errors.length > 0) {
          const graphqlError = json.errors[0];
          throw handleGraphQLError(graphqlError, "Delivery method update");
        }
        
        const errs = json.data?.checkoutDeliveryMethodUpdate?.errors as
          | Array<{ message?: string; field?: string; code?: string }>
          | undefined;
        if (errs?.length) {
          const errorDetails = errs.map((e) => `${e.field || "unknown"}: ${e.message || "unknown"}`).join(", ");
          const errorMessage = errs[0]?.message || `Delivery method update error: ${errorDetails}`;
          throw handleGraphQLError(new Error(errorMessage), "Delivery method update");
        }

        // Extract and store tax information from delivery method update
        const checkout = json.data?.checkoutDeliveryMethodUpdate?.checkout;
        if (checkout) {
          try {
            const subtotalTax = checkout.subtotalPrice?.tax?.amount || 0;
            const shippingTax = checkout.shippingPrice?.tax?.amount || 0;
            const subtotalNet = checkout.subtotalPrice?.net?.amount || 0;
            const shippingNet = checkout.shippingPrice?.net?.amount || 0;
            const currency = checkout.totalPrice?.gross?.currency || 'USD';
            
            setTaxInfo({
              totalTax: subtotalTax,
              shippingTax,
              subtotalNet,
              shippingNet,
              currency
            });

            // Update the Saleor total with the gross amount including tax
            const grossTotal = checkout.totalPrice?.gross?.amount;
            if (typeof grossTotal === 'number') {
              setSaleorTotal(grossTotal);
            }
          } catch (taxError) {
            console.warn('Failed to parse tax information from delivery method update:', taxError);
            // Don't throw error, just log it so delivery method update still succeeds
          }
        }
      } catch (error) {
        // If it's already a handled error, rethrow it
        if (error instanceof Error && 
            (error.message.includes("checkout session") || error.message.includes("session has expired"))) {
          throw error;
        }
        // Otherwise, handle it
        throw handleGraphQLError(error, "Delivery method update");
      } finally {
        updatingDeliveryRef.current = false;
      }
    },
    [endpoint, handleGraphQLError]
  );

  const applyVoucher = useCallback(
    async (voucherCode: string) => {
      if (!checkoutId) {
        setVoucherError("No checkout session found");
        return;
      }

      setIsApplyingVoucher(true);
      setVoucherError(null);

      try {
        const variables = { checkoutId, promoCode: voucherCode };
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: ADD_VOUCHER_TO_CHECKOUT, variables }),
        });

        if (!res.ok) {
          throw new Error(`Failed to apply voucher: ${res.status} ${res.statusText}`);
        }

        const json = await res.json();

        if (json.errors && json.errors.length > 0) {
          throw new Error(json.errors[0].message || "Failed to apply voucher");
        }

        const result = json.data?.checkoutAddPromoCode;
        if (result?.errors && result.errors.length > 0) {
          const error = result.errors[0];
          switch (error.code) {
            case "INVALID":
              setVoucherError("Promo code is invalid");
              break;
            case "VOUCHER_NOT_APPLICABLE":
              setVoucherError("Voucher is not applicable to this checkout");
              break;
            default:
              setVoucherError(error.message || "Failed to apply voucher");
          }
          return;
        }

        if (result?.checkout) {
          const checkout = result.checkout;
          setVoucherInfo({
            voucherCode: checkout.voucherCode || null,
            discount: checkout.discount ? {
              amount: checkout.discount.amount,
              currency: checkout.discount.currency
            } : null
          });

          // Update total with new discounted price
          const grossTotal = checkout.totalPrice?.gross?.amount;
          if (typeof grossTotal === 'number') {
            setSaleorTotal(grossTotal);
          }
        }
      } catch (error) {
        console.error("Error applying voucher:", error);
        setVoucherError(error instanceof Error ? error.message : "Failed to apply voucher");
      } finally {
        setIsApplyingVoucher(false);
      }
    },
    [checkoutId, endpoint]
  );

  const removeVoucher = useCallback(
    async () => {
      if (!checkoutId || !voucherInfo?.voucherCode) {
        return;
      }

      setIsApplyingVoucher(true);
      setVoucherError(null);

      try {
        const variables = { checkoutId, promoCode: voucherInfo.voucherCode };
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: REMOVE_VOUCHER_FROM_CHECKOUT, variables }),
        });

        if (!res.ok) {
          throw new Error(`Failed to remove voucher: ${res.status} ${res.statusText}`);
        }

        const json = await res.json();

        if (json.errors && json.errors.length > 0) {
          throw new Error(json.errors[0].message || "Failed to remove voucher");
        }

        const result = json.data?.checkoutRemovePromoCode;
        if (result?.errors && result.errors.length > 0) {
          setVoucherError(result.errors[0].message || "Failed to remove voucher");
          return;
        }

        if (result?.checkout) {
          const checkout = result.checkout;
          setVoucherInfo({
            voucherCode: checkout.voucherCode || null,
            discount: checkout.discount ? {
              amount: checkout.discount.amount,
              currency: checkout.discount.currency
            } : null
          });

          // Update total with new price without discount
          const grossTotal = checkout.totalPrice?.gross?.amount;
          if (typeof grossTotal === 'number') {
            setSaleorTotal(grossTotal);
          }
        }
      } catch (error) {
        console.error("Error removing voucher:", error);
        setVoucherError(error instanceof Error ? error.message : "Failed to remove voucher");
      } finally {
        setIsApplyingVoucher(false);
      }
    },
    [checkoutId, endpoint, voucherInfo?.voucherCode]
  );

  const buildAddressFromForm = useCallback(
    (info: typeof shippingInfo): AddressInputTS => ({
      firstName: info.firstName?.trim() || "",
      lastName: info.lastName?.trim() || "",
      streetAddress1: info.address?.trim() || "",
      city: info.city?.trim() || "",
      postalCode: info.zipCode?.trim() || "",
      country: info.country || "US",
      countryArea: info.state?.trim() || undefined,
      phone: info.phone?.trim() || null,
    }),
    []
  );

  const buildAddressFromAccount = useCallback(
    (addr: AccountAddressLite): AddressInputTS => ({
      firstName: addr?.firstName || "",
      lastName: addr?.lastName || "",
      streetAddress1: addr?.streetAddress1 || "",
      city: addr?.city || "",
      postalCode: addr?.postalCode || "",
      country: addr?.country?.code || "",
      countryArea: addr?.countryArea || undefined,
      phone: addr?.phone ?? null,
    }),
    []
  );

  // Init guest form
  useEffect(() => {
    if (!isLoggedIn) {
      setShippingInfo((prev) => ({
        ...prev,
        firstName: guestShippingInfo.firstName || "",
        lastName: guestShippingInfo.lastName || "",
        address: guestShippingInfo.address || "",
        city: guestShippingInfo.city || "",
        state: guestShippingInfo.state || "",
        zipCode: guestShippingInfo.zipCode || "",
        email: guestEmail || "",
        phone: guestShippingInfo.phone || "",
        country: guestShippingInfo.country || prev.country || "US",
      }));
    }
  }, [isLoggedIn, guestEmail, guestShippingInfo]);

  // Account addresses
  const { data: meData, refetch: refetchMe } = useQuery<MeAddressesData>(ME_ADDRESSES_QUERY, {
    skip: !isLoggedIn,
    fetchPolicy: "cache-and-network",
  });

  // Payment gateways
  const { data: paymentGatewaysData } = useQuery(gql(GET_PAYMENT_GATEWAYS), {
    variables: { checkoutId },
    skip: !checkoutId,
    fetchPolicy: "cache-and-network",
  });

  const [setDefaultAddress] = useMutation<
    AccountSetDefaultAddressData,
    AccountSetDefaultAddressVars
  >(ACCOUNT_SET_DEFAULT_ADDRESS, { refetchQueries: [{ query: ME_ADDRESSES_QUERY }] });

  const [updateWillCallDeliveryMethod] = useMutation<
    WillCallDeliveryMethodUpdateData,
    WillCallDeliveryMethodUpdateVars
  >(CHECKOUT_DELIVERY_METHOD_UPDATE_WILL_CALL);

  const accountShipping = useMemo(() => {
    const me = meData?.me;
    if (!me || !me.addresses?.length) return null;
    const defId = me.defaultShippingAddress?.id;
    return (defId ? me.addresses.find((a: AccountAddressLite) => a.id === defId) : me.addresses[0]) || null;
  }, [meData]);

  const accountBilling = useMemo(() => {
    const me = meData?.me;
    if (!me || !me.addresses?.length) return null;
    const defId = me.defaultBillingAddress?.id;
    return (defId ? me.addresses.find((a: AccountAddressLite) => a.id === defId) : me.addresses[0]) || null;
  }, [meData]);

  // Initialize selected ids - wait for data to load before setting defaults
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedBillingAddressId, setSelectedBillingAddressId] = useState<string | null>(null);
  const [addressAutoSelectionComplete, setAddressAutoSelectionComplete] = useState(false);

  // Auto-select addresses but track completion for delivery method loading timing
  useEffect(() => {
    if (isLoggedIn && meData?.me) {
      let hasChanges = false;

      // Auto-select shipping address - default or first available
      if (!selectedAddressId) {
        const defaultShippingId = meData.me.defaultShippingAddress?.id;
        const firstAddressId = meData.me.addresses?.[0]?.id;
        const addressToUse = defaultShippingId || firstAddressId;
        if (addressToUse) {
          setSelectedAddressId(addressToUse);
          hasChanges = true;
        }
      }

      // Set billing address - default or first available  
      if (!selectedBillingAddressId) {
        const defaultBillingId = meData.me.defaultBillingAddress?.id;
        const firstAddressId = meData.me.addresses?.[0]?.id;
        const addressToUse = defaultBillingId || firstAddressId;
        if (addressToUse) {
          setSelectedBillingAddressId(addressToUse);
        }
      }

      // Mark auto-selection as complete after all address selections are done
      if (hasChanges || selectedAddressId || !meData.me.addresses?.length) {
        // Use a small delay to ensure state updates are processed
        setTimeout(() => setAddressAutoSelectionComplete(true), 50);
      }
    } else if (!isLoggedIn) {
      // For guests, mark auto-selection as complete immediately
      setAddressAutoSelectionComplete(true);
    }
  }, [isLoggedIn, meData?.me, selectedAddressId, selectedBillingAddressId]);

  // This effect is removed as it conflicts with the selectedAddressId effect below
  // The selectedAddressId effect handles both auto-selected and manually selected addresses

  const handleSetDefaultAddress = async (addressId: string, type: "SHIPPING" | "BILLING") => {
    if (!isLoggedIn || !addressId) return;
    try {
      const { data } = await setDefaultAddress({ variables: { id: addressId, type } });
      if (data?.accountSetDefaultAddress?.errors?.length) {
        throw new Error(data.accountSetDefaultAddress.errors[0]?.message || "Failed to update default address");
      }
      if (type === "SHIPPING") setSelectedAddressId(addressId);
      else setSelectedBillingAddressId(addressId);
      await refetchMe();
    } catch (error) {
      console.error(`Failed to set default ${type.toLowerCase()} address:`, error);
    }
  };

  // Hydrate shipping form when selectedAddressId changes (logged in)
  useEffect(() => {
    if (!isLoggedIn || !meData?.me?.addresses) return;
    const selectedAddress = meData.me.addresses.find((addr: AccountAddressLite) => addr.id === selectedAddressId);
    if (selectedAddress) {
      setShippingInfo((prev) => ({
        ...prev,
        firstName: selectedAddress.firstName || "",
        lastName: selectedAddress.lastName || "",
        address: selectedAddress.streetAddress1 || "",
        city: selectedAddress.city || "",
        state: selectedAddress.countryArea || "",
        zipCode: selectedAddress.postalCode || "",
        email: meData.me?.email || prev.email,
        phone: selectedAddress.phone || "",
        country: selectedAddress.country?.code || prev.country || "US",
      }));

      // Clear address tracking to allow fresh API call with new address
      lastAddressHashRef.current = "";
      
      // Clear tax info when address changes to trigger recalculation
      setTaxInfo(null);
      setIsCalculatingTax(false);

      // Clear any delivery methods error when address is hydrated
      if (shippingError && shippingError.includes("No delivery methods found")) {
        setShippingError(null);
        lastFetchedAtRef.current = 0;
        fetchingMethodsRef.current = false;
        setShippingMethods([]);
      }
    }
  }, [isLoggedIn, selectedAddressId, meData, shippingError]);

  // Removed automatic population of shipping info from accountShipping
  // Users must explicitly select an address to load delivery methods

  const hasCompleteShippingInfo = useMemo(() => {
    const s = shippingInfo;
    return !!(s.firstName && s.lastName && s.address && s.city && s.zipCode && s.country);
  }, [shippingInfo]);
  // ---- Payload builders (idempotent) ----
  const shippingPayload: AddressInputTS | null = useMemo(() => {
    // If shipping to dealer, use dealer address
    if (isShipToDealer && selectedDealer) {
      return {
        firstName: 'Dealer',
        lastName: 'Pickup',
        streetAddress1: selectedDealer.address.streetAddress1 || '',
        city: selectedDealer.address.city || '',
        postalCode: selectedDealer.address.postalCode || '',
        country: selectedDealer.address.country?.code || 'US',
        countryArea: selectedDealer.address?.countryArea || '',
        phone: selectedDealer.phone || null,
      };
    }

    // Standard shipping logic
    if (isLoggedIn && selectedAddressId) {
      const addr = meData?.me?.addresses?.find((a: AccountAddressLite) => a.id === selectedAddressId) as AccountAddressLite | undefined;
      return addr ? buildAddressFromAccount(addr) : null;
    }
    if (isLoggedIn && accountShipping && addressAutoSelectionComplete)
      return buildAddressFromAccount(accountShipping as unknown as AccountAddressLite);
    if (hasCompleteShippingInfo) return buildAddressFromForm(shippingInfo);
    return null;
  }, [
    isShipToDealer,
    selectedDealer,
    isLoggedIn,
    selectedAddressId,
    meData,
    accountShipping,
    addressAutoSelectionComplete,
    hasCompleteShippingInfo,
    shippingInfo,
    buildAddressFromAccount,
    buildAddressFromForm,
  ]);

  const hasCompleteBillingInfo = useMemo(() => {
    const b = billingInfo;
    return !!(b.firstName && b.lastName && b.address && b.city && b.zipCode && b.country);
  }, [billingInfo]);

  const canShowDeliveryMethods = useMemo(() => {
    // If shipping to dealer, we can show delivery methods once dealer is selected
    if (isShipToDealer) {
      return !!selectedDealer;
    }

    // Don't show delivery methods until auto-selection is complete
    if (!addressAutoSelectionComplete) return false;

    if (isLoggedIn) {
      // For logged in users, require address selection (auto or manual)
      const hasSelectedAddress = !!selectedAddressId;
      const addressExists = meData?.me?.addresses?.some((addr: AccountAddressLite) => addr.id === selectedAddressId);
      return hasSelectedAddress && addressExists;
    }
    // For guest users, require complete shipping info
    return hasCompleteShippingInfo;
  }, [isShipToDealer, selectedDealer, addressAutoSelectionComplete, isLoggedIn, selectedAddressId, meData, hasCompleteShippingInfo]);

  const billingPayload: AddressInputTS | null = useMemo(() => {
    // Only sync billing if we have valid data
    if (useShippingAsBilling) {
      // For dealer shipping, use customer address if available, otherwise use dealer address
      if (isShipToDealer) {
        if (isLoggedIn && selectedAddressId) {
          const addr = meData?.me?.addresses?.find((a: AccountAddressLite) => a.id === selectedAddressId) as AccountAddressLite | undefined;
          return addr ? buildAddressFromAccount(addr) : shippingPayload;
        }
        return hasCompleteShippingInfo ? buildAddressFromForm(shippingInfo) : shippingPayload;
      }
      // Only return shipping payload if it's complete and valid
      return shippingPayload && hasCompleteShippingInfo ? shippingPayload : null;
    }
    if (isLoggedIn) {
      const selectedBilling = selectedBillingAddressId
        ? (meData?.me?.addresses?.find((a: AccountAddressLite) => a.id === selectedBillingAddressId) as AccountAddressLite | undefined)
        : (accountBilling as unknown as AccountAddressLite | null);
      return selectedBilling ? buildAddressFromAccount(selectedBilling) : null;
    }
    return hasCompleteBillingInfo ? buildAddressFromForm(billingInfo) : null;
  }, [
    useShippingAsBilling,
    isShipToDealer,
    isLoggedIn,
    selectedAddressId,
    meData,
    buildAddressFromAccount,
    shippingPayload,
    hasCompleteShippingInfo,
    shippingInfo,
    buildAddressFromForm,
    selectedBillingAddressId,
    accountBilling,
    billingInfo,
    hasCompleteBillingInfo,
  ]);

  /** UPDATED: fetchShippingMethods now returns methods immediately, not just via state */
  const fetchShippingMethods = useCallback(
    async (id: string): Promise<ShippingMethod[]> => {
      if (fetchingMethodsRef.current) {
        // brief wait for the in-flight request to complete, then return whatever we have
        await sleep(100);
        return shippingMethods;
      }

      // Basic throttle: avoid hammering endpoint if we called it very recently
      const now = Date.now();
      if (now - lastFetchedAtRef.current < 200) {
        return shippingMethods;
      }

      fetchingMethodsRef.current = true;
      setShippingLoading(true);
      setShippingError(null);

      try {
        const requestBody = { query: GET_CHECKOUT_SHIPPING_METHODS, variables: { id } };
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        if (!res.ok) {
          let errorMessage = `Failed to fetch shipping methods: ${res.status} ${res.statusText}`;

          // Handle specific error cases
          if (res.status === 401 || res.status === 403) {
            errorMessage = "Your session has expired. Please refresh the page to continue.";
          } else if (res.status === 408 || res.status === 504) {
            errorMessage = "Request timeout occurred. Please check your connection and try again.";
          } else if (res.status >= 500) {
            errorMessage = "Server error occurred. Please try again in a moment.";
          }

          throw new Error(errorMessage);
        }
        const json: GraphQLShippingMethodsResponse = await res.json();
        if (json.errors) {
          throw new Error(json.errors[0]?.message || "GraphQL error");
        }

        const rawMethods = json.data?.checkout?.availableShippingMethods || [];
        const methods: ShippingMethod[] = rawMethods.map((m) => ({
          id: m.id,
          name: m.name,
          price: { amount: m.price.amount, currency: m.price.currency },
          minimumDeliveryDays: m.minimumDeliveryDays ?? null,
          maximumDeliveryDays: m.maximumDeliveryDays ?? null,
        }));
        // Update state but also return immediately for the caller to use
        setShippingMethods(methods);
        lastFetchedAtRef.current = Date.now();

        // Sync/clean selections against fresh list
        if (!methods.length) {
          setSelectedShippingId(null);
          setSelectedShippingMethodId(null);
          setUserHasSelectedDelivery(false);
          
          // Check if empty methods might indicate session expiry
          // If we had methods before and now have none, it could be session expiry
          if (shippingMethods.length > 0) {
            setShippingError("No shipping methods available. This might be due to session expiry. Please refresh the page if the issue persists.");
          } else {
            // Clear any previous shipping errors since we got a valid API response
            setShippingError(null);
          }
          
          // Mark this fetch as completed to prevent immediate retry
          lastFetchedAtRef.current = Date.now();
          // IMPORTANT: Also mark the address hash to prevent infinite retries
          // Use the lastAddressHashRef if available, or create a default
          if (!lastAddressHashRef.current) {
            lastAddressHashRef.current = "no-methods-available";
          }
        } else {
          setShippingError(null);
          // Don't automatically restore previous shipping method selection
          // Users should explicitly select delivery method for each checkout
          if (globalSelectedShippingId) {
            setSelectedShippingMethodId(null);
            setUserHasSelectedDelivery(false);
          }
          if (selectedShippingId && !isMethodAvailable(selectedShippingId, methods)) {
            setSelectedShippingId(null);
            setSelectedShippingMethodId(null);
            setUserHasSelectedDelivery(false);
          }
        }

        return methods;
      } catch (error) {
        let errorMessage = "Failed to load shipping methods";

        if (error instanceof Error) {
          if (error.name === "AbortError") {
            return shippingMethods; // Return existing methods if request was aborted
          } else if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
            errorMessage = "Network connection issue. Please check your internet and try again.";
          } else if (error.message.includes("timeout")) {
            errorMessage = "Request timeout. Please try again.";
          } else {
            errorMessage = error.message;
          }
        }

        setShippingError(errorMessage);
        throw error;
      } finally {
        setShippingLoading(false);
        fetchingMethodsRef.current = false;
      }
    },
    [
      endpoint,
      // Removed frequently changing dependencies to prevent retriggering:
      // selectedShippingId, globalSelectedShippingId, shippingMethods
    ]
  );

  /** NEW: gets usable methods (state or fresh), with retries if empty/stale */
  const ensureShippingMethodsAvailable = useCallback(
    async (id: string): Promise<ShippingMethod[]> => {
      // If state already has methods, use them
      if (shippingMethods.length > 0) return shippingMethods;

      // Fetch once and return result (even if empty)
      // Don't retry if API returns empty array - this is a valid response
      try {
        const methods = await fetchShippingMethods(id);
        // Return whatever we get from the API - empty array is valid
        return methods;
      } catch (error) {
        // Only retry on actual API errors, not empty results
        console.warn('Failed to fetch shipping methods, retrying...', error);
        
        const methods = await withRetry(async () => {
          return await fetchShippingMethods(id);
        }, 2, 1000); // Reduced retries, only for actual errors
        
        return methods;
      }
    },
    [fetchShippingMethods]
  );

  /** NEW: Force retry shipping methods with state reset */
  const handleRetryShippingMethods = useCallback(async () => {
    if (!checkoutId || shippingLoading || isUpdatingDelivery) return;

    // Clear error state and force fresh fetch
    setShippingError(null);
    setShippingMethods([]);
    lastFetchedAtRef.current = 0; // Reset throttle
    lastAddressHashRef.current = ""; // Reset address hash to force refetch

    try {
      await fetchShippingMethods(checkoutId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to retry shipping methods";
      setShippingError(msg);
      // Re-throw the error so calling functions know it failed
      throw error;
    }
  }, [checkoutId, fetchShippingMethods]);

  // Will Call functions
  const fetchCollectionPoints = useCallback(async (checkoutId: string) => {
    if (!checkoutId) return;

    setWillCallLoading(true);
    setWillCallError(null);

    try {
      const { data } = await apolloClient.query<GetCheckoutCollectionPointsData, GetCheckoutCollectionPointsVars>({
        query: GET_CHECKOUT_COLLECTION_POINTS,
        variables: { checkoutId },
        fetchPolicy: 'network-only',
      });

      if (data?.checkout?.availableCollectionPoints) {
        setCollectionPoints(data.checkout.availableCollectionPoints);
      } else {
        setCollectionPoints([]);
      }
    } catch (error) {
      console.error('Failed to fetch collection points:', error);
      setWillCallError('Failed to load pickup locations');
      setCollectionPoints([]);
    } finally {
      setWillCallLoading(false);
    }
  }, [apolloClient]);



  const handleCollectionPointSelect = useCallback(async (collectionPointId: string) => {
    if (!checkoutId) return;

    setIsProcessingSelection(true);
    setSelectedCollectionPointId(collectionPointId);
    // Clear regular shipping selection when collection point is selected
    setSelectedShippingId(null);
    setSelectedShippingMethodId(null);
    setUserHasSelectedDelivery(false);
    // Set will call as selected when a collection point is chosen
    setIsWillCallSelected(true);
    // Clear shipping tax when switching to local pickup
    setTaxInfo(prev => prev ? {
      ...prev,
      shippingTax: 0,
      shippingNet: 0
    } : null);
    // Clear delivery ref so API will be called when switching back to shipping
    lastDeliveryRef.current = null;
    setIsUpdatingDelivery(true);

    try {
      const response = await updateWillCallDeliveryMethod({
        variables: {
          id: checkoutId,
          deliveryMethodId: collectionPointId,
        },
      });

      if (response.data?.checkoutDeliveryMethodUpdate?.errors?.length) {
        const error = response.data.checkoutDeliveryMethodUpdate.errors[0];
        throw new Error(error.message);
      }

      // Mark as user selected delivery
      setUserHasSelectedDelivery(true);
      
      // Update total if needed
      const checkout = response.data?.checkoutDeliveryMethodUpdate?.checkout;
      if (checkout?.subtotalPrice?.gross?.amount !== undefined) {
        setSaleorTotal(checkout.subtotalPrice.gross.amount);
      }

    } catch (error) {
      console.error('Failed to set collection point:', error);
      setWillCallError(error instanceof Error ? error.message : 'Failed to set pickup location');
      setSelectedCollectionPointId(null);
    } finally {
      setIsUpdatingDelivery(false);
      setIsProcessingSelection(false);
    }
  }, [checkoutId, updateWillCallDeliveryMethod]);

  // Refs for idempotent pushes
  const lastShippingRef = useRef<AddressInputTS | null>(null);
  const lastBillingRef = useRef<AddressInputTS | null>(null);
  const lastDeliveryRef = useRef<string | null>(null);
  const lastCheckoutIdRef = useRef<string | null>(null);

  // Consolidated effect for shipping address + delivery methods
  useEffect(() => {
    let mounted = true;
    const syncShippingAndDelivery = async () => {
      if (!isClient || !checkoutId || !shippingPayload) return;

      // Prevent delivery method API calls if there's already a delivery method or address validation error
      // But still allow tax calculation for address updates
      const hasDeliveryError = shippingError && (
        shippingError.includes("No delivery methods found") ||
        shippingError.includes("not valid for the address") ||
        shippingError.includes("postal code")
      );
      
      // If there's a delivery error, we can still update address for tax calculation
      // but skip delivery method fetching

      // Reduced throttling for more responsive tax calculation
      const now = Date.now();
      if (now - lastFetchedAtRef.current < 300) { // 300ms throttle for better responsiveness
        return;
      }

      if (lastCheckoutIdRef.current && lastCheckoutIdRef.current !== checkoutId) {
        resetCheckoutState();
        lastCheckoutIdRef.current = checkoutId;
        // Clear delivery method selection for new checkout session
        setSelectedShippingMethodId(null);
        return;
      }
      if (!lastCheckoutIdRef.current) {
        lastCheckoutIdRef.current = checkoutId;
        // Clear delivery method selection when starting fresh checkout
        setSelectedShippingMethodId(null);
      }

      const addressHash = JSON.stringify({
        country: shippingPayload.country,
        postalCode: shippingPayload.postalCode,
        streetAddress1: shippingPayload.streetAddress1,
        city: shippingPayload.city,
        phone: shippingPayload.phone, // Include phone to trigger retry when phone changes
      });

      const shouldUpdateAddress = !shallowEq(shippingPayload, lastShippingRef.current);
      const addressChanged = addressHash !== lastAddressHashRef.current;
      const noMethodsLoaded = shippingMethods.length === 0;
      const shouldFetchMethods = !hasDeliveryError && (
        addressChanged || (noMethodsLoaded && canShowDeliveryMethods)
      );

      // Don't fetch methods if we just failed with the same address hasState/Provinceh (but still allow address updates for tax)
      if (shouldFetchMethods && addressHash === lastAddressHashRef.current && shippingError) {
        return;
      }

      // Don't fetch methods if we've already attempted this address and got empty results (but still allow address updates for tax)
      if (shouldFetchMethods && addressHashAttemptedRef.current.has(addressHash) &&
        shippingMethods.length === 0) {
        // Don't return here - still allow address update for tax calculation
      }

      try {
        if (shouldUpdateAddress) {
          setIsCalculatingTax(true);
          await updateShippingAddress(checkoutId, shippingPayload);
          lastShippingRef.current = shippingPayload;
          setIsCalculatingTax(false);

          // Track shipping info event
          if (items.length > 0) {
            const products: Product[] = items.map((item, index) => ({
              item_id: item.id,
              item_name: item.name,
              item_category: item.category || 'Products',
              price: item.price,
              quantity: item.quantity,
              currency: 'USD',
              index: index
            }));

            const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            // Include shipping address data in the event
            const shippingAddress = {
              first_name: shippingPayload.firstName,
              last_name: shippingPayload.lastName,
              address_line_1: shippingPayload.streetAddress1,
              city: shippingPayload.city,
              state: shippingPayload.countryArea,
              postal_code: shippingPayload.postalCode,
              country: shippingPayload.country,
            };

            gtmAddShippingInfo(products, 'USD', totalValue, undefined, undefined, shippingAddress, gtmConfig?.container_id);
          }
        }
        // Only fetch delivery methods if we don't have a delivery error and conditions are met
        if (shouldFetchMethods && mounted && !hasDeliveryError) {
          lastAddressHashRef.current = addressHash;
          // Track that we're attempting this address
          addressHashAttemptedRef.current.add(addressHash);
          // use returned methods; don't rely on state right away
          await fetchShippingMethods(checkoutId);
        }
      } catch (e) {
        if (mounted) {
          setIsCalculatingTax(false);
          const msg = e instanceof Error ? e.message : "Failed to sync shipping address";
          setShippingError(msg);
          // Mark this address hash as failed to prevent immediate retry
          lastAddressHashRef.current = addressHash;
        }
      }
    };

    // Allow effect to run for tax calculation even if delivery methods can't be shown
    if (canShowDeliveryMethods || (shippingPayload && checkoutId)) {
      const timer = setTimeout(() => {
        if (mounted) void syncShippingAndDelivery();
      }, 150); // Reduced timeout for faster tax calculation
      return () => {
        clearTimeout(timer);
        mounted = false;
      };
    }
    return () => {
      mounted = false;
    };
  }, [
    isClient,
    checkoutId,
    canShowDeliveryMethods,
    shippingPayload,
    // Removed problematic dependencies that cause loops:
    // - shippingMethods.length (causes retrigger when methods load)
    // - shippingError/shippingLoading (change frequently)
    // - function dependencies (recreated every render)
  ]);

  // Separate billing sync effect
  useEffect(() => {
    (async () => {
      if (!isClient || !checkoutId) return;
      if (billingPayload && !shallowEq(billingPayload, lastBillingRef.current)) {
        // Validate required fields before attempting sync
        const requiredFields = ['firstName', 'lastName', 'streetAddress1', 'city', 'postalCode', 'country'];
        const missingFields = requiredFields.filter(field => !billingPayload[field as keyof AddressInputTS]);

        if (missingFields.length > 0) {
          console.warn("[Checkout] Billing sync skipped - missing fields:", missingFields.join(', '));
          return;
        }

        try {
          await updateBillingAddress(checkoutId, billingPayload);
          lastBillingRef.current = billingPayload;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Failed to sync billing address";
          console.error("[Checkout] Billing sync error:", msg);
          // Don't throw error, just log it to avoid breaking the checkout flow
        }
      }
    })();
  }, [isClient, checkoutId, billingPayload, updateBillingAddress]);

  // Clear stale total when user picks another delivery method
  useEffect(() => {
    if (selectedShippingId && lastDeliveryRef.current !== selectedShippingId) {
      setSaleorTotal(null);
    }
  }, [selectedShippingId]);

  // Apply delivery method & get total; now robust against async state
  useEffect(() => {
    let mounted = true;
    const applyDeliveryMethod = async () => {
      if (!checkoutId || !selectedShippingId) return;
      
      // Don't apply delivery method if will call is selected
      if (isWillCallSelected) return;

      // Check if method is available in current state first (no fetch needed)
      let methodStillAvailable = shippingMethods.find((m) => m.id === selectedShippingId);
      
      // Only fetch methods if we don't have any or the selected method isn't available
      if (!methodStillAvailable && shippingMethods.length === 0) {
        const methods = await ensureShippingMethodsAvailable(checkoutId);
        methodStillAvailable = methods.find((m) => m.id === selectedShippingId);
      }
      
      if (!methodStillAvailable) {
        setShippingError("The selected shipping method is no longer available. Please select a different method.");
        setSelectedShippingId(null);
        setSelectedShippingMethodId(null);
        setUserHasSelectedDelivery(false);
        return;
      }

      if (lastDeliveryRef.current === selectedShippingId) return;

      // Check if we actually need to do any work
      const addressNeedsSync = shippingPayload && !shallowEq(shippingPayload, lastShippingRef.current);
      
      try {
        // Only show updating state if we're actually updating address
        if (addressNeedsSync) {
          setIsUpdatingDelivery(true);
        }
        setIsCalculatingTotal(true);

        // Only sync address if it has actually changed
        if (addressNeedsSync) {
          await updateShippingAddress(checkoutId, shippingPayload);
          lastShippingRef.current = shippingPayload;
        }

        // Validate that the selected method is still available before calling API
        const isMethodValid = methodStillAvailable && shippingMethods.some(m => m.id === selectedShippingId);
        if (!isMethodValid) {
          // If method is no longer valid, fetch fresh methods and validate again
          console.warn('Selected shipping method is no longer valid, fetching fresh methods...');
          const freshMethods = await ensureShippingMethodsAvailable(checkoutId);
          const validMethod = freshMethods.find(m => m.id === selectedShippingId);
          
          if (!validMethod) {
            throw new Error(`Selected shipping method ${selectedShippingId} is no longer available. Please select a different method.`);
          }
        }

        await updateDeliveryMethod(checkoutId, selectedShippingId);
        lastDeliveryRef.current = selectedShippingId;

        if (totalsAbortRef.current) totalsAbortRef.current.abort();
        totalsAbortRef.current = new AbortController();

        if (mounted) {
          const details = await getCheckoutDetails(checkoutId, totalsAbortRef.current.signal);
          if (mounted && !totalsAbortRef.current.signal.aborted) {
            setSaleorTotal(details.total);
            setVoucherInfo(details.voucherInfo);
            setShippingError(null);
            // Mark as user selected since delivery method was successfully applied
            setUserHasSelectedDelivery(true);
          }
        }
      } catch (e) {
        if (mounted) {
          let errorMessage = "Failed to set delivery method";
          if (e instanceof Error) {
            if (e.message.includes("checkout session") || 
              e.message.includes("session has expired") ||
              e.message.includes("Couldn't resolve to a node")) {
              errorMessage = "Your checkout session has expired. Please refresh the page or restart your checkout to continue.";
            } else if (e.message.includes("not applicable")) {
              errorMessage = "This shipping method is not available for your address or items. Please select a different method.";
              setSelectedShippingId(null);
              setSelectedShippingMethodId(null);
              setUserHasSelectedDelivery(false);
            } else if (e.message.includes("Failed to fetch") ||
              e.message.includes("NetworkError") ||
              e.message.includes("timeout")) {
              errorMessage = "Network issue occurred. Please check your connection and try again.";
            } else {
              errorMessage = e.message;
            }
          }
          setShippingError(errorMessage);
        }
      } finally {
        if (mounted) {
          setIsUpdatingDelivery(false);
          setIsCalculatingTotal(false);
          setIsProcessingSelection(false);
        }
      }
    };

    void applyDeliveryMethod();
    return () => {
      mounted = false;
    };
  }, [
    checkoutId,
    selectedShippingId,
    isWillCallSelected,
    shippingPayload,
    ensureShippingMethodsAvailable,
    updateDeliveryMethod,
    updateShippingAddress,
    getCheckoutDetails,
    setSelectedShippingMethodId,
  ]);

  // Product restriction validation effect
  useEffect(() => {
    const validateRestrictions = async () => {
      if (!checkoutId || !hasCompleteShippingInfo) {
        setProductRestrictions([]);
        setHasRestrictionViolations(false);
        return;
      }

      try {
        const details = await getCheckoutDetails(checkoutId);
        const restrictions = checkProductRestrictions(
          details.fullCheckoutData,
          shippingInfo.state,
          shippingInfo.zipCode
        );
        
        setProductRestrictions(restrictions);
        setHasRestrictionViolations(restrictions.length > 0);
      } catch (error) {
        console.warn('Failed to validate product restrictions:', error);
        // Don't block checkout on validation errors, just clear restrictions
        setProductRestrictions([]);
        setHasRestrictionViolations(false);
      }
    };

    validateRestrictions();
  }, [checkoutId, hasCompleteShippingInfo, shippingInfo.state, shippingInfo.zipCode, getCheckoutDetails]);

  // Will Call collection points effect
  useEffect(() => {
    const willCallEnabled = isWillCallEnabled();
    
    if (!willCallEnabled || !checkoutId || !hasCompleteShippingInfo) {
      setCollectionPoints([]);
      return;
    }

    fetchCollectionPoints(checkoutId);
  }, [checkoutId, hasCompleteShippingInfo, isWillCallEnabled, fetchCollectionPoints]);

  // Initial checkout details load
  useEffect(() => {
    const abortController = new AbortController();
    totalsAbortRef.current = abortController;

    const loadInitialDetails = async () => {
      if (!checkoutId) return;
      try {
        setIsCalculatingTotal(true);
        const details = await getCheckoutDetails(checkoutId, abortController.signal);
        if (!abortController.signal.aborted) {
          setSaleorTotal(details.total);
          setVoucherInfo(details.voucherInfo);
          
          // Sync delivery method state with what's actually in Saleor
          if (details.deliveryMethod) {
            setSelectedShippingId(details.deliveryMethod.id);
            setSelectedShippingMethodId(details.deliveryMethod.id);
            setUserHasSelectedDelivery(true);
            
            // Add the method to shipping methods if not already there
            setShippingMethods(prev => {
              const exists = prev.find(m => m.id === details.deliveryMethod.id);
              if (exists) return prev;
              return [...prev, {
                id: details.deliveryMethod.id,
                name: details.deliveryMethod.name,
                price: { 
                  amount: details.deliveryMethod.price?.amount || 0, 
                  currency: details.deliveryMethod.price?.currency || 'USD' 
                }
              }];
            });
          } else {
            // Clear any frontend state if Saleor doesn't have a delivery method
            setSelectedShippingId(null);
            setSelectedShippingMethodId(null);
            setUserHasSelectedDelivery(false);
          }
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== "AbortError") {
          setSaleorTotal(null);
        }
      } finally {
        if (!abortController.signal.aborted) setIsCalculatingTotal(false);
      }
    };

    void loadInitialDetails();
    return () => {
      abortController.abort(new Error("Component unmounted"));
    };
  }, [checkoutId, getCheckoutDetails, setSelectedShippingMethodId]);

  // Validate before payment — robust against stale state
  const persistGuestInfoAndValidateShipping = useCallback(async (bypassShippingValidation = false) => {
    // Validate email for both logged-in and guest users
    const emailToValidate = isLoggedIn ? user?.email : shippingInfo.email;
    
    if (!emailToValidate || emailToValidate.trim() === '') {
      throw new Error("Email address is required to complete your order.");
    }
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToValidate)) {
      throw new Error("Please enter a valid email address.");
    }

    if (!isLoggedIn) {
      useGlobalStore.getState().setGuestEmail(shippingInfo.email);
      useGlobalStore.getState().setGuestShippingInfo({
        firstName: shippingInfo.firstName,
        lastName: shippingInfo.lastName,
        address: shippingInfo.address,
        city: shippingInfo.city,
        state: shippingInfo.state,
        zipCode: shippingInfo.zipCode,
        phone: shippingInfo.phone,
        country: shippingInfo.country,
      });
    }
    if (!checkoutId) {
      throw new Error("Checkout ID is missing. Please refresh the page and try again.");
    }
    // Check if either regular shipping or will-call is selected
    if (!selectedShippingId && !selectedCollectionPointId) {
      throw createDeliveryMethodError("Please select a delivery method or pickup location before completing your order.");
    }

    // If bypassing shipping validation (for payment redirects), skip the validation
    if (bypassShippingValidation) {
      return;
    }

    // If will-call is selected, skip regular shipping validation
    if (selectedCollectionPointId) {
      return;
    }

    // For payment flow, don't refresh methods if we already have valid ones
    // This prevents issues where methods become unavailable during payment processing
    let methods = shippingMethods;
    let selectedMethod = methods.find((m) => m.id === selectedShippingId);

    // Only fetch fresh methods if we don't have any or the selected method is missing
    if (methods.length === 0 || !selectedMethod) {
      try {
        methods = await ensureShippingMethodsAvailable(checkoutId);
        selectedMethod = methods.find((m) => m.id === selectedShippingId);

        // If still no methods after fresh fetch, this might be a temporary API issue
        if (methods.length === 0) {
          console.error('No shipping methods available after fresh fetch - this might be a temporary API issue');

          // For payment flow, we can proceed if the user already had a valid method selected
          // since they already went through proper validation earlier
          if (selectedShippingId && shippingMethods.length > 0) {
            console.warn('Using previously validated shipping methods for payment completion');
            methods = shippingMethods;
            selectedMethod = methods.find((m) => m.id === selectedShippingId);

            if (selectedMethod) {
            } else {
              throw new Error("No delivery methods are available and cached method is invalid. Please refresh the page and try again.");
            }
          } else {
            throw new Error("No delivery methods are available. This may be due to checkout session issues. Please refresh the page and try again.");
          }
        }
      } catch (error) {
        // If we can't even get shipping methods, the checkout might be expired/invalid
        if (error instanceof Error) {
          if (error.message.includes("No delivery methods")) {
            throw error; // Re-throw our specific error
          } else if (error.message.includes("session") || error.message.includes("expired") || error.message.includes("401") || error.message.includes("403")) {
            throw new Error("Your checkout session has expired. Please refresh the page to start a new checkout session.");
          } else if (error.message.includes("network") || error.message.includes("Failed to fetch")) {
            throw new Error("Network connection issue during checkout validation. Please check your connection and try again.");
          }
        }
        throw new Error("Unable to validate delivery methods during checkout. Please refresh the page and try again.");
      }
    } else {
    }

    // If selected method is not available, refresh methods and try again
    if (!selectedMethod) {
      try {
        setIsRecoveringDelivery(true);
        // Force a fresh fetch of shipping methods
        setShippingError(null);
        setShippingMethods([]);
        lastFetchedAtRef.current = 0;
        lastAddressHashRef.current = "";

        methods = await fetchShippingMethods(checkoutId);
        selectedMethod = methods.find((m) => m.id === selectedShippingId);

        if (!selectedMethod) {
          // Clear the invalid selection and show updated methods
          setSelectedShippingId(null);
          setSelectedShippingMethodId(null);
          setUserHasSelectedDelivery(false);

          if (methods.length === 0) {
            throw createDeliveryMethodError("No delivery methods are currently available for your address. Please verify your shipping address or contact support.");
          } else {
            throw createDeliveryMethodError(`Your previously selected delivery method is no longer available. Please choose from the ${methods.length} available method${methods.length > 1 ? 's' : ''} below and try again.`);
          }
        }
      } catch (refreshError) {
        // If refresh also fails, provide helpful guidance
        if (refreshError instanceof Error && refreshError.message.includes("No delivery methods")) {
          throw refreshError; // Re-throw the no methods error
        } else if (refreshError instanceof Error && refreshError.message.includes("available method")) {
          throw refreshError; // Re-throw the selection guidance error
        }
        throw createDeliveryMethodError("The delivery method became unavailable during payment processing. Please select a new delivery method and try again.");
      } finally {
        setIsRecoveringDelivery(false);
      }
    }

    // Wait briefly if a delivery update is in flight
    if (isUpdatingDelivery) {
      await sleep(300);
    }

    // Confirm selection server-side with retry for payment stability (only for regular shipping)
    if (selectedShippingId) {
      try {
        await updateDeliveryMethod(checkoutId, selectedShippingId);

      // Double-check the method was actually set by querying back
      const verification = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "/api/graphql"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            query VerifyDeliveryMethod($checkoutId: ID!) {
              checkout(id: $checkoutId) {
                id
                deliveryMethod {
                  ... on ShippingMethod {
                    id
                    name
                  }
                }
              }
            }
          `,
          variables: { checkoutId }
        })
      });

      if (verification.ok) {
        const verifyData = await verification.json();
        const setMethod = verifyData.data?.checkout?.deliveryMethod;

        if (!setMethod || setMethod.id !== selectedShippingId) {
          console.warn('Delivery method verification failed, retrying...');
          try {
            // Retry once more
            await updateDeliveryMethod(checkoutId, selectedShippingId);
          } catch (retryError) {
            console.warn('Retry also failed, but proceeding with payment since method was originally valid:', retryError);
            // Don't throw - proceed with payment since user originally had valid method
          }
        }
      } else {
        console.warn('Verification request failed, but proceeding with payment since method was originally valid');
        // Don't throw - proceed with payment since user originally had valid method
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Couldn't resolve to a node")) {
          // Try to refresh methods one more time before failing
          try {
            await handleRetryShippingMethods();
            setSelectedShippingId(null);
            setSelectedShippingMethodId(null);
            setUserHasSelectedDelivery(false);
            throw createDeliveryMethodError("The delivery method became invalid during checkout. Fresh delivery options have been loaded - please select one and try again.");
          } catch (refreshError) {
            // Clear selection and provide recovery instructions
            setSelectedShippingId(null);
            setSelectedShippingMethodId(null);
            setUserHasSelectedDelivery(false);

            // Provide more specific error based on what failed
            if (refreshError instanceof Error) {
              if (refreshError.message.includes("session") || refreshError.message.includes("expired")) {
                throw new Error("Your session expired during checkout. The page will reload automatically to restore your session.");
              } else if (refreshError.message.includes("network") || refreshError.message.includes("Failed to fetch")) {
                throw createDeliveryMethodError("Network connection issue during checkout. Please check your connection and try selecting a delivery method again.");
              }
            }
            throw createDeliveryMethodError("The delivery method became unavailable during payment processing. Please select a new delivery method and try again.");
          }
        } else if (error.message.includes("not applicable")) {
          // Clear selection and let user choose again
          setSelectedShippingId(null);
          setSelectedShippingMethodId(null);
          setUserHasSelectedDelivery(false);
          throw createDeliveryMethodError("The selected shipping method is not available for your address or items. Please choose a different delivery method and try again.");
        }
        throw createDeliveryMethodError(`Unable to confirm delivery method: ${error.message}`);
      }
      throw createDeliveryMethodError("Failed to confirm delivery method. Please refresh and try again.");
    }
    }
  }, [
    isLoggedIn,
    shippingInfo,
    checkoutId,
    selectedShippingId,
    selectedCollectionPointId,
    isUpdatingDelivery,
    updateDeliveryMethod,
    ensureShippingMethodsAvailable,
  ]);

  const selectedShipping = useMemo(
    () => shippingMethods.find((m) => m.id === selectedShippingId) || null,
    [shippingMethods, selectedShippingId]
  );

  const grandTotal = useMemo(() => {
    // If we have Saleor total (includes tax and shipping), use it
    if (typeof saleorTotal === "number" && saleorTotal > 0) {
      return saleorTotal;
    }
    
    // Fallback: calculate from store total + shipping (but this won't include tax)
    return (selectedShipping?.price?.amount || 0) + totalAmount;
  }, [saleorTotal, totalAmount, selectedShipping]);

  // Field handlers (shipping) with debounced validation and tax calculation
  // Add debounce timer ref
  const emailUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setShippingInfo((prev) => ({ ...prev, [name]: value }));

    // Validate email field as user types
    if (name === 'email') {
      const emailValidationError = validateEmail(value);
      setEmailError(emailValidationError);
      
      // Clear previous timeout
      if (emailUpdateTimeoutRef.current) {
        clearTimeout(emailUpdateTimeoutRef.current);
      }
      
      // Update checkout email when valid email is entered (for guest users)
      if (!emailValidationError && !isLoggedIn && checkoutId && value.trim()) {
        
        // Clear previous timeout
        if (emailUpdateTimeoutRef.current) {
          clearTimeout(emailUpdateTimeoutRef.current);
        }
        
        // Debounce the email update to avoid too many API calls
        emailUpdateTimeoutRef.current = setTimeout(() => {
          
          // Call the function and handle the callback
          updateCheckoutEmail(checkoutId, value, (errorMessage) => {
            setEmailError(errorMessage);
          });
        }, 1000);
      } else {
      }
    }

    // Mark auto-selection as complete when guest starts entering address
    if (!isLoggedIn && !addressAutoSelectionComplete) {
      setAddressAutoSelectionComplete(true);
    }

    // Clear any existing shipping errors and tax info when user changes address fields
    // This allows the delivery method and tax calculation APIs to be called with new address
    if (['firstName', 'lastName', 'address', 'city', 'zipCode', 'state', 'country'].includes(name)) {
      // Clear local pickup selection when address changes (since pickup locations are tied to address)
      if (isWillCallSelected) {
        setIsWillCallSelected(false);
        setSelectedCollectionPointId(null);
        setWillCallError(null);
        // Clear any will call related shipping errors
        if (shippingError && (shippingError.includes("click and collect") || shippingError.includes("warehouse address"))) {
          setShippingError(null);
        }
      }
      
      // Clear tax info on address changes to trigger recalculation
      setTaxInfo(null);
      setIsCalculatingTax(false);
      
      // Reset address tracking to force fresh API calls
      lastAddressHashRef.current = "";
      lastFetchedAtRef.current = 0;
      fetchingMethodsRef.current = false;
      
      // If there's a delivery method or address validation error, clear it and allow new API call
      if (shippingError && (
        shippingError.includes("No delivery methods found") ||
        shippingError.includes("not valid for the address") ||
        shippingError.includes("Delivery Method Error")
      )) {
        setShippingError(null);
        // Clear existing methods to trigger fresh fetch
        setShippingMethods([]);
      }

      // Also clear postal code validation errors when user changes any address fields
      if (shippingError && shippingError.includes("postal code")) {
        setShippingError(null);
        lastAddressHashRef.current = "";
        lastFetchedAtRef.current = 0;
      }

      // Clear any pending postal code validation
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
        validationTimeoutRef.current = null;
      }

      // When user changes state/country, trigger a re-validation after form updates
      if (name === 'state' || name === 'country') {
        // Set a flag or trigger re-validation via a separate effect
        setTimeout(() => {
          const event = new CustomEvent('revalidatePostalCode', {
            detail: { changedField: name, newValue: value }
          });
          window.dispatchEvent(event);
        }, 100);
      }
    }

    // Debounce validation for postal code to prevent race conditions
    if (name === 'zipCode') {
      // Set new validation timeout - but only if no delivery method API is running
      validationTimeoutRef.current = setTimeout(() => {
        // Only validate if not currently loading delivery methods
        if (!shippingLoading && !isUpdatingDelivery) {
          const isValid = isValidPostalCode(value, shippingInfo.country);
          if (!isValid && value.length >= 3) {
            setShippingError("Please enter a valid postal code for the selected country.");
          } else if (isValid && shippingError && shippingError.includes("postal code")) {
            // Clear postal code error when it becomes valid
            setShippingError(null);
            // Reset to allow delivery methods to be fetched with valid postal code
            lastAddressHashRef.current = "";
            lastFetchedAtRef.current = 0;
          }
        }
      }, 1500); // Increased debounce to allow delivery API calls to complete first
    }
  };

  // Billing handlers
  const handleBillingFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setBillingInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleUseShippingAsBillingChange = (checked: boolean) => {
    setUseShippingAsBilling(checked);
    if (checked) {
      setBillingInfo({
        ...shippingInfo,
        email: shippingInfo.email,
      });
    }
  };

  const handlePlaceOrder = async () => {
    try {
      if (DEBUG_HALT_AFTER_PAYMENT) return;
      const billingAddress = useShippingAsBilling
        ? buildAddressFromForm(shippingInfo)
        : buildAddressFromForm(billingInfo);
      if (checkoutId) {
        await updateBillingAddress(checkoutId, billingAddress);
        await updateShippingAddress(checkoutId, buildAddressFromForm(shippingInfo));
      }
      window.location.href = `/order-confirmation${checkoutId ? `?checkoutId=${encodeURIComponent(checkoutId)}` : ""}`;
    } catch (e) {
      console.error("Error during checkout:", e);
    }
  };

  const payAmount = useMemo(() => {
    if (typeof saleorTotal === "number" && saleorTotal > 0) return saleorTotal;
    if (selectedShipping && totalAmount > 0) {
      const shippingCost = selectedShipping.price?.amount || 0;
      return totalAmount + shippingCost;
    }
    if (selectedShippingId && shippingMethods.length > 0 && totalAmount > 0) {
      const foundMethod = shippingMethods.find((m) => m.id === selectedShippingId);
      if (foundMethod) return totalAmount + (foundMethod.price?.amount || 0);
    }
    return null;
  }, [saleorTotal, selectedShipping, totalAmount, selectedShippingId, shippingMethods]);

  // Re-validate postal code when state/country changes
  useEffect(() => {
    const handleRevalidation = (event: CustomEvent) => {
      const { } = event.detail;

      if (shippingInfo.zipCode && shippingInfo.zipCode.length >= 3) {
        const isValid = isValidPostalCode(shippingInfo.zipCode, shippingInfo.country);

        if (isValid && shippingError && (
          shippingError.includes("postal code") ||
          shippingError.includes("not valid for the address") ||
          shippingError.includes("Delivery Method Error")
        )) {
          setShippingError(null);
          lastAddressHashRef.current = "";
          lastFetchedAtRef.current = 0;
          fetchingMethodsRef.current = false;
          // Clear methods to trigger fresh fetch with corrected address
          setShippingMethods([]);
        } else if (!isValid) {
          setShippingError("Please enter a valid postal code for the selected country.");
        }
      }
    };

    window.addEventListener('revalidatePostalCode', handleRevalidation as EventListener);

    return () => {
      window.removeEventListener('revalidatePostalCode', handleRevalidation as EventListener);
    };
  }, [shippingInfo.zipCode, shippingInfo.country, shippingError, isValidPostalCode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (totalsAbortRef.current) totalsAbortRef.current.abort();
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  // Memoize the payment ready callback to prevent infinite loops
  const handlePaymentReady = useCallback((trigger: () => Promise<void>) => {
    setPaymentTriggerFn({ fn: trigger });
  }, []);

  if (!isClient) return <LoadingUI className="h-[80vh]" />;
  if (items.length === 0 && !checkoutId)
    return (
      <EmptyState
        className="h-[80vh]"
        text="Your cart is empty"
        buttonLabel="Continue Shopping"
        onClick={() => route.push("/")}
      />
    );

  return (
    <div className="px-4 md:px-6 md:py-8 py-6 lg:max-w-7xl mx-auto lg:py-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-14">
        <div className="lg:col-span-2 space-y-4 lg:border-r lg:border-[var(--color-secondary-200)] lg:pr-14">
          <CheckoutHeader isLoggedIn={isLoggedIn} />

          <ContactDetailsSection
            isLoggedIn={isLoggedIn}
            userEmail={user?.email}
            guestEmail={shippingInfo.email}
            onEmailChange={handleFieldChange}
            emailError={emailError}
          />

          <DealerShippingSection
            isShipToDealer={isShipToDealer}
            onShippingTypeChange={setIsShipToDealer}
            selectedDealer={selectedDealer}
            onDealerSelect={setSelectedDealer}
          />

          {!isShipToDealer && (
            <AddressManagement
              isLoggedIn={isLoggedIn}
              shippingInfo={shippingInfo}
              billingInfo={billingInfo}
              useShippingAsBilling={useShippingAsBilling}
              onShippingChange={handleFieldChange}
              onBillingChange={handleBillingFieldChange}
              onUseShippingAsBillingChange={handleUseShippingAsBillingChange}
              onShippingPhoneChange={(phone) =>
                setShippingInfo((f) => ({
                  ...f,
                  phone,
                }))
              }
              onBillingPhoneChange={(phone) => {
                setBillingInfo((prev) => ({
                  ...prev,
                  phone,
                }));
              }}
              meData={meData}
              formData={formData}
              setFormData={setFormData}
              selectedAddressId={selectedAddressId}
              setSelectedAddressId={(id) => {
                setSelectedAddressId(id);
                setAddressAutoSelectionComplete(true); // Mark as complete when manually selected

                // Clear tax info when address selection changes
                setTaxInfo(null);
                setIsCalculatingTax(false);

                // Clear delivery methods error when user selects different address
                if (shippingError && shippingError.includes("No delivery methods found")) {
                  setShippingError(null);
                  lastAddressHashRef.current = "";
                  lastFetchedAtRef.current = 0;
                  fetchingMethodsRef.current = false;
                  setShippingMethods([]);
                }
              }}
              selectedBillingAddressId={selectedBillingAddressId}
              setSelectedBillingAddressId={setSelectedBillingAddressId}
              onAddressAdded={async () => {
                await refetchMe();
              }}
              onSetDefaultAddress={handleSetDefaultAddress}
            />
          )}

          {/* Product Restriction Messages */}
          {productRestrictions.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-orange-800 mb-3 uppercase tracking-wide">
                    Shipping Restriction{productRestrictions.length > 1 ? 's' : ''} Detected
                  </h3>
                  <div className="space-y-4">
                    {productRestrictions.map((restriction, index) => (
                      <div key={index} className="bg-white border border-orange-100 rounded p-3">
                        <p className="font-medium text-orange-900 text-sm">{restriction.productName}</p>
                        <p className="text-orange-700 text-sm mt-1">{restriction.checkoutMessage}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-orange-100 rounded border border-orange-200">
                    <p className="text-sm text-orange-800 font-medium">
                      Please update your shipping address or remove the restricted item(s) to continue.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!hasRestrictionViolations && (
            <>
              <DeliveryMethodSection
                checkoutId={checkoutId}
                canShowDeliveryMethods={!!canShowDeliveryMethods}
                hasCompleteShippingInfo={!!hasCompleteShippingInfo}
                missingForDelivery={missingForDelivery}
                shippingLoading={shippingLoading}
                shippingMethods={shippingMethods}
                shippingError={shippingError}
                selectedShippingId={selectedShippingId}
                isUpdatingDelivery={isUpdatingDelivery || isRecoveringDelivery}
                isProcessingSelection={isProcessingSelection}
                isWillCallSelected={isWillCallSelected}
                onShippingMethodSelect={async (methodId) => {
                  setIsProcessingSelection(true);
                  try {
                    // If switching from will call, check if methods need refresh
                    if (isWillCallSelected && checkoutId) {
                      try {
                        // First check if the method exists in current methods
                        const existingMethod = shippingMethods.find(m => m.id === methodId);

                        if (!existingMethod || shippingMethods.length === 0) {
                          // Only fetch fresh methods if needed
                          setShippingLoading(true);
                          setShippingError(null);
                          lastDeliveryRef.current = null;

                          // Fetch fresh shipping methods without clearing existing ones
                          const freshMethods = await fetchShippingMethods(checkoutId);

                          // Validate that the selected method exists in fresh methods
                          const validMethod = freshMethods.find(m => m.id === methodId);
                          if (!validMethod) {
                            setShippingError("The selected shipping method is no longer available. Please select a different method.");
                            setIsProcessingSelection(false);
                            return;
                          }
                        }
                      } catch (error) {
                        console.error('Failed to fetch fresh shipping methods:', error);
                        setShippingError("Failed to load shipping methods. Please try again.");
                        setIsProcessingSelection(false);
                        return;
                      } finally {
                        setShippingLoading(false);
                      }
                    } else {
                      // Even if not switching from will call, validate method exists
                      const validMethod = shippingMethods.find(m => m.id === methodId);
                      if (!validMethod) {
                        setShippingError("The selected shipping method is no longer available. Please refresh the page and select a different method.");
                        setIsProcessingSelection(false);
                        return;
                      }
                    }

                    // Batch state updates to reduce re-renders
                    setSelectedShippingId(methodId);
                    setSelectedShippingMethodId(methodId);
                    setUserHasSelectedDelivery(true);
                    // Clear will call selection when regular shipping is selected
                    setIsWillCallSelected(false);
                    setSelectedCollectionPointId(null);
                    // Clear any will call related shipping errors
                    if (shippingError && (shippingError.includes("click and collect") || shippingError.includes("warehouse address"))) {
                      setShippingError(null);
                    }
                  } finally {
                    // Always reset processing state when done
                    setIsProcessingSelection(false);
                  }
                }}
                onRetryShippingMethods={handleRetryShippingMethods}
              />

              <WillCallSection
                checkoutId={checkoutId}
                willCallEnabled={isWillCallEnabled()}
                collectionPoints={collectionPoints}
                selectedCollectionPointId={selectedCollectionPointId}
                isUpdatingDelivery={isUpdatingDelivery || isRecoveringDelivery}
                isProcessingSelection={isProcessingSelection}
                onCollectionPointSelect={handleCollectionPointSelect}
                userState={shippingInfo.state}
                willCallLoading={willCallLoading}
                willCallError={willCallError}
              />
            </>
          )}

          {checkoutId &&
            payAmount &&
            !isCalculatingTotal &&
            ((selectedShippingId && userHasSelectedDelivery) || (isWillCallSelected && selectedCollectionPointId)) &&
            !hasRestrictionViolations && (
              <CheckoutQuestions
                isLoggedIn={isLoggedIn}
                grandTotal={grandTotal}
                checkoutId={checkoutId}
                onQuestionsChange={setCheckoutQuestionAnswers}
                onValidationChange={setAreCheckoutQuestionsValid}
                onSaveQuestions={(saveFn) => setSaveCheckoutQuestions(() => saveFn)}
              />
          )}

          {checkoutId && (
            <PaymentStep
              onBack={() => { }}
              onComplete={handlePlaceOrder}
              totalAmount={payAmount || 0}
              checkoutId={checkoutId}
              availablePaymentGateways={paymentGatewaysData?.checkout?.availablePaymentGateways}
              kountConfig={kountConfig}
              taxInfo={taxInfo}
              isCalculatingTotal={isCalculatingTotal}
              disabled={
                isCalculatingTotal ||
                hasRestrictionViolations ||
                !((selectedShippingId && userHasSelectedDelivery) || (isWillCallSelected && selectedCollectionPointId))
              }
              onPaymentReady={handlePaymentReady}
              onStartPayment={async () => {
                // Validate terms and conditions if required
                if (termsData?.page?.isPublished && !termsAccepted) {
                  throw new Error("Please accept the Terms and Conditions to continue.");
                }

                await persistGuestInfoAndValidateShipping(true);
                // Save checkout questions when payment is initiated
                if (saveCheckoutQuestions && typeof saveCheckoutQuestions === 'function') {
                  try {
                    await saveCheckoutQuestions();
                  } catch (error) {
                    console.error('Failed to save checkout questions:', error);
                    // Don't throw error to prevent payment from being blocked
                  }
                }
              }}
              isProcessingPayment={isProcessingPayment}
              setIsProcessingPayment={setIsProcessingPayment}
              selectedShippingId={selectedShippingId || undefined}
              userEmail={user?.email}
              guestEmail={shippingInfo.email}
              lineItems={items}
              questionsValid={areCheckoutQuestionsValid}
              termsAccepted={termsAccepted}
              termsData={termsData}
              onTermsModalOpen={() => setIsTermsModalOpen(true)}
              onTermsAcceptedChange={setTermsAccepted}
              billingAddress={(() => {
                const addressInfo = useShippingAsBilling ? shippingInfo : billingInfo;
                // Only send billing address if we have minimum required fields
                if (addressInfo.firstName && addressInfo.lastName && addressInfo.address && addressInfo.city && addressInfo.zipCode) {
                  return {
                    firstName: addressInfo.firstName || '',
                    lastName: addressInfo.lastName || '',
                    address: addressInfo.address || '',
                    city: addressInfo.city || '',
                    state: addressInfo.state || '',
                    zipCode: addressInfo.zipCode || '',
                    country: addressInfo.country || 'US',
                    phone: addressInfo.phone || undefined,
                  };
                }
                return undefined;
              })()}
              shippingAddress={(() => {
                // For dealer shipping, use dealer address
                if (isShipToDealer && selectedDealer) {
                  return {
                    firstName: 'Dealer',
                    lastName: 'Pickup',
                    address: selectedDealer.address.streetAddress1 || '',
                    city: selectedDealer.address.city || '',
                    state: selectedDealer.address.countryArea || '',
                    zipCode: selectedDealer.address.postalCode || '',
                    country: selectedDealer.address.country?.code || 'US',
                    phone: selectedDealer.phone || undefined,
                    dealerName: selectedDealer.name,
                  };
                }

                // Only send shipping address if we have minimum required fields
                if (shippingInfo.firstName && shippingInfo.lastName && shippingInfo.address && shippingInfo.city && shippingInfo.zipCode) {
                  return {
                    firstName: shippingInfo.firstName || '',
                    lastName: shippingInfo.lastName || '',
                    address: shippingInfo.address || '',
                    city: shippingInfo.city || '',
                    state: shippingInfo.state || '',
                    zipCode: shippingInfo.zipCode || '',
                    country: shippingInfo.country || 'US',
                    phone: shippingInfo.phone || undefined,
                  };
                }
                return undefined;
              })()}
            />
          )}
        </div>

        <OrderSummary
          lineItems={items}
          totalAmount={totalAmount}
          selectedShipping={selectedShipping}
          grandTotal={grandTotal}
          saleorTotal={saleorTotal}
          isUpdatingDelivery={isUpdatingDelivery}
          shippingLoading={shippingLoading}
          isCalculatingTotal={isCalculatingTotal}
          taxInfo={taxInfo}
          isCalculatingTax={isCalculatingTax}
          voucherInfo={voucherInfo}
          onApplyVoucher={applyVoucher}
          onRemoveVoucher={removeVoucher}
          isApplyingVoucher={isApplyingVoucher}
          voucherError={voucherError}
          selectedCollectionPointId={selectedCollectionPointId}
          onCompletePayment={paymentTriggerFn.fn || undefined}
          isPaymentProcessing={isProcessingPayment.isModalOpen}
          paymentDisabled={
            isCalculatingTotal ||
            hasRestrictionViolations ||
            !((selectedShippingId && userHasSelectedDelivery) || (isWillCallSelected && selectedCollectionPointId))
          }
          paymentDisabledReason={
            isCalculatingTotal
              ? "Calculating total..."
              : hasRestrictionViolations
              ? "Please resolve product restrictions"
              : "Select a delivery method"
          }
        />
      </div>

      {/* Terms and Conditions Modal */}
      <CheckoutTermsModal
        isModalOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
      />
    </div>
  );
}
