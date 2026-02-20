"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentProcessingState } from "@/graphql/types/checkout";
import LoadingUI from "../reuseableUI/loadingUI";
import useGlobalStore from "@/store/useGlobalStore";
import Cookies from "js-cookie";

// PayPal SDK Types
interface ApplePayConfig {
  countryCode: string;
  currencyCode: string;
  merchantCapabilities: string[];
  supportedNetworks: string[];
}

interface PayPalPaymentProps {
  checkoutId: string;
  totalAmount: number;
  currency?: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  setIsProcessingPayment: (state: PaymentProcessingState) => void;
  paypalClientId?: string;
  environment?: "sandbox" | "live";
  userEmail?: string;
  guestEmail?: string;
  termsAccepted?: boolean;
  termsData?: { page?: { isPublished: boolean } | null };
  onTermsModalOpen?: () => void;
  onTermsAcceptedChange?: (accepted: boolean) => void;
  questionsValid?: boolean;
}

export function PayPalPayment({
  checkoutId,
  totalAmount,
  currency = "USD",
  onSuccess,
  onError,
  setIsProcessingPayment,
  paypalClientId,
  environment = "sandbox",
  userEmail,
  guestEmail,
  termsAccepted = true,
  termsData,
  onTermsModalOpen,
  onTermsAcceptedChange,
  questionsValid = true,
}: PayPalPaymentProps) {
  const router = useRouter();
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [isCapturingPayment, setIsCapturingPayment] = useState(false);
  const [paypalConfig, setPaypalConfig] = useState<{
    clientId: string;
    merchantId: string | null;
    merchantClientId: string | null;
    paymentMethodReadiness?: {
      applePay: boolean;
      googlePay: boolean;
      paypalButtons: boolean;
      advancedCardProcessing: boolean;
      vaulting: boolean;
    };
    savedPaymentMethods?: Array<{
      id: string;
      type: string;
      card?: {
        brand: string;
        lastDigits: string;
        expiry: string;
      };
    }>;
    userIdToken: string;
  } | null>(null);
  const saleorUserId = useGlobalStore((s) => s.user?.id);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [googlePaySdkLoaded, setGooglePaySdkLoaded] = useState(false);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const isLoggedIn = useGlobalStore((s) => s.isLoggedIn);
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const buttonsRendered = useRef(false);
  const applePayRendered = useRef(false);
  const googlePayRendered = useRef(false);
  const configFetched = useRef(false);

  // NEW: Card fields state
  const [showCardFields, setShowCardFields] = useState(false);
  const [cardFieldsReady, setCardFieldsReady] = useState(false);
  const cardFieldsRef = useRef<PayPalCardFieldsInstance | null>(null);
  const cardFieldsRendered = useRef(false);
  const [currentTransactionId, setCurrentTransactionId] = useState<
    string | null
  >(null);

  // NEW: Saved cards state
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);
  const [isPayingWithVaultedCard, setIsPayingWithVaultedCard] = useState(false);

  useEffect(() => {
    const existingCookie = Cookies.get("savePaymentMethod");
    if (existingCookie) {
      Cookies.remove("savePaymentMethod");
    }
  }, []);

  // Fetch PayPal configuration dynamically from Saleor using GraphQL
  useEffect(() => {
    if (configFetched.current) {
      return;
    }

    const fetchPayPalConfig = async () => {
      try {
        setIsLoadingConfig(true);

        const response = await fetch("/api/paypal/get-config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checkoutId,
            amount: totalAmount,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error ||
              `Failed to fetch PayPal configuration (HTTP ${response.status})`,
          );
        }

        const result = await response.json();

        if (!result.clientId) {
          throw new Error("PayPal client ID not configured in the payment app");
        }

        setPaypalConfig({
          clientId: result.clientId,
          merchantId: result.merchantId || null,
          paymentMethodReadiness: result.paymentMethodReadiness,
          merchantClientId: result.merchantClientId || null,
          userIdToken: result.userIdToken,
          savedPaymentMethods: result.savedPaymentMethods || [],
        });

        if (result.paymentMethodReadiness) {
          console.log("Payment Methods Status:", {
            "Apple Pay": result.paymentMethodReadiness.applePay
              ? "✓ ENABLED"
              : "✗ DISABLED",
            "Google Pay": result.paymentMethodReadiness.googlePay
              ? "✓ ENABLED"
              : "✗ DISABLED",
            "PayPal Buttons": result.paymentMethodReadiness.paypalButtons
              ? "✓ ENABLED"
              : "✗ DISABLED",
            "Card Processing": result.paymentMethodReadiness
              .advancedCardProcessing
              ? "✓ ENABLED"
              : "✗ DISABLED",
            Vaulting: result.paymentMethodReadiness.vaulting
              ? "✓ ENABLED"
              : "✗ DISABLED",
          });
        } else {
          console.warn(
            "⚠️  Payment method readiness not available - merchant may not have completed onboarding",
          );
        }

        configFetched.current = true;
      } catch (error) {
        setSdkError(
          error instanceof Error
            ? error.message
            : "Failed to load PayPal configuration",
        );
      } finally {
        setIsLoadingConfig(false);
      }
    };

    fetchPayPalConfig();
  }, [checkoutId, totalAmount]);

  // Load Google Pay SDK
  useEffect(() => {
    if (window.google?.payments?.api) {
      setGooglePaySdkLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://pay.google.com/gp/p/js/pay.js";
    script.async = true;
    script.onload = () => {
      setGooglePaySdkLoaded(true);
    };
    script.onerror = () => {
      console.error("Failed to load Google Pay SDK");
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Load PayPal SDK once config is available
  useEffect(() => {
    if (!paypalConfig || isLoadingConfig) {
      return;
    }

    if (window.paypal) {
      setSdkLoaded(true);
      return;
    }

    const script = document.createElement("script");

    // Build SDK URL with card-fields component for ACDC
    let sdkUrl = `https://www.paypal.com/sdk/js?client-id=${paypalConfig.clientId}`;

    if (paypalConfig.merchantId) {
      sdkUrl += `&merchant-id=${paypalConfig.merchantId}`;
    }

    // Include card-fields component for custom card fields
    sdkUrl += `&currency=${currency}&intent=capture&components=buttons,card-fields,applepay,googlepay&vault=true`;

    script.src = sdkUrl;
    script.async = true;

    script.setAttribute("data-partner-attribution-id", "bnCode");

    // Attach user-id-token for vaulting if available
    if (paypalConfig.userIdToken) {
      script.setAttribute("data-user-id-token", paypalConfig.userIdToken);
      console.log("✅ userIdToken attached to SDK script tag");
    }

    script.onload = () => {
      setSdkLoaded(true);
    };

    script.onerror = () => {
      setSdkError(
        "Failed to load PayPal payment system. Please check the client ID configuration.",
      );
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [paypalConfig, isLoadingConfig, currency]);

  // Render PayPal buttons
  useEffect(() => {
    if (!sdkLoaded || !window.paypal || buttonsRendered.current) {
      return;
    }

    const container = paypalContainerRef.current;
    if (!container) {
      return;
    }

    if (container.children.length > 0) {
      buttonsRendered.current = true;
      return;
    }

    try {
      window.paypal
        .Buttons({
          createOrder: async (data: PayPalCreateOrderData, _actions: PayPalActions) => {
            setIsProcessingPayment({
              isModalOpen: true,
              paymentProcessingLoading: true,
              error: false,
              success: false,
            });

            try {
              const fundingSource = data.paymentSource;
              const response = await fetch("/api/paypal/create-order", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  checkoutId,
                  amount: totalAmount,
                  currency,
                  paymentMethodType: fundingSource,
                  saleorUserId: isLoggedIn ? saleorUserId : undefined,
                }),
              });

              const responseData = await response.json();

              if (!response.ok || !responseData.orderId) {
                throw new Error(
                  responseData.error || "Failed to create PayPal order",
                );
              }

              if (responseData.transactionId) {
                sessionStorage.setItem(
                  `paypal-txn-${checkoutId}`,
                  responseData.transactionId,
                );
              }

              return responseData.orderId;
            } catch (error) {
              setIsProcessingPayment({
                isModalOpen: false,
                paymentProcessingLoading: false,
                error: true,
                success: false,
              });
              if (error instanceof Error) {
                onError(`Failed to create PayPal order: ${error.message}`);
              } else {
                onError("Failed to create PayPal order");
              }
              throw error;
            }
          },

          onApprove: async (data: { orderID: string }) => {
            setIsCapturingPayment(true);

            setIsProcessingPayment({
              isModalOpen: true,
              paymentProcessingLoading: true,
              error: false,
              success: false,
            });

            try {
              const transactionId = sessionStorage.getItem(
                `paypal-txn-${checkoutId}`,
              );

              const response = await fetch("/api/paypal/capture-order", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  checkoutId,
                  orderId: data.orderID,
                  transactionId,
                }),
              });

              const result = await response.json();

              if (!response.ok || result.error) {
                throw new Error(result.error || "Failed to capture payment");
              }

              const orderData = result.order;

              if (orderData?.id && orderData?.number) {
                setIsProcessingPayment({
                  isModalOpen: false,
                  paymentProcessingLoading: false,
                  error: false,
                  success: true,
                });

                router.push(
                  `/order-confirmation?orderId=${orderData.id}&orderNumber=${orderData.number}&total=${orderData.total}`,
                );

                onSuccess();
              } else {
                throw new Error("Order data not found in response");
              }
            } catch (error) {
              setIsCapturingPayment(false);

              setIsProcessingPayment({
                isModalOpen: false,
                paymentProcessingLoading: false,
                error: true,
                success: false,
              });
              if (error instanceof Error) {
                onError(`Payment capture failed: ${error.message}`);
              } else {
                onError("Payment capture failed");
              }
            }
          },

          onError: () => {
            setIsProcessingPayment({
              isModalOpen: false,
              paymentProcessingLoading: false,
              error: true,
              success: false,
            });
            onError("PayPal payment error occurred");
          },

          onCancel: () => {
            setIsProcessingPayment({
              isModalOpen: false,
              paymentProcessingLoading: false,
              error: false,
              success: false,
            });
          },

          style: {
            layout: "vertical",
            color: "gold",
            shape: "rect",
            label: "paypal",
            height: 45,
          },
        })
        .render("#paypal-button-container")
        .then(() => {
          buttonsRendered.current = true;
        })
        .catch(() => {
          setSdkError("Failed to render PayPal buttons");
        });
    } catch (error) {
      setSdkError("Failed to initialize PayPal buttons");
    }
  }, [
    sdkLoaded,
    checkoutId,
    totalAmount,
    currency,
    onSuccess,
    onError,
    setIsProcessingPayment,
    router,
    isLoggedIn,
    saleorUserId,
  ]);

  // NEW: Render Card Fields when user clicks "Pay with Card"
  useEffect(() => {
    if (
      !sdkLoaded ||
      !window.paypal ||
      !showCardFields ||
      cardFieldsRendered.current
    ) {
      return;
    }

    if (!window.paypal.CardFields) {
      console.error("CardFields not available. Ensure ACDC is enabled.");
      setSdkError("Card payments are not available. Please use PayPal.");
      return;
    }

    cardFieldsRendered.current = true;

    try {
      const cardFields = window.paypal.CardFields({
        createOrder: async () => {
          setIsProcessingPayment({
            isModalOpen: true,
            paymentProcessingLoading: true,
            error: false,
            success: false,
          });

          try {
            const response = await fetch("/api/paypal/create-order", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                checkoutId,
                amount: totalAmount,
                currency,
                paymentMethodType: "card",
                saleorUserId: isLoggedIn ? saleorUserId : undefined,
              }),
            });

            const responseData = await response.json();

            if (!response.ok || !responseData.orderId) {
              throw new Error(
                responseData.error || "Failed to create PayPal order",
              );
            }
            // Store transaction ID
            if (responseData.transactionId) {
              setCurrentTransactionId(responseData.transactionId);
              sessionStorage.setItem(
                `paypal-txn-${checkoutId}`,
                responseData.transactionId,
              );
            }

            return responseData.orderId;
          } catch (error) {
            setIsProcessingPayment({
              isModalOpen: false,
              paymentProcessingLoading: false,
              error: true,
              success: false,
            });
            if (error instanceof Error) {
              onError(`Failed to create PayPal order: ${error.message}`);
            } else {
              onError("Failed to create PayPal order");
            }
            throw error;
          }
        },

        onApprove: async (data: { orderID: string }) => {
          setIsCapturingPayment(true);

          setIsProcessingPayment({
            isModalOpen: true,
            paymentProcessingLoading: true,
            error: false,
            success: false,
          });

          try {
            const transactionId = sessionStorage.getItem(
              `paypal-txn-${checkoutId}`,
            );

            // Capture payment
            const response = await fetch("/api/paypal/capture-order", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                checkoutId,
                orderId: data.orderID,
                transactionId,
              }),
            });

            const result = await response.json();

            if (!response.ok || result.error) {
              throw new Error(result.error || "Failed to capture payment");
            }

            const orderData = result.order;

            if (orderData?.id && orderData?.number) {
              setIsProcessingPayment({
                isModalOpen: false,
                paymentProcessingLoading: false,
                error: false,
                success: true,
              });

              router.push(
                `/order-confirmation?orderId=${orderData.id}&orderNumber=${orderData.number}&total=${orderData.total}`,
              );

              onSuccess();
            } else {
              throw new Error("Order data not found in response");
            }
          } catch (error) {
            setIsCapturingPayment(false);

            setIsProcessingPayment({
              isModalOpen: false,
              paymentProcessingLoading: false,
              error: true,
              success: false,
            });
            if (error instanceof Error) {
              onError(`Payment capture failed: ${error.message}`);
            } else {
              onError("Payment capture failed");
            }
          }
        },

        onError: (err: Error) => {
          console.error("🎴 CardFields.onError", err);
          setIsProcessingPayment({
            isModalOpen: false,
            paymentProcessingLoading: false,
            error: true,
            success: false,
          });
          onError(`Card payment error: ${err.message}`);
        },

        style: {
          input: {
            "font-size": "15px",
            "font-family":
              "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
            color: "#333",
          },
          ":focus": { color: "#333" },
        },
      });

      if (cardFields.isEligible()) {
        // Render each field
        cardFields.NumberField().render("#card-number-field");
        cardFields.ExpiryField().render("#card-expiry-field");
        cardFields.CVVField().render("#card-cvv-field");
        cardFields.NameField().render("#card-name-field");

        cardFieldsRef.current = cardFields;
        setCardFieldsReady(true);
      } else {
        console.error("❌ CardFields not eligible");
        setSdkError("Card fields not available for this configuration");
      }
    } catch (error) {
      console.error("❌ Failed to initialize CardFields:", error);
      setSdkError("Failed to initialize card payment fields");
    }
  }, [
    sdkLoaded,
    showCardFields,
    checkoutId,
    totalAmount,
    currency,
    savePaymentMethod,
    isLoggedIn,
    saleorUserId,
    onSuccess,
    onError,
    setIsProcessingPayment,
    router,
  ]);

  // Render Apple Pay button
  useEffect(() => {
    if (!sdkLoaded || !window.paypal || applePayRendered.current) {
      return;
    }

    if (!paypalConfig?.paymentMethodReadiness?.applePay) {
      return;
    }

    const applePayContainer = document.getElementById("applepay-container");
    if (!applePayContainer) {
      return;
    }

    if (applePayContainer.children.length > 0) {
      applePayRendered.current = true;
      return;
    }

    applePayRendered.current = true;

    try {
      if (
        !window.ApplePaySession ||
        !window.ApplePaySession.canMakePayments()
      ) {
        applePayContainer.style.display = "none";
        return;
      }

      const applepay = window.paypal.Applepay();

      applepay
        .config()
        .then((applePayConfig) => {
          const button = document.createElement("button");
          button.className = "apple-pay-button apple-pay-button-black";
          button.style.cssText =
            "width: 100%; height: 45px; display: block; cursor: pointer; -webkit-appearance: -apple-pay-button; -apple-pay-button-type: plain;";

          button.addEventListener("click", () => {
            try {
              const paymentRequest = {
                countryCode: applePayConfig.countryCode || "US",
                currencyCode: currency,
                merchantCapabilities: applePayConfig.merchantCapabilities || [
                  "supports3DS",
                  "supportsCredit",
                  "supportsDebit",
                ],
                supportedNetworks: applePayConfig.supportedNetworks || [
                  "masterCard",
                  "discover",
                  "visa",
                  "amex",
                ],
                total: {
                  label: "Total",
                  type: "final",
                  amount: totalAmount.toFixed(2),
                },
              };

              if (!window.ApplePaySession) {
                console.error("ApplePaySession not available");
                onError("Apple Pay is not available on this device");
                return;
              }
              const session = new window.ApplePaySession(4, paymentRequest);

              session.onvalidatemerchant = (event: {
                validationURL: string;
              }) => {
                applepay
                  .validateMerchant({
                    validationUrl: event.validationURL,
                    displayName: "Web Shop Manager",
                  })
                  .then((validateResult: { merchantSession: unknown }) => {
                    console.log("✅ Merchant validated");
                    session.completeMerchantValidation(
                      validateResult.merchantSession,
                    );
                  })
                  .catch((validateError: Error) => {
                    console.error(
                      "❌ Merchant validation failed:",
                      validateError,
                    );
                    console.error("Validation error details:", {
                      message: validateError.message,
                      name: validateError.name,
                      stack: validateError.stack,
                    });
                    session.abort();
                    onError(
                      `Apple Pay validation failed: ${validateError.message || "Unknown validation error"}`,
                    );
                  });
              };

              session.onpaymentauthorized = async (event: {
                payment: { token: unknown; billingContact?: unknown };
              }) => {
                try {
                  setIsProcessingPayment({
                    isModalOpen: true,
                    paymentProcessingLoading: true,
                    error: false,
                    success: false,
                  });

                  const response = await fetch("/api/paypal/create-order", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      checkoutId,
                      amount: totalAmount,
                      currency,
                      paymentMethodType: "applepay",
                      saleorUserId: isLoggedIn ? saleorUserId : undefined,
                    }),
                  });

                  const data = await response.json();

                  if (!response.ok || !data.orderId) {
                    const errorMessage =
                      data.error ||
                      data.message ||
                      "Failed to create PayPal order";
                    console.error("❌ Order creation failed:", {
                      status: response.status,
                      statusText: response.statusText,
                      error: errorMessage,
                      fullResponse: data,
                    });
                    throw new Error(errorMessage);
                  }

                  if (data.transactionId) {
                    sessionStorage.setItem(
                      `paypal-txn-${checkoutId}`,
                      data.transactionId,
                    );
                  }

                  const confirmResult = await applepay.confirmOrder({
                    orderId: data.orderId,
                    token: event.payment.token,
                    billingContact: event.payment.billingContact,
                  });

                  // Complete payment with SUCCESS status
                  if (window.ApplePaySession) {
                    session.completePayment(
                      window.ApplePaySession.STATUS_SUCCESS,
                    );
                  }

                  setIsCapturingPayment(true);

                  const transactionId = sessionStorage.getItem(
                    `paypal-txn-${checkoutId}`,
                  );

                  const captureResponse = await fetch(
                    "/api/paypal/capture-order",
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        checkoutId,
                        orderId: data.orderId,
                        transactionId,
                      }),
                    },
                  );

                  const result = await captureResponse.json();

                  if (!captureResponse.ok || result.error) {
                    const captureError =
                      result.error ||
                      result.message ||
                      "Failed to capture payment";
                    console.error("❌ Capture failed:", {
                      status: captureResponse.status,
                      statusText: captureResponse.statusText,
                      error: captureError,
                      fullResponse: result,
                    });
                    throw new Error(captureError);
                  }

                  const orderData = result.order;

                  if (orderData?.id && orderData?.number) {
                    // Apple Pay payment successful.

                    setIsProcessingPayment({
                      isModalOpen: false,
                      paymentProcessingLoading: false,
                      error: false,
                      success: true,
                    });

                    router.push(
                      `/order-confirmation?orderId=${orderData.id}&orderNumber=${orderData.number}&total=${orderData.total}`,
                    );

                    onSuccess();
                  } else {
                    console.error("❌ Invalid order data:", result);
                    throw new Error("Order data not found in response");
                  }
                } catch (error) {
                  console.error("❌ Payment processing error:", error);

                  // Log detailed error information
                  if (error instanceof Error) {
                    console.error("Error details:", {
                      message: error.message,
                      name: error.name,
                      stack: error.stack,
                    });
                  } else {
                    console.error("Non-Error object thrown:", error);
                  }

                  if (window.ApplePaySession) {
                    session.completePayment(
                      window.ApplePaySession.STATUS_FAILURE,
                    );
                  }
                  setIsCapturingPayment(false);
                  setIsProcessingPayment({
                    isModalOpen: false,
                    paymentProcessingLoading: false,
                    error: true,
                    success: false,
                  });

                  // Provide detailed error message to user
                  const errorMessage =
                    error instanceof Error
                      ? error.message
                      : "An unexpected error occurred during payment processing";

                  onError(`Apple Pay payment failed: ${errorMessage}`);
                }
              };

              // ENHANCED: Cancel handler with sessionError details
              session.oncancel = (event: ApplePayCancelEvent) => {
                console.log("Apple Pay session cancelled by user");
                console.log("Cancel event:", event);

                // Log sessionError if present
                if (event.sessionError) {
                  console.warn("⚠️  Session Error Details:", {
                    code: event.sessionError.code,
                    message:
                      event.sessionError.message || "No message provided",
                    info: event.sessionError.info,
                    contactField: event.sessionError.contactField,
                    fullError: event.sessionError,
                  });

                  // Check for specific error codes
                  switch (event.sessionError.code) {
                    case "unknown":
                      console.log(
                        "⚠️  Unknown error - likely user cancelled or device limitation",
                      );
                      break;
                    case "shippingContactInvalid":
                      console.error("❌ Invalid shipping contact");
                      break;
                    case "billingContactInvalid":
                      console.error("❌ Invalid billing contact");
                      break;
                    case "addressUnserviceable":
                      console.error("❌ Address cannot be serviced");
                      break;
                    default:
                      console.error(
                        `❌ Unhandled error code: ${event.sessionError.code}`,
                      );
                  }

                  // If there's an actual error (not just user cancellation), show it
                  if (
                    event.sessionError.code !== "unknown" ||
                    event.sessionError.message
                  ) {
                    setIsProcessingPayment({
                      isModalOpen: false,
                      paymentProcessingLoading: false,
                      error: true,
                      success: false,
                    });

                    const errorMessage = event.sessionError.message
                      ? `Apple Pay error: ${event.sessionError.message}`
                      : `Apple Pay error code: ${event.sessionError.code}`;

                    onError(errorMessage);
                    return;
                  }
                }

                // Normal user cancellation (no real error)
                console.log(
                  "✅ Normal cancellation - user closed Apple Pay sheet",
                );
                setIsProcessingPayment({
                  isModalOpen: false,
                  paymentProcessingLoading: false,
                  error: false,
                  success: false,
                });
              };
              // Begin the session AFTER all event handlers are set
              console.log("Starting Apple Pay session...");
              session.begin();
              console.log("✅ Apple Pay session started");
            } catch (error) {
              console.error(
                "❌ Apple Pay session initialization error:",
                error,
              );

              // Log detailed error information
              if (error instanceof Error) {
                console.error("Initialization error details:", {
                  message: error.message,
                  name: error.name,
                  stack: error.stack,
                });
              } else if (error instanceof DOMException) {
                console.error("DOMException details:", {
                  message: error.message,
                  name: error.name,
                  code: error.code,
                });
              } else {
                console.error("Unknown error type:", typeof error, error);
              }

              setIsProcessingPayment({
                isModalOpen: false,
                paymentProcessingLoading: false,
                error: true,
                success: false,
              });

              // Provide detailed error message to user
              let userErrorMessage = "Apple Pay initialization failed";

              if (error instanceof Error) {
                userErrorMessage += `: ${error.message}`;
              } else if (error instanceof DOMException) {
                userErrorMessage += `: ${error.name} - ${error.message}`;
              } else {
                userErrorMessage +=
                  ". Please try again or use a different payment method.";
              }

              onError(userErrorMessage);
            }
          });

          applePayContainer.appendChild(button);
        })
        .catch((error) => {
          console.error("Apple Pay not available:", error);
          applePayContainer.style.display = "none";
          applePayRendered.current = false;
        });
    } catch (error) {
      console.error("Failed to initialize Apple Pay:", error);
      applePayContainer.style.display = "none";
      applePayRendered.current = false;
    }
  }, [
    sdkLoaded,
    paypalConfig,
    checkoutId,
    totalAmount,
    currency,
    onSuccess,
    onError,
    setIsProcessingPayment,
    router,
  ]);

  // Render Google Pay button
  useEffect(() => {
    if (!sdkLoaded || !window.paypal || googlePayRendered.current) {
      return;
    }

    if (!paypalConfig?.paymentMethodReadiness?.googlePay) {
      return;
    }

    if (!googlePaySdkLoaded || !window.google?.payments?.api) {
      console.log("Google Pay SDK not loaded yet");
      return;
    }

    const googlePayContainer = document.getElementById("googlepay-container");
    if (!googlePayContainer) {
      return;
    }

    if (googlePayContainer.children.length > 0) {
      googlePayRendered.current = true;
      return;
    }

    googlePayRendered.current = true;

    try {
      const googlepay = window.paypal.Googlepay();

      googlepay
        .config()
        .then(async (googlePayConfig) => {
          console.log("Google Pay configured:", googlePayConfig);

          if (!window.google?.payments?.api) {
            console.error("Google Pay SDK not available");
            googlePayContainer.style.display = "none";
            return;
          }

          const paymentsClient = new window.google.payments.api.PaymentsClient({
            environment: environment === "sandbox" ? "TEST" : "PRODUCTION",
          });

          const isReadyToPayRequest = {
            apiVersion: 2,
            apiVersionMinor: 0,
            allowedPaymentMethods: googlePayConfig.allowedPaymentMethods,
          };

          const { result: isReadyToPay } =
            await paymentsClient.isReadyToPay(isReadyToPayRequest);
          if (!isReadyToPay) {
            console.log("Google Pay not available on this device");
            googlePayContainer.style.display = "none";
            return;
          }

          const button = document.createElement("button");
          button.className = "gpay-button";
          button.style.cssText =
            "width: 100%; height: 45px; background-color: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; display: flex; align-items: center; justify-content: center; font-size: 14px;";
          button.textContent = "Google Pay";

          button.addEventListener("click", async () => {
            try {
              const paymentDataRequest: PaymentDataRequest = {
                apiVersion: 2,
                apiVersionMinor: 0,
                allowedPaymentMethods: googlePayConfig.allowedPaymentMethods,
                merchantInfo: googlePayConfig.merchantInfo,
                transactionInfo: {
                  totalPriceStatus: "FINAL",
                  totalPrice: totalAmount.toFixed(2),
                  currencyCode: currency,
                },
              };

              const paymentData =
                await paymentsClient.loadPaymentData(paymentDataRequest);
              console.log("✅ Payment data received from Google Pay");

              setIsProcessingPayment({
                isModalOpen: true,
                paymentProcessingLoading: true,
                error: false,
                success: false,
              });

              console.log("📝 Creating PayPal order...");
              const response = await fetch("/api/paypal/create-order", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  checkoutId,
                  amount: totalAmount,
                  currency,
                }),
              });

              const data = await response.json();

              if (!response.ok || !data.orderId) {
                throw new Error(data.error || "Failed to create PayPal order");
              }

              // PayPal order created.

              if (data.transactionId) {
                sessionStorage.setItem(
                  `paypal-txn-${checkoutId}`,
                  data.transactionId,
                );
              }

              const confirmResult = await googlepay.confirmOrder({
                orderId: data.orderId,
                paymentMethodData: paymentData.paymentMethodData,
              });

              if (
                confirmResult.status !== "APPROVED" &&
                confirmResult.status !== "COMPLETED"
              ) {
                throw new Error(
                  `Payment was not approved. Status: ${confirmResult.status}`,
                );
              }

              setIsCapturingPayment(true);

              const transactionId = sessionStorage.getItem(
                `paypal-txn-${checkoutId}`,
              );

              const maxRetries = 3;
              const retryDelay = 2000;

              let result:
                | {
                    order?: { id: string; number: string; total: number };
                    error?: string;
                    status?: string;
                  }
                | undefined;
              let captureResponse: Response | undefined;
              let retryCount = 0;

              while (retryCount < maxRetries) {
                captureResponse = await fetch("/api/paypal/capture-order", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    checkoutId,
                    orderId: data.orderId,
                    transactionId,
                  }),
                });

                result = await captureResponse.json();

                if (
                  captureResponse.status === 202 &&
                  result?.status === "processing"
                ) {
                  await new Promise((resolve) =>
                    setTimeout(resolve, retryDelay),
                  );
                  retryCount++;
                  continue;
                }

                break;
              }

              if (!captureResponse || !captureResponse.ok || result?.error) {
                if (captureResponse && captureResponse.status === 202) {
                  throw new Error(
                    "Your payment is being processed. Please check your email for order confirmation.",
                  );
                }
                throw new Error(result?.error || "Failed to capture payment");
              }

              const orderData = result?.order;

              if (orderData?.id && orderData?.number) {
                setIsProcessingPayment({
                  isModalOpen: false,
                  paymentProcessingLoading: false,
                  error: false,
                  success: true,
                });

                router.push(
                  `/order-confirmation?orderId=${orderData.id}&orderNumber=${orderData.number}&total=${orderData.total}`,
                );

                onSuccess();
              } else {
                throw new Error("Order data not found in response");
              }
            } catch (error) {
              console.error("❌ Google Pay payment error:", error);
              setIsCapturingPayment(false);
              setIsProcessingPayment({
                isModalOpen: false,
                paymentProcessingLoading: false,
                error: true,
                success: false,
              });
              if (error instanceof Error) {
                onError(`Google Pay payment failed: ${error.message}`);
              } else {
                onError("Google Pay payment failed");
              }
            }
          });

          googlePayContainer.appendChild(button);
        })
        .catch((error) => {
          console.error("Google Pay not available:", error);
          googlePayContainer.style.display = "none";
          googlePayRendered.current = false;
        });
    } catch (error) {
      console.error("Failed to initialize Google Pay:", error);
      googlePayContainer.style.display = "none";
      googlePayRendered.current = false;
    }
  }, [
    sdkLoaded,
    googlePaySdkLoaded,
    paypalConfig,
    checkoutId,
    totalAmount,
    currency,
    environment,
    onSuccess,
    onError,
    setIsProcessingPayment,
    router,
  ]);

  // NEW: Handle card payment submission
  const handleCardPayment = async () => {
    if (!cardFieldsRef.current) {
      onError("Card fields not initialized");
      return;
    }

    try {
      await cardFieldsRef.current.submit();
      // The onApprove callback in CardFields will handle the rest
    } catch (error) {
      console.error("❌ Card submission error:", error);
      if (error instanceof Error) {
        onError(`Card payment failed: ${error.message}`);
      } else {
        onError("Card payment failed");
      }
    }
  };

  // NEW: Pay with saved/vaulted card
  // In handlePayWithVaultedCard function, replace the entire function with:

  const handlePayWithVaultedCard = async () => {
    if (!selectedVaultId) {
      onError("Please select a saved card");
      return;
    }

    setIsPayingWithVaultedCard(true);

    try {
      setIsProcessingPayment({
        isModalOpen: true,
        paymentProcessingLoading: true,
        error: false,
        success: false,
      });

      // Step 1: Create order with vaultId - this should auto-capture
      const response = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkoutId,
          amount: totalAmount,
          currency,
          paymentMethodType: "card",
          vaultId: selectedVaultId,
          saleorUserId: isLoggedIn ? saleorUserId : undefined,
        }),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.orderId) {
        throw new Error(responseData.error || "Failed to create PayPal order");
      }

      console.log("✅ PayPal Order created with vaulted card");

      // Step 2: Store transaction ID
      if (responseData.transactionId) {
        sessionStorage.setItem(
          `paypal-txn-${checkoutId}`,
          responseData.transactionId,
        );
      }

      // Step 3: Immediately try to capture
      // For vaulted cards, PayPal often auto-captures, but we still need to call capture-order
      // to complete the Saleor order
      setIsCapturingPayment(true);

      const transactionId = sessionStorage.getItem(`paypal-txn-${checkoutId}`);

      const captureResponse = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkoutId,
          orderId: responseData.orderId,
          transactionId,
        }),
      });

      const result = await captureResponse.json();

      if (!captureResponse.ok || result.error) {
        throw new Error(result.error || "Failed to capture payment");
      }

      const orderData = result.order;

      if (orderData?.id && orderData?.number) {
        console.log("✅ Vaulted card payment successful:", orderData.number);

        setIsProcessingPayment({
          isModalOpen: false,
          paymentProcessingLoading: false,
          error: false,
          success: true,
        });

        router.push(
          `/order-confirmation?orderId=${orderData.id}&orderNumber=${orderData.number}&total=${orderData.total}`,
        );

        onSuccess();
      } else {
        throw new Error("Order data not found in response");
      }
    } catch (error) {
      console.error("❌ Vaulted card payment error:", error);
      setIsCapturingPayment(false);
      setIsProcessingPayment({
        isModalOpen: false,
        paymentProcessingLoading: false,
        error: true,
        success: false,
      });
      if (error instanceof Error) {
        onError(`Payment failed: ${error.message}`);
      } else {
        onError("Payment failed");
      }
    } finally {
      setIsPayingWithVaultedCard(false);
    }
  };

  if (isLoadingConfig || !paypalConfig || !sdkLoaded) {
    return (
      <div className="space-y-4">
        <LoadingUI className="h-32" />
        <p className="text-center text-sm text-[var(--color-secondary-600)]">
          {isLoadingConfig
            ? "Loading PayPal configuration..."
            : "Loading PayPal payment system..."}
        </p>
      </div>
    );
  }

  const hasEmail = userEmail || guestEmail;
  const needsTermsAcceptance = termsData?.page?.isPublished && !termsAccepted;
  const isDisabled =
    !questionsValid || needsTermsAcceptance || !hasEmail || isCapturingPayment;

  return (
    <div className="space-y-6">
      {isCapturingPayment && (
        <div className="space-y-4">
          <LoadingUI className="h-32" />
          <p className="text-center text-sm text-[var(--color-secondary-600)]">
            Processing payment...
          </p>
        </div>
      )}

      <div className={isCapturingPayment ? "hidden" : ""}>
        {!hasEmail && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <p className="text-yellow-700 text-sm">
              Please provide an email address to continue with payment.
            </p>
          </div>
        )}

        {!questionsValid && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <p className="text-yellow-700 text-sm">
              Please complete all required questions below.
            </p>
          </div>
        )}

        {/* NEW: Saved Payment Methods Section */}
        {isLoggedIn &&
          paypalConfig?.savedPaymentMethods &&
          paypalConfig.savedPaymentMethods.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-secondary font-semibold text-gray-900 mb-2">
                Saved Payment Methods
              </h3>
              <div className="space-y-2">
                {paypalConfig.savedPaymentMethods.map((paymentMethod) => {
                  const isSelected = selectedVaultId === paymentMethod.id;
                  return (
                    <div
                      key={paymentMethod.id}
                      onClick={() => {
                        setSelectedVaultId(paymentMethod.id);
                        setShowCardFields(false);
                      }}
                      className={`
                      flex items-center p-3 border-2 cursor-pointer transition-all
                      ${
                        isSelected
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                          : "border-gray-300 hover:border-[var(--color-primary)]"
                      }
                    `}
                    >
                      <div className="flex-shrink-0 w-12 h-8 bg-gray-400/40 rounded flex items-center justify-center mr-3">
                        <span className="text-xs font-normal font-primary  text-gray-700">
                          {paymentMethod.card?.brand?.substring(0, 4) || "CARD"}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium font-secondary text-gray-900">
                          {paymentMethod.card?.brand} ••••{" "}
                          {paymentMethod.card?.lastDigits}
                        </div>
                        {paymentMethod.card?.expiry && (
                          <div className="text-sm text-gray-600 font-secondary">
                            Expires {paymentMethod.card.expiry}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="flex-shrink-0">
                          <svg
                            className="w-6 h-6 text-[var(--color-primary)]"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedVaultId && (
                <button
                  type="button"
                  onClick={handlePayWithVaultedCard}
                  disabled={isDisabled || isPayingWithVaultedCard}
                  className="w-full mt-4 h-[45px] disabled:pointer-events-none bg-[var(--color-primary)] cursor-pointer text-white font-semibold hover:bg-white ring-1 ring-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isPayingWithVaultedCard ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    "Pay with Selected Card"
                  )}
                </button>
              )}

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-400"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-700 uppercase font-primary">
                    or
                  </span>
                </div>
              </div>
            </div>
          )}

        {/* Payment Buttons Container */}
        <div
          className={`transition-opacity mb-4 ${isDisabled ? "opacity-50 pointer-events-none" : ""}`}
        >
          {/* Apple Pay Button */}
          {paypalConfig?.paymentMethodReadiness?.applePay && (
            <div id="applepay-container" className="mb-3" />
          )}

          {/* Google Pay Button */}
          {paypalConfig?.paymentMethodReadiness?.googlePay && (
            <div id="googlepay-container" className="mb-3" />
          )}

          {/* PayPal Buttons */}

          {sdkError ? (
            <p className="text-red-600 text-xs my-3">
              Failed to load PayPal payment methods: {sdkError}
            </p>
          ) : (
            paypalConfig?.paymentMethodReadiness?.paypalButtons !== false && (
              <div id="paypal-button-container" ref={paypalContainerRef} />
            )
          )}

          {/* NEW: Pay with Card Button */}
          {paypalConfig?.paymentMethodReadiness?.advancedCardProcessing &&
            !showCardFields && (
              <button
                type="button"
                onClick={() => {
                  setShowCardFields(true);
                  setSelectedVaultId(null); // Clear saved card selection
                }}
                className="rounded-sm cursor-pointer w-full h-[45px] mt-1 bg-[#2c2e2f] border-2 border-gray-300 text-white font-normal font-secondary tracking-tight hover:bg-gray-900 transition-colors"
                disabled={isDisabled}
              >
                Debit or Credit Card
              </button>
            )}

          {/* NEW: Card Fields Section */}
          {showCardFields && (
            <div className="border-2 border-gray-300 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Card Details
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowCardFields(false);
                    cardFieldsRendered.current = false;
                    setCardFieldsReady(false);
                    setSelectedVaultId(null); // Also clear when going back
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Use different payment method
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Number
                  </label>
                  <div id="card-number-field" className="" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date
                    </label>
                    <div id="card-expiry-field" className="" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CVV
                    </label>
                    <div id="card-cvv-field" className="" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cardholder Name
                  </label>
                  <div id="card-name-field" className="" />
                </div>

                <button
                  type="button"
                  onClick={handleCardPayment}
                  disabled={!cardFieldsReady || isDisabled}
                  className="uppercase  w-full h-[45px] bg-[var(--color-primary)] text-white rounded font-semibold hover:bg-gray-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Pay Now
                </button>
              </div>
              {isLoggedIn && (
                <div className="flex items-start gap-2 mb-3">
                  <input
                    style={{ accentColor: "var(--color-primary-600)" }}
                    type="checkbox"
                    id="saveCardCheckbox"
                    className="w-5 h-5 cursor-pointer mt-0.5"
                    checked={savePaymentMethod}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSavePaymentMethod(checked);
                      Cookies.set("savePaymentMethod", checked.toString(), {
                        expires: 1,
                      });
                    }}
                  />
                  <label
                    htmlFor="saveCardCheckbox"
                    style={{ color: "var(--color-secondary-600)" }}
                    className="text-sm lg:text-base tracking-[-0.04px] font-secondary cursor-pointer"
                  >
                    Save this card for future purchases
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {termsData?.page?.isPublished && (
          <div className="flex items-start gap-2 w-full">
            <input
              style={{ accentColor: "var(--color-primary-600)" }}
              type="checkbox"
              id="termsAcceptedPayPal"
              className="w-5 h-5 cursor-pointer mt-0.5"
              checked={termsAccepted}
              onChange={(e) => onTermsAcceptedChange?.(e.target.checked)}
            />
            <label
              htmlFor="termsAcceptedPayPal"
              style={{ color: "var(--color-secondary-600)" }}
              className="text-sm lg:text-base tracking-[-0.04px] cursor-pointer"
            >
              I agree to the{" "}
              <button
                type="button"
                onClick={onTermsModalOpen}
                className="font-semibold text-[var(--color-primary-600)] hover:underline focus:underline focus:outline-none cursor-pointer"
              >
                Terms and Conditions
              </button>
            </label>
          </div>
        )}

        {needsTermsAcceptance && (
          <div className="bg-red-50 border border-red-200 p-3 mt-4">
            <p className="text-red-700 text-sm">
              Please accept the Terms and Conditions to continue.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
