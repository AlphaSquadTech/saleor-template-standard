"use client";

import { ApolloClient, HttpLink, InMemoryCache, gql } from "@apollo/client";

type GraphQLError = {
  message: string;
  code?: string;
  field?: string;
};

// type GraphQLResponseError = {
//   extensions?: {
//     exception?: {
//       code: string;
//     };
//   };
//   message: string;
//   code?: string;
// };
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CommonButton from "../components/reuseableUI/commonButton";
import EmptyState from "../components/reuseableUI/emptyState";
import LoadingUI from "../components/reuseableUI/loadingUI";
import { ArrowIcon } from "../utils/svgs/arrowIcon";
import { SuccessTickIcon } from "../utils/svgs/cart/successTickIcon";
import { useGlobalStore } from "@/store/useGlobalStore";
import Image from "next/image";
import {
  gtmPurchase,
  gtmEnhancedConversion,
  Product,
  PurchaseData,
  EnhancedConversionData,
} from "../utils/googleTagManager";
import { useAppConfiguration } from "../components/providers/ServerAppConfigurationProvider";

/** GraphQL ops */
const GET_CHECKOUT_SUMMARY = gql`
  query getCheckoutSummary($checkoutId: ID!) {
    checkout(id: $checkoutId) {
      id
      created
      email
      lines {
        id
        quantity
        metadata {
          key
          value
        }
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
            thumbnail {
              url
              alt
            }
          }
        }
        totalPrice {
          gross {
            amount
            currency
          }
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
        currency
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
        currency
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
        currency
      }
      shippingMethod {
        name
      }
      shippingAddress {
        streetAddress1
        city
        countryArea
        postalCode
        country {
          country
        }
      }
      billingAddress {
        firstName
        lastName
        phone
        streetAddress1
        city
        countryArea
        postalCode
        country {
          country
        }
      }
    }
  }
`;

const GET_ORDER_SUMMARY = gql`
  query getOrderSummary($orderId: ID!) {
    order(id: $orderId) {
      id
      number
      created
      userEmail
      lines {
        id
        quantity
        productName
        metadata {
          key
          value
        }
        totalPrice {
          gross {
            amount
            currency
          }
        }
        thumbnail(size: 200) {
          url
          alt
        }
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
      subtotal {
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
      total {
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
      shippingMethod {
        id
        name
      }
      shippingAddress {
        streetAddress1
        city
        countryArea
        postalCode
        country {
          country
        }
      }
      billingAddress {
        firstName
        lastName
        phone
        streetAddress1
        city
        countryArea
        postalCode
        country {
          country
        }
      }
    }
  }
`;

const COMPLETE_CHECKOUT = gql`
  mutation CompleteCheckout($checkoutId: ID!) {
    checkoutComplete(id: $checkoutId) {
      order {
        id
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const TRANSACTION_PROCESS = gql`
  mutation TransactionProcess($transactionId: ID!, $data: JSON) {
    transactionProcess(id: $transactionId, data: $data) {
      transaction {
        id
      }
      data
      errors {
        field
        message
        code
      }
    }
  }
`;

/** minimal types used in UI */
type Money = { amount: number; currency: string };
type TaxedMoney = { gross: Money; net?: Money; tax?: Money };

type MetadataItem = {
  key: string;
  value: string;
};

type OptionSetMetadata = {
  name: string;
  label: string;
  type?: string;
  hidden?: boolean;
  deselect?: string;
  required?: boolean;
  base_product_required?: boolean;
};

type CheckoutLine = {
  id: string;
  quantity: number;
  metadata?: MetadataItem[] | null;
  variant: {
    id: string;
    sku?: string | null;
    name: string;
    metadata?: MetadataItem[] | null;
    product: {
      id: string;
      name: string;
      category?: {
        name: string;
      } | null;
      thumbnail?: {
        url: string;
        alt: string;
      } | null;
    };
  };
  totalPrice: TaxedMoney;
};

type OrderLine = {
  id: string;
  quantity: number;
  productName: string;
  metadata?: MetadataItem[] | null;
  thumbnail?: {
    url: string;
    alt: string;
  } | null;
  variant?: {
    id: string;
    sku?: string | null;
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
  totalPrice: TaxedMoney;
};

type OptionItem = {
  lineId: string;
  variantId: string;
  variantName: string;
  optionSetLabel: string;
  price: number;
  currency: string;
};

type CustomInput = {
  key: string;
  value: string;
};

type GroupedOrderItem = {
  id: string;
  name: string;
  category: string;
  thumbnail?: { url: string; alt: string } | null;
  quantity: number;
  basePrice: number;
  totalPrice: TaxedMoney;
  currency: string;
  options: OptionItem[];
  customInputs: CustomInput[];
};

type Address = {
  streetAddress1?: string | null;
  city?: string | null;
  countryArea?: string | null;
  postalCode?: string | null;
  country: { country: string };
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
};

type Checkout = {
  id: string;
  created: string;
  email?: string | null;
  lines: CheckoutLine[];
  subtotalPrice: { gross: Money; net?: Money; tax?: Money; currency: string };
  shippingPrice: { gross: Money; net?: Money; tax?: Money; currency: string };
  totalPrice: { gross: Money; net?: Money; tax?: Money; currency: string };
  shippingAddress?: Address | null;
  billingAddress?: Address | null;
  deliveryMethod?: {
    id: string;
    name: string;
    price: { gross: Money; currency: string };
  } | null;
  shippingMethod?: {
    name: string;
  } | null;
};

type Order = {
  id: string;
  number?: string | null;
  created: string;
  userEmail?: string | null;
  lines: OrderLine[];
  subtotal: { gross: Money; net?: Money; tax?: Money; currency: string };
  shippingPrice: { gross: Money; net?: Money; tax?: Money; currency: string };
  total: { gross: Money; net?: Money; tax?: Money; currency: string };
  shippingAddress?: Address | null;
  billingAddress?: Address | null;
  shippingMethod?: {
    name: string;
  } | null;
};

type OrderData = Checkout | Order;

function formatDateTime(ts: string | Date) {
  const d = ts instanceof Date ? ts : new Date(ts);
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const HH = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${MM}-${dd} ${HH}:${mm}`;
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "Unknown error";
  }
}

// Helper to parse option_set metadata from a variant
function parseOptionSetMetadata(
  metadata: MetadataItem[] | null | undefined
): OptionSetMetadata | null {
  if (!metadata) return null;
  const optionMeta = metadata.find((m) => m.key === "option_set");
  if (!optionMeta?.value) return null;
  try {
    return JSON.parse(optionMeta.value) as OptionSetMetadata;
  } catch {
    return null;
  }
}

// Helper to extract custom inputs from line metadata (non-SKU option sets)
// These are user-provided values stored on the order/checkout line itself
function extractCustomInputs(
  lineMetadata: MetadataItem[] | null | undefined
): CustomInput[] {
  if (!lineMetadata || lineMetadata.length === 0) return [];

  // Filter out system metadata keys that aren't custom inputs
  const systemKeys = new Set([
    "__typename",
    "option_set",
    "wsm_availability",
    "wsm_brand",
    "wsm_condition",
    "wsm_cost",
    "wsm_dealer_id",
    "wsm_height",
    "wsm_id",
    "wsm_inventory",
    "wsm_length",
    "wsm_price",
    "wsm_sale_price",
    "wsm_upscode",
    "wsm_width",
  ]);

  return lineMetadata
    .filter((m) => !systemKeys.has(m.key))
    .map((m) => ({ key: m.key, value: m.value }));
}

// Group order/checkout lines by product, separating base products from options
function groupOrderLines(
  lines: Array<{
    id: string;
    quantity: number;
    productName?: string;
    lineMetadata?: MetadataItem[] | null;
    thumbnail?: { url: string; alt: string } | null;
    variant?: {
      id: string;
      sku?: string | null;
      name: string;
      metadata?: MetadataItem[] | null;
      product: {
        id: string;
        name: string;
        category?: { name: string } | null;
        thumbnail?: { url: string; alt: string } | null;
      };
    } | null;
    totalPrice: TaxedMoney;
  }>
): GroupedOrderItem[] {
  // Build a map of product ID -> lines for that product
  const productMap = new Map<
    string,
    {
      baseLine: (typeof lines)[0] | null;
      optionLines: Array<{
        line: (typeof lines)[0];
        optionMeta: OptionSetMetadata;
      }>;
    }
  >();

  for (const line of lines) {
    const variant = line.variant;
    if (!variant) {
      // Line has no variant info - treat as standalone item
      const standaloneId = `standalone-${line.id}`;
      productMap.set(standaloneId, { baseLine: line, optionLines: [] });
      continue;
    }

    const productId = variant.product.id;
    const optionMeta = parseOptionSetMetadata(variant.metadata);

    if (!productMap.has(productId)) {
      productMap.set(productId, { baseLine: null, optionLines: [] });
    }

    const entry = productMap.get(productId)!;

    if (optionMeta) {
      // This is an option variant (SKU-based option set)
      entry.optionLines.push({ line, optionMeta });
    } else {
      // This is a base product variant
      entry.baseLine = line;
    }
  }

  // Convert the map into grouped items
  const groupedItems: GroupedOrderItem[] = [];

  for (const [, entry] of productMap) {
    const { baseLine, optionLines } = entry;

    // Determine the display line (prefer base, fall back to first option)
    const displayLine = baseLine ?? optionLines[0]?.line;
    if (!displayLine) continue;

    const variant = displayLine.variant;
    const productName =
      displayLine.productName ??
      variant?.product.name ??
      "Unknown Product";
    const category =
      variant?.product.category?.name ?? "Uncategorized";
    const thumbnail =
      "thumbnail" in displayLine
        ? displayLine.thumbnail
        : variant?.product.thumbnail;

    // Calculate base price (0 if no base line or if base_product_required is false for all options)
    let basePrice = 0;
    if (baseLine) {
      basePrice = baseLine.totalPrice.gross.amount;
    }

    // Build SKU-based options array
    const options: OptionItem[] = optionLines.map(({ line, optionMeta }) => ({
      lineId: line.id,
      variantId: line.variant?.id ?? "",
      variantName: line.variant?.name ?? "",
      optionSetLabel: optionMeta.label || optionMeta.name,
      price: line.totalPrice.gross.amount,
      currency: line.totalPrice.gross.currency,
    }));

    // Extract non-SKU custom inputs from line metadata
    const customInputs = extractCustomInputs(displayLine.lineMetadata);

    // Calculate combined total price
    const combinedAmount =
      basePrice + options.reduce((sum, opt) => sum + opt.price, 0);
    const currency =
      displayLine.totalPrice.gross.currency ||
      options[0]?.currency ||
      "USD";

    groupedItems.push({
      id: displayLine.id,
      name: productName,
      category,
      thumbnail,
      quantity: displayLine.quantity,
      basePrice,
      totalPrice: {
        gross: { amount: combinedAmount, currency },
      },
      currency,
      options,
      customInputs,
    });
  }

  return groupedItems;
}

export default function Summary() {
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const route = useRouter();
  const [flowRan, setFlowRan] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<
    "idle" | "running" | "success" | "fail"
  >("idle");

  const { finalizeCheckoutCleanup } = useGlobalStore(); // ✅ use the cleanup
  const { getGoogleTagManagerConfig } = useAppConfiguration();
  const gtmConfig = getGoogleTagManagerConfig();

  const searchParams = useSearchParams();
  const saleorTransactionId = searchParams.get("saleorTransactionId");
  const urlOrderId = searchParams.get("orderId");
  const orderNumber = searchParams.get("orderNumber");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const client = useMemo(() => {
    if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL is not defined");
    return new ApolloClient({
      link: new HttpLink({ uri: apiUrl, fetch }),
      cache: new InMemoryCache(),
    });
  }, [apiUrl]);

  // Single orchestrated flow: Load -> (Process) -> Complete
  useEffect(() => {
    if (flowRan) return;
    let cancelled = false;

    (async () => {
      try {
        setErrorMsg(null);
        setLoading(true);

        // 1) Try to load existing order OR checkout
        let fetchedOrderData: OrderData | null = null;

        // Prefer explicit orderId from URL (return-from-PSP or direct link)
        if (urlOrderId) {
          try {
            const { data } = await client.query<{ order: Order | null }>({
              query: GET_ORDER_SUMMARY,
              variables: { orderId: urlOrderId },
              fetchPolicy: "no-cache",
            });
            if (data.order) {
              fetchedOrderData = data.order;
              setOrderId(urlOrderId);
              // Clean up after successful order confirmation
              await finalizeCheckoutCleanup();
            }
          } catch (error) {
            // Don't cleanup on error - might still need checkout data
            console.error("Order fetch failed:", error);
          }
        }

        // If we still have nothing, try checkoutId (pre-completion)
        if (!fetchedOrderData) {
          let checkoutId = localStorage.getItem("checkoutId");
          if (!checkoutId) {
            const urlCheckoutId = searchParams.get("checkoutId");
            if (urlCheckoutId) {
              checkoutId = urlCheckoutId;
              localStorage.setItem("checkoutId", urlCheckoutId);
            }
          }

          if (checkoutId) {
            try {
              const { data } = await client.query<{
                checkout: Checkout | null;
              }>({
                query: GET_CHECKOUT_SUMMARY,
                variables: { checkoutId },
                fetchPolicy: "no-cache",
              });
              if (data.checkout) {
                fetchedOrderData = data.checkout;
              }
            } catch {
              // If checkout fetch fails, we’ll error below.
            }
          }
        }

        if (!fetchedOrderData) {
          setErrorMsg("No order or checkout data found.");
          return;
        }

        if (cancelled) return;
        setOrderData(fetchedOrderData);

        // Track purchase completion with GTM for all successful order confirmations
        if (fetchedOrderData) {
          const lines = getLines(fetchedOrderData);
          const pricing = getPricing(fetchedOrderData);

          const products: Product[] = lines.map((line, index) => ({
            item_id: line.id,
            item_name: line.name,
            item_category: line.category || "Products",
            price: line.totalPrice.gross.amount / line.quantity,
            quantity: line.quantity,
            currency: line.totalPrice.gross.currency || "USD",
            index: index,
          }));

          // Use orderNumber from URL if available, fallback to order number from data, then to orderId
          let transactionId = orderNumber;
          if (
            !transactionId &&
            isOrder(fetchedOrderData) &&
            fetchedOrderData.number
          ) {
            transactionId = fetchedOrderData.number;
          }
          if (!transactionId) {
            transactionId = urlOrderId || fetchedOrderData.id;
          }

          const purchaseData: PurchaseData = {
            transaction_id: transactionId,
            value: pricing.total.gross.amount,
            currency: pricing.total.gross.currency || "USD",
            tax: 0,
            shipping: pricing.shipping.gross.amount,
            items: products,
          };

          gtmPurchase(purchaseData, gtmConfig?.container_id);

          // Enhanced conversion tracking with customer data if available
          const orderData = fetchedOrderData as Order;
          const checkoutData = fetchedOrderData as Checkout;
          const userEmail = orderData.userEmail || checkoutData.email;
          const billingAddress =
            orderData.billingAddress || checkoutData.billingAddress;

          if (userEmail || billingAddress) {
            const enhancedData: EnhancedConversionData = {};

            if (userEmail) {
              enhancedData.email = userEmail;
            }

            if (billingAddress) {
              if (billingAddress.firstName)
                enhancedData.first_name = billingAddress.firstName;
              if (billingAddress.lastName)
                enhancedData.last_name = billingAddress.lastName;
              if (billingAddress.streetAddress1)
                enhancedData.street = billingAddress.streetAddress1;
              if (billingAddress.city) enhancedData.city = billingAddress.city;
              if (billingAddress.countryArea)
                enhancedData.region = billingAddress.countryArea;
              if (billingAddress.postalCode)
                enhancedData.postal_code = billingAddress.postalCode;
              if (billingAddress.country?.country)
                enhancedData.country = billingAddress.country.country;
              if (billingAddress.phone)
                enhancedData.phone_number = billingAddress.phone;
            }

            gtmEnhancedConversion(
              enhancedData,
              pricing.total.gross.amount,
              pricing.total.gross.currency || "USD",
              gtmConfig?.container_id
            );
          }
        }

        // 2) If returning from a PSP with a transaction, process it first
        if (saleorTransactionId) {
          setProcessingStatus("running");
          const tryProcess = async (attempt: number): Promise<void> => {
            const { data: procData } = await client.mutate<{
              transactionProcess: {
                transaction: { id: string } | null;
                errors: {
                  field?: string | null;
                  message: string;
                  code: string;
                }[];
              } | null;
            }>({
              mutation: TRANSACTION_PROCESS,
              variables: { transactionId: saleorTransactionId },
              fetchPolicy: "no-cache",
            });
            const resp = procData?.transactionProcess;
            const errs = resp?.errors ?? [];
            if (errs.length) {
              if (attempt < 3) {
                await new Promise((r) => setTimeout(r, 800));
                return tryProcess(attempt + 1);
              }
              throw new Error(
                "Payment processing failed: " +
                  errs.map((e) => e.message || e.code).join(", ")
              );
            }
          };
          await tryProcess(1);
          if (cancelled) return;
          setProcessingStatus("success");

          // Track purchase completion with GTM
          if (fetchedOrderData) {
            const lines = getLines(fetchedOrderData);
            const pricing = getPricing(fetchedOrderData);

            const products: Product[] = lines.map((line, index) => ({
              item_id: line.id,
              item_name: line.name,
              item_category: line.category || "Products",
              price: line.totalPrice.gross.amount / line.quantity, // Calculate unit price
              quantity: line.quantity,
              currency: line.totalPrice.gross.currency || "USD",
              index: index,
            }));

            // Use orderNumber from URL if available, fallback to order number from data, then to orderId
            let transactionId = orderNumber;
            if (
              !transactionId &&
              isOrder(fetchedOrderData) &&
              fetchedOrderData.number
            ) {
              transactionId = fetchedOrderData.number;
            }
            if (!transactionId) {
              transactionId =
                urlOrderId || saleorTransactionId || fetchedOrderData.id;
            }

            const purchaseData: PurchaseData = {
              transaction_id: transactionId,
              value: pricing.total.gross.amount,
              currency: pricing.total.gross.currency || "USD",
              tax: 0, // You may want to extract tax if available
              shipping: pricing.shipping.gross.amount,
              items: products,
            };

            gtmPurchase(purchaseData, gtmConfig?.container_id);

            // Enhanced conversion tracking with customer data if available
            const checkoutData = fetchedOrderData as Checkout;
            if (checkoutData.email || checkoutData.billingAddress) {
              const enhancedData: EnhancedConversionData = {};

              if (checkoutData.email) {
                enhancedData.email = checkoutData.email;
              }

              if (checkoutData.billingAddress) {
                const billing = checkoutData.billingAddress;
                if (billing.firstName)
                  enhancedData.first_name = billing.firstName;
                if (billing.lastName) enhancedData.last_name = billing.lastName;
                if (billing.streetAddress1)
                  enhancedData.street = billing.streetAddress1;
                if (billing.city) enhancedData.city = billing.city;
                if (billing.countryArea)
                  enhancedData.region = billing.countryArea;
                if (billing.postalCode)
                  enhancedData.postal_code = billing.postalCode;
                if (billing.country?.country)
                  enhancedData.country = billing.country.country;
                if (billing.phone) enhancedData.phone_number = billing.phone;
              }

              gtmEnhancedConversion(
                enhancedData,
                pricing.total.gross.amount,
                pricing.total.gross.currency || "USD",
                gtmConfig?.container_id
              );
            }
          }
        }

        // 3) If we’re still on a checkout (not an order yet), complete it
        const isCheckoutData =
          !("number" in fetchedOrderData) &&
          Array.isArray((fetchedOrderData as Checkout).lines) &&
          (fetchedOrderData as Checkout).lines.length > 0;

        if (isCheckoutData) {
          const checkoutData = fetchedOrderData as Checkout;

          setCompleting(true);
          const completeRes = await client.mutate<{
            checkoutComplete: {
              order: { id: string } | null;
              errors: { message: string; code: string }[];
            } | null;
          }>({
            mutation: COMPLETE_CHECKOUT,
            variables: { checkoutId: checkoutData.id },
            fetchPolicy: "no-cache",
          });

          if (cancelled) return;

          const errs = completeRes.data?.checkoutComplete?.errors ?? [];
          if (errs.length) {
            // Special handling for shipping method not set error
            const shippingError = errs.find(
              (e) => e.code === "SHIPPING_METHOD_NOT_SET"
            );
            if (shippingError) {
              console.error(
                "Shipping method not set during checkout completion. This commonly happens with PayPal redirects."
              );
              console.error("Checkout ID:", checkoutData.id, "Errors:", errs);
              // For PayPal redirects or guest users, try auto-recovery - complete checkout without setting shipping method first
              if (!saleorTransactionId) {
                console.log(
                  "Not a PayPal redirect - attempting auto-recovery for guest checkout..."
                );
                // Don't immediately throw error for guest users, try auto-recovery first
              }

              // Try to complete checkout directly since user already selected shipping method during checkout
              const flowType = saleorTransactionId
                ? "PayPal redirect"
                : "guest checkout";
              try {
                const directComplete = await client.mutate({
                  mutation: gql(`
                    mutation DirectCompleteCheckout($checkoutId: ID!) {
                      checkoutComplete(id: $checkoutId) {
                        order {
                          id
                          number
                          created
                          status
                          total { gross { amount currency } }
                          deliveryMethod {
                            ... on ShippingMethod {
                              id
                              name
                              price { amount currency }
                            }
                          }
                        }
                        errors { field message code }
                      }
                    }
                  `),
                  variables: { checkoutId: checkoutData.id },
                });

                const directErrors =
                  directComplete.data?.checkoutComplete?.errors || [];
                if (
                  directErrors.length === 0 &&
                  directComplete.data?.checkoutComplete?.order
                ) {
                  console.log("Direct checkout completion successful!");
                  const newOrderId =
                    directComplete.data.checkoutComplete.order.id;
                  setOrderId(newOrderId);
                  await finalizeCheckoutCleanup();
                  console.log(
                    `${flowType} completed successfully without shipping method auto-fix`
                  );
                  return; // Success! Skip the auto-fix entirely
                } else {
                  console.log(
                    "Direct checkout completion failed, falling back to shipping method auto-fix...",
                    directErrors
                  );
                }
              } catch (directError) {
                console.log(
                  "Direct checkout completion failed, falling back to shipping method auto-fix...",
                  directError
                );
              }

              // Try to auto-fix delivery method for PayPal redirects and guest checkouts
              console.warn(`Attempting auto-recovery for ${flowType}...`);
              try {
                const shippingMethodsQuery = `
                  query GetShippingMethods($checkoutId: ID!) {
                    checkout(id: $checkoutId) {
                      id
                      deliveryMethod {
                        ... on ShippingMethod {
                          id
                          name
                        }
                      }
                      availableShippingMethods {
                        id
                        name
                      }
                      shippingAddress {
                        country {
                          code
                        }
                        postalCode
                        city
                      }
                    }
                  }
                `;

                const { data: methodsData } = await client.query({
                  query: gql(shippingMethodsQuery),
                  variables: { checkoutId: checkoutData.id },
                  fetchPolicy: "no-cache",
                });

                const checkout = methodsData?.checkout;
                const availableMethods =
                  checkout?.availableShippingMethods || [];

                console.log("Checkout state during auto-recovery:", {
                  id: checkout?.id,
                  hasShippingAddress: !!checkout?.shippingAddress,
                  currentDeliveryMethod: checkout?.deliveryMethod,
                  availableMethodsCount: availableMethods.length,
                  availableMethods: availableMethods.map(
                    (m: { id: string; name: string }) => ({
                      id: m.id,
                      name: m.name,
                    })
                  ),
                });

                // If no methods available, don't show UI error - just fail gracefully
                if (availableMethods.length === 0) {
                  console.error(
                    "No shipping methods available during PayPal auto-recovery"
                  );
                  throw new Error(
                    "No shipping methods are available for this order. " +
                      "This may be due to address or product restrictions. " +
                      "Please contact support to complete your order."
                  );
                }

                if (availableMethods.length > 0) {
                  // Try to use the stored shipping method first, then fall back to first available
                  let methodToUse = availableMethods[0];
                  let methodSource = "first available";

                  // Check if we have a stored shipping method from before PayPal redirect or guest checkout
                  try {
                    const pendingPaymentData =
                      localStorage.getItem("pendingPaymentData");
                    console.log(
                      `[${flowType} Recovery] Raw stored data:`,
                      pendingPaymentData
                    );
                    if (pendingPaymentData) {
                      const paymentData = JSON.parse(pendingPaymentData);
                      console.log(
                        `[${flowType} Recovery] Parsed payment data:`,
                        paymentData
                      );
                      if (paymentData.selectedShippingId) {
                        console.log(
                          `[${flowType} Recovery] Retrieved shipping method ID:`,
                          paymentData.selectedShippingId,
                          "Type:",
                          typeof paymentData.selectedShippingId
                        );
                        console.log(
                          `[${flowType} Recovery] Available method IDs:`,
                          availableMethods.map((m: { id: string }) => m.id)
                        );
                        // Try to find the previously selected shipping method
                        const storedMethod = availableMethods.find(
                          (m: { id: string }) =>
                            m.id === paymentData.selectedShippingId
                        );
                        if (storedMethod) {
                          methodToUse = storedMethod;
                          methodSource = saleorTransactionId
                            ? "previously selected before PayPal redirect"
                            : "previously selected during checkout";
                          console.log(
                            "Found previously selected shipping method:",
                            paymentData.selectedShippingId
                          );
                        } else {
                          console.warn(
                            "Previously selected shipping method not available:",
                            paymentData.selectedShippingId
                          );
                          console.warn(
                            "Available methods:",
                            availableMethods.map(
                              (m: { id: string; name: string }) => ({
                                id: m.id,
                                name: m.name,
                              })
                            )
                          );
                        }
                      }
                    } else {
                      // For guest users without stored payment data, check if there are any other storage mechanisms
                      console.log(
                        `[${flowType} Recovery] No stored payment data found, checking other storage options...`
                      );

                      // Check for any other stored checkout data
                      const allStorageKeys = Object.keys(localStorage);
                      const checkoutKeys = allStorageKeys.filter(
                        (key) =>
                          key.toLowerCase().includes("checkout") ||
                          key.toLowerCase().includes("shipping")
                      );
                      console.log(
                        `[${flowType} Recovery] Available storage keys related to checkout:`,
                        checkoutKeys
                      );

                      checkoutKeys.forEach((key) => {
                        const value = localStorage.getItem(key);
                        console.log(`[${flowType} Recovery] ${key}:`, value);
                      });
                    }
                  } catch (e) {
                    console.warn("Failed to parse stored payment data:", e);
                  }

                  // Validate that the delivery method ID is properly formatted
                  if (!methodToUse.id || typeof methodToUse.id !== "string") {
                    console.error("Invalid delivery method ID:", methodToUse);
                    throw new Error(
                      "Invalid delivery method data received from server"
                    );
                  }

                  console.warn(
                    `Auto-selecting ${methodSource} shipping method for ${flowType} completion:`,
                    {
                      id: methodToUse.id,
                      name: methodToUse.name,
                      idLength: methodToUse.id.length,
                      idIsBase64Like: /^[A-Za-z0-9+/]+=*$/.test(methodToUse.id),
                    }
                  );

                  // Use the same REST-style approach as the main checkout page to avoid GraphQL variable encoding issues
                  const setShippingMethodMutation = `
                    mutation CheckoutDeliveryMethodUpdate($id: ID!, $deliveryMethodId: ID!) {
                      checkoutDeliveryMethodUpdate(id: $id, deliveryMethodId: $deliveryMethodId) {
                        checkout { 
                          id 
                          deliveryMethod {
                            ... on ShippingMethod {
                              id
                              name
                            }
                          }
                        }
                        errors { field message code }
                      }
                    }
                  `;

                  try {
                    console.log(
                      "[PayPal Recovery] Setting method with ID:",
                      methodToUse.id
                    );
                    const endpoint = "/api/graphql";
                    const res = await fetch(endpoint, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        query: setShippingMethodMutation,
                        variables: {
                          id: checkoutData.id,
                          deliveryMethodId: methodToUse.id,
                        },
                      }),
                    });

                    if (!res.ok) {
                      const errorText = await res.text();
                      throw new Error(
                        `Failed to set delivery method: ${res.status} ${res.statusText} ${errorText}`
                      );
                    }

                    const setMethodResult = await res.json();

                    const setMethodErrors =
                      setMethodResult.data?.checkoutDeliveryMethodUpdate
                        ?.errors || [];
                    if (setMethodErrors.length > 0) {
                      console.error("Failed to set shipping method:", {
                        checkoutId: checkoutData.id,
                        deliveryMethodId: methodToUse.id,
                        errors: setMethodErrors,
                        fullResult: setMethodResult.data,
                        availableMethodsCount: availableMethods.length,
                        methodData: methodToUse,
                        methodSource,
                        requestBody: JSON.stringify({
                          query: setShippingMethodMutation,
                          variables: {
                            id: checkoutData.id,
                            deliveryMethodId: methodToUse.id,
                          },
                        }),
                      });

                      // Check for specific error types
                      const nodeError = setMethodErrors.find(
                        (e: GraphQLError) =>
                          e.message?.includes("Couldn't resolve to a node") ||
                          e.code === "NOT_FOUND"
                      );

                      const notApplicableError = setMethodErrors.find(
                        (e: GraphQLError) =>
                          e.message?.includes("not applicable") ||
                          e.message?.includes(
                            "shipping method is not applicable"
                          ) ||
                          e.code === "SHIPPING_METHOD_NOT_APPLICABLE"
                      );

                      if (nodeError) {
                        console.warn(
                          "Delivery method ID is stale, will proceed without setting method"
                        );
                        return;
                      }

                      if (notApplicableError) {
                        console.warn(
                          "First delivery method is not applicable, trying others..."
                        );

                        // Try other available methods
                        let methodSet = false;
                        for (let i = 1; i < availableMethods.length; i++) {
                          const alternateMethod = availableMethods[i];
                          console.log(
                            `Trying alternate method ${i + 1}/${
                              availableMethods.length
                            }:`,
                            alternateMethod.name
                          );

                          try {
                            const altResult = await client.mutate({
                              mutation: gql(setShippingMethodMutation),
                              variables: {
                                checkoutId: checkoutData.id,
                                deliveryMethodId: alternateMethod.id,
                              },
                            });

                            const altErrors =
                              altResult.data?.checkoutDeliveryMethodUpdate
                                ?.errors || [];
                            if (altErrors.length === 0) {
                              console.log(
                                "Successfully set alternate shipping method:",
                                alternateMethod.name
                              );
                              methodSet = true;
                              break;
                            } else {
                              console.warn(
                                `Alternate method ${alternateMethod.name} also failed:`,
                                altErrors
                              );
                            }
                          } catch (altError) {
                            console.warn(
                              `Failed to try alternate method ${alternateMethod.name}:`,
                              altError
                            );
                          }
                        }

                        if (!methodSet) {
                          console.error(
                            "No applicable shipping methods found for this checkout"
                          );
                          return; // Let the main error flow handle this
                        }

                        // If we successfully set an alternate method, continue
                        return;
                      }

                      throw new Error(
                        setMethodErrors
                          .map((e: GraphQLError) => e.message || e.code)
                          .join(", ")
                      );
                    }
                  } catch (mutationError) {
                    console.error(
                      "Mutation failed when setting delivery method:",
                      mutationError
                    );
                    // Don't throw here - let the main flow handle the error
                    return;
                  }

                  console.log(
                    "Successfully set shipping method, retrying checkout completion"
                  );

                  // Retry checkout completion
                  const retryRes = await client.mutate({
                    mutation: COMPLETE_CHECKOUT,
                    variables: { checkoutId: checkoutData.id },
                    fetchPolicy: "no-cache",
                  });

                  const retryErrs =
                    retryRes.data?.checkoutComplete?.errors ?? [];
                  if (retryErrs.length) {
                    console.error("Retry completion failed:", retryErrs);
                    throw new Error(
                      "Checkout completion failed after setting shipping method: " +
                        retryErrs.map((e: GraphQLError) => e.message).join(", ")
                    );
                  }

                  const newOrderId =
                    retryRes.data?.checkoutComplete?.order?.id ?? null;
                  if (newOrderId) {
                    setOrderId(newOrderId);
                    await finalizeCheckoutCleanup();
                    console.log(
                      "Order completed successfully after auto-fixing shipping method"
                    );
                    return; // Success, continue with normal flow
                  } else {
                    throw new Error(
                      "No order ID returned after successful completion"
                    );
                  }
                } else {
                  console.error(
                    "No shipping methods available for this checkout"
                  );
                  // Don't throw here - let the natural error flow handle it
                }
              } catch (retryError) {
                console.error(
                  "Failed to auto-fix shipping method:",
                  retryError
                );
                // Don't re-throw here, let the original error be thrown below
              }

              // If we reach here, auto-fix failed, provide helpful error message
              const enhancedError = new Error(
                `Order completion failed: ${errs
                  .map((e) => e.message)
                  .join(", ")}. ` +
                  `This commonly happens when delivery methods become unavailable after payment. ` +
                  `Please contact support with your payment confirmation to complete your order.`
              );

              throw enhancedError;
            }
            throw new Error(errs.map((e) => e.message).join(", "));
          }

          const newOrderId =
            completeRes.data?.checkoutComplete?.order?.id ?? null;
          if (newOrderId) {
            setOrderId(newOrderId);

            // Clean up cart and checkout data after order completion
            await finalizeCheckoutCleanup();
          } else {
            setErrorMsg("Checkout completion returned no order id.");
          }
        }
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(errMsg(e));
          setProcessingStatus((s) => (s === "running" ? "fail" : s));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setCompleting(false);
          setFlowRan(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, saleorTransactionId]);

  const isOrder = (data: OrderData): data is Order =>
    "number" in data || "userEmail" in data;

  const getBillingFirstName = (data: OrderData) =>
    data.billingAddress?.firstName;

  const getLines = (data: OrderData): GroupedOrderItem[] => {
    if (isOrder(data)) {
      // Normalize order lines to common format for grouping
      const normalizedLines = data.lines.map((line) => ({
        id: line.id,
        quantity: line.quantity,
        productName: line.productName,
        lineMetadata: line.metadata,
        thumbnail: line.thumbnail,
        variant: line.variant
          ? {
              id: line.variant.id,
              sku: line.variant.sku,
              name: line.variant.name,
              metadata: line.variant.metadata,
              product: {
                id: line.variant.product.id,
                name: line.variant.product.name,
                category: line.variant.product.category,
              },
            }
          : null,
        totalPrice: line.totalPrice,
      }));
      return groupOrderLines(normalizedLines);
    } else {
      // Normalize checkout lines to common format for grouping
      const normalizedLines = data.lines.map((line) => ({
        id: line.id,
        quantity: line.quantity,
        productName: line.variant.product.name,
        lineMetadata: line.metadata,
        thumbnail: line.variant.product.thumbnail,
        variant: {
          id: line.variant.id,
          sku: line.variant.sku,
          name: line.variant.name,
          metadata: line.variant.metadata,
          product: {
            id: line.variant.product.id,
            name: line.variant.product.name,
            category: line.variant.product.category,
          },
        },
        totalPrice: line.totalPrice,
      }));
      return groupOrderLines(normalizedLines);
    }
  };

  const getPricing = (data: OrderData) => {
    if (isOrder(data)) {
      return {
        subtotal: data.subtotal,
        shipping: data.shippingPrice,
        total: data.total,
      };
    } else {
      return {
        subtotal: data.subtotalPrice,
        shipping: data.shippingPrice,
        total: data.totalPrice,
      };
    }
  };

  if (loading || completing) {
    return <LoadingUI className="h-[80vh]" />;
  }

  if (!orderData && !loading) {
    return (
      <EmptyState
        text="No order found."
        className="h-[80vh]"
        buttonLabel="GO TO HOME"
        buttonVariant="secondary"
        onClick={() => route.push("/")}
      />
    );
  }

  if (errorMsg && !loading && !completing) {
    return (
      <EmptyState
        text={errorMsg}
        className="h-[80vh]"
        buttonLabel="GO TO HOME"
        buttonVariant="secondary"
        onClick={() => route.push("/")}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 lg:py-24 grid grid-cols-1 lg:grid-cols-3 gap-14">
      <div className="lg:col-span-2 lg:border-r lg:border-[var(--color-secondary-200)] lg:pr-14">
        <div className="flex flex-col md:flex-row md:items-center w-full justify-between pb-8 gap-6">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <span className="[&>svg]:size-10">{SuccessTickIcon}</span>
            <div className="space-y-1">
              <p className="uppercase font-medium text-xl font-secondary text-[var(--color-secondary-800)]">
                THANK YOU,{" "}
                {orderData ? getBillingFirstName(orderData) : "Customer"}!
              </p>
              <p className="font-normal text-sm font-secondary text-[var(--color-secondary-600)]">
                YOUR ORDER HAS BEEN CONFIRMED.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 cursor-pointer">
            <CommonButton
              onClick={() => route.push("/")}
              className="p-0"
              content="CONTINUE SHOPPING"
              variant="tertiary"
            />
            <span className="size-5 text-[var(--color-primary-600)]">
              {ArrowIcon}
            </span>
          </div>
        </div>

        <div className="p-4 lg:p-10 border border-[var(--color-secondary-200)]">
          {orderData && (
            <>
              <div className="grid gap-3">
                <div className="space-y-5">
                  <p className="text-xl font-semibold leading-7 tracking-[-0.05px] text-[var(--color-secondary-800)]">
                    ORDER DETAILS
                  </p>
                  <div className="flex flex-col items-start gap-3 uppercase text-[var(--color-secondary-600)] font-normal text-sm font-secondary">
                    <div className="flex items-center gap-1">
                      <p className=" text-sm font-normal leading-5 tracking-[-0.035px] text-[var(--color-secondary-600)]">
                        Order Number
                      </p>
                      <p className="text-[var(--color-secondary-800)] text-sm font-semibold leading-5 tracking-[-0.035px]">
                        {isOrder(orderData) && orderData.number
                          ? orderData.number
                          : orderData.id}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className=" text-sm font-normal leading-5 tracking-[-0.035px] text-[var(--color-secondary-600)]">
                        Placed on
                      </p>
                      <p className="text-[var(--color-secondary-800)] text-sm font-semibold leading-5 tracking-[-0.035px]">
                        {formatDateTime(orderData.created)}
                      </p>
                    </div>
                  </div>
                </div>

                <hr className="border border-[var(--color-secondary-200)]" />

                <div className="flex flex-col gap-4">
                  {getLines(orderData).map((item) => (
                    <div
                      className="flex flex-col md:flex-row lg:items-start justify-between gap-5 pb-4 border-b border-[var(--color-secondary-100)] last:border-b-0 last:pb-0"
                      key={item.id}
                    >
                      <div className="flex gap-4">
                        <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden">
                          <Image
                            src={
                              item?.thumbnail?.url || "/no-image-avail-large.png"
                            }
                            alt={item?.thumbnail?.alt || "Product Image"}
                            className="object-contain w-full h-full"
                            width={100}
                            height={100}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-normal leading-5 tracking-[-0.035px] text-[var(--color-secondary-600)]">
                            {item.category}
                          </span>
                          <span className="font-medium text-lg md:text-xl leading-7 tracking[-0.05px] text-[var(--color-secondary-800)]">
                            {item.name}
                          </span>
                          {/* Display selected SKU-based options */}
                          {item.options.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {item.options.map((option) => (
                                <div
                                  key={option.lineId}
                                  className="text-sm text-[var(--color-secondary-600)] flex items-center gap-2"
                                >
                                  <span className="text-[var(--color-primary-600)]">+</span>
                                  <span className="font-medium">{option.optionSetLabel}:</span>
                                  <span>{option.variantName}</span>
                                  {option.price > 0 && (
                                    <span className="text-[var(--color-primary-600)]">
                                      (+{new Intl.NumberFormat(undefined, {
                                        style: "currency",
                                        currency: option.currency,
                                      }).format(option.price)})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Display non-SKU custom inputs */}
                          {item.customInputs.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {item.customInputs.map((input, idx) => (
                                <div
                                  key={`${input.key}-${idx}`}
                                  className="text-sm text-[var(--color-secondary-600)] flex items-center gap-2"
                                >
                                  <span className="font-medium">{input.key}:</span>
                                  <span>{input.value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <span className="mt-2">
                            <span
                              style={{ color: "var(--color-secondary-600)" }}
                              className="text-sm font-normal leading-5 tracking-[-0.035px]"
                            >
                              QTY
                            </span>{" "}
                            <span className="text-sm font-semibold leading-5 tracking-[-0.035px] uppercase text-[var(--color-secondary-800)]">
                              {item.quantity}
                            </span>
                          </span>
                        </div>
                      </div>
                      <span className="text-xl font-semibold leading-7 tracking-[-0.05px] text-[var(--color-secondary-800)] whitespace-nowrap">
                        {new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency: item.totalPrice.gross.currency,
                        }).format(item.totalPrice.gross.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <hr className="my-4 border border-[var(--color-secondary-200)]" />

              <div>
                <h2 className="text-lg lg:text-xl not-italic font-semibold leading-7 tracking-[-0.05px] text-[var(--color-secondary-800)] uppercase  mb-4">
                  Shipping Address
                </h2>
                <p className="flex flex-col md:flex-row md:items-center gap-2 text-base md:text-lg lg:text-xl not-italic font-medium leading-7 tracking-[-0.05px] font-secondary text-[var(--color-secondary-800)]">
                  <span>{orderData.shippingAddress?.streetAddress1}</span>
                  <span>
                    {orderData.shippingAddress?.city},{" "}
                    {orderData.shippingAddress?.countryArea}{" "}
                    {orderData.shippingAddress?.postalCode}
                  </span>
                  <span>{orderData.shippingAddress?.country.country}</span>
                </p>
                <p className="text-lg not-italic font-normal leading-7 tracking-[-0.045px] text-[var(--color-secondary-500)] mt-1">
                  {orderData.shippingAddress?.phone}
                </p>
              </div>

              <hr className="my-4 border border-[var(--color-secondary-200)]" />
              <div>
                <h2 className="text-lg lg:text-xl font-secondary text-[var(--color-secondary-800)] uppercase font-semibold mb-4">
                  Billing Address
                </h2>
                <p className="flex flex-col md:flex-row md:items-center gap-2 text-medium text-base md:text-lg lg:text-xl font-secondary text-[var(--color-secondary-800)]">
                  <span>{orderData.billingAddress?.streetAddress1}</span>
                  <span>
                    {orderData.billingAddress?.city},{" "}
                    {orderData.billingAddress?.countryArea}{" "}
                    {orderData.billingAddress?.postalCode}
                  </span>
                  <span>{orderData.billingAddress?.country.country}</span>
                </p>
                <p className="text-medium text-lg font-secondary text-[var(--color-secondary-500)] mt-1">
                  {orderData.billingAddress?.phone}
                </p>
              </div>
              {orderData?.shippingMethod?.name && (
                <>
                  <hr className="my-4 border border-[var(--color-secondary-200)]" />
                  <div>
                    <h2 className="text-lg lg:text-xl font-secondary text-[var(--color-secondary-800)] uppercase font-semibold mb-4">
                      Delivery Method
                    </h2>
                    <p className="text-base md:text-lg not-italic font-normal leading-7 tracking-[-0.045px] uppercase mt-1 text-[var(--color-secondary-500)]">
                      {orderData?.shippingMethod?.name}
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="lg:col-span-1 flex flex-col">
        <h2 className="font-medium font-secondary text-base text-[var(--color-secondary-800)] text-start pb-4 uppercase">
          Summary
        </h2>

        <div className="w-full text-normal text-[var(--color-secondary-600)] text-base">
          {orderData &&
            (() => {
              const pricing = getPricing(orderData);
              return (
                <>
                  <div className="flex justify-between mb-2">
                    <span>Sub-Total</span>
                    <span className="font-medium">
                      {pricing.subtotal.net?.amount ||
                        pricing.subtotal.gross.amount}{" "}
                      {pricing.subtotal.currency}
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Subtotal Tax</span>
                    <span className="font-medium">
                      {(() => {
                        const subtotalTax =
                          pricing.subtotal.tax?.amount ||
                          pricing.subtotal.gross.amount -
                            (pricing.subtotal.net?.amount ||
                              pricing.subtotal.gross.amount);

                        if (subtotalTax > 0) {
                          return new Intl.NumberFormat(undefined, {
                            style: "currency",
                            currency: pricing.total.gross.currency,
                          }).format(subtotalTax);
                        }
                        return "N/A";
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Shipping Tax</span>
                    <span className="font-medium">
                      {(() => {
                        const shippingTax =
                          pricing.shipping.tax?.amount ||
                          pricing.shipping.gross.amount -
                            (pricing.shipping.net?.amount ||
                              pricing.shipping.gross.amount);

                        if (shippingTax > 0) {
                          return new Intl.NumberFormat(undefined, {
                            style: "currency",
                            currency: pricing.total.gross.currency,
                          }).format(shippingTax);
                        }
                        return "N/A";
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Shipping Cost</span>
                    <span className="font-medium">
                      {pricing.shipping.net?.amount ||
                        pricing.shipping.gross.amount}{" "}
                      {pricing.shipping.currency}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-4 flex justify-between text-xl text-[var(--color-secondary-600)] font-medium ">
                    <span>TOTAL</span>
                    <span className="font-semibold text-[var(--color-secondary-800)]">
                      {pricing.total.gross.amount} {pricing.total.currency}
                    </span>
                  </div>
                </>
              );
            })()}
        </div>
      </div>
    </div>
  );
}
