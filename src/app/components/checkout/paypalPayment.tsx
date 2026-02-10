"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentProcessingState } from "@/graphql/types/checkout";
import LoadingUI from "../reuseableUI/loadingUI";

// PayPal SDK Types
interface ApplePayConfig {
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
    paymentMethodReadiness?: {
      applePay: boolean;
      googlePay: boolean;
      paypalButtons: boolean;
      advancedCardProcessing: boolean;
      vaulting: boolean;
    };
  } | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [googlePaySdkLoaded, setGooglePaySdkLoaded] = useState(false);
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const buttonsRendered = useRef(false);
  const applePayRendered = useRef(false);
  const googlePayRendered = useRef(false);
  const configFetched = useRef(false);

  // Fetch PayPal configuration dynamically from Saleor using GraphQL
  useEffect(() => {
    // Prevent duplicate calls
    if (configFetched.current) {
      return;
    }

    const fetchPayPalConfig = async () => {
      try {
        setIsLoadingConfig(true);

        // Call the API route to get PayPal configuration
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
          throw new Error(errorData.error || `Failed to fetch PayPal configuration (HTTP ${response.status})`);
        }

        const result = await response.json();

        if (!result.clientId) {
          throw new Error("PayPal client ID not configured in the payment app");
        }

        setPaypalConfig({
          clientId: result.clientId,
          merchantId: result.merchantId || null,
          paymentMethodReadiness: result.paymentMethodReadiness,
        });


        if (result.paymentMethodReadiness) {
          console.log("Payment Methods Status:", {
            "Apple Pay": result.paymentMethodReadiness.applePay ? "✓ ENABLED" : "✗ DISABLED",
            "Google Pay": result.paymentMethodReadiness.googlePay ? "✓ ENABLED" : "✗ DISABLED",
            "PayPal Buttons": result.paymentMethodReadiness.paypalButtons ? "✓ ENABLED" : "✗ DISABLED",
            "Card Processing": result.paymentMethodReadiness.advancedCardProcessing ? "✓ ENABLED" : "✗ DISABLED",
          });
        } else {
          console.warn("⚠️  Payment method readiness not available - merchant may not have completed onboarding");
        }

        // Mark config as fetched
        configFetched.current = true;
      } catch (error) {
        setSdkError(
          error instanceof Error
            ? error.message
            : "Failed to load PayPal configuration"
        );
      } finally {
        setIsLoadingConfig(false);
      }
    };

    fetchPayPalConfig();
  }, [checkoutId, totalAmount]);

  // Load Google Pay SDK
  useEffect(() => {
    // Check if already loaded
    if (window.google?.payments?.api) {
      setGooglePaySdkLoaded(true);
      return;
    }

    // Load Google Pay SDK
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
    // Wait for config to be loaded
    if (!paypalConfig || isLoadingConfig) {
      return;
    }

    // Check if SDK already loaded
    if (window.paypal) {
      setSdkLoaded(true);
      return;
    }

    // Create script element with dynamic configuration
    const script = document.createElement("script");

    // Build SDK URL with proper format (same as hardcoded version)
    let sdkUrl = `https://www.paypal.com/sdk/js?client-id=${paypalConfig.clientId}`;

    // Add merchant-id if available
    if (paypalConfig.merchantId) {
      sdkUrl += `&merchant-id=${paypalConfig.merchantId}`;
    }

    // Add remaining parameters with Apple Pay and Google Pay components
    sdkUrl += `&currency=${currency}&intent=capture&components=buttons,applepay,googlepay`;

    script.src = sdkUrl;
    script.async = true;
    script.setAttribute("data-partner-attribution-id", "bnCode");

    script.onload = () => {
      setSdkLoaded(true);
    };

    script.onerror = () => {
      setSdkError("Failed to load PayPal payment system. Please check the client ID configuration.");
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
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

    // Check if buttons are already rendered in the container
    if (container.children.length > 0) {
      buttonsRendered.current = true;
      return;
    }

    try {
      window.paypal
        .Buttons({
          createOrder: async () => {
            setIsProcessingPayment({
              isModalOpen: true,
              paymentProcessingLoading: true,
              error: false,
              success: false,
            });

            try {
              // Call transaction initialize endpoint
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

              // Store transaction ID for later use
              if (data.transactionId) {
                sessionStorage.setItem(`paypal-txn-${checkoutId}`, data.transactionId);
              }

              return data.orderId;
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
            // Set capturing state to disable buttons
            setIsCapturingPayment(true);

            setIsProcessingPayment({
              isModalOpen: true,
              paymentProcessingLoading: true,
              error: false,
              success: false,
            });

            try {
              // Get stored transaction ID if available
              const transactionId = sessionStorage.getItem(`paypal-txn-${checkoutId}`);

              // Capture/complete the payment
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

              // Extract order details from the response
              const orderData = result.order;

              if (orderData?.id && orderData?.number) {
                setIsProcessingPayment({
                  isModalOpen: false,
                  paymentProcessingLoading: false,
                  error: false,
                  success: true,
                });

                // Redirect to order confirmation page with order details
                router.push(
                  `/order-confirmation?orderId=${orderData.id}&orderNumber=${orderData.number}&total=${orderData.total}`
                );

                // Call onSuccess callback
                onSuccess();
              } else {
                throw new Error("Order data not found in response");
              }
            } catch (error) {
              // Reset capturing state on error
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
  ]);

  // Render Apple Pay button
  useEffect(() => {
    if (!sdkLoaded || !window.paypal || applePayRendered.current) {
      return;
    }

    // Check if Apple Pay is enabled
    if (!paypalConfig?.paymentMethodReadiness?.applePay) {
      return;
    }

    const applePayContainer = document.getElementById("applepay-container");
    if (!applePayContainer) {
      return;
    }

    // Check if buttons are already rendered in the container
    if (applePayContainer.children.length > 0) {
      applePayRendered.current = true;
      return;
    }

    // Mark as rendered immediately to prevent race conditions
    applePayRendered.current = true;

    try {
      // Check if ApplePaySession is available on this device/browser
      if (!window.ApplePaySession || !window.ApplePaySession.canMakePayments()) {
        console.log("Apple Pay not available on this device/browser");
        applePayContainer.style.display = "none";
        return;
      }

      const applepay = window.paypal.Applepay();

      // Configure Apple Pay
      applepay
        .config()
        .then((applePayConfig) => {
          // Apple Pay is available and configured
          console.log("Apple Pay configured:", applePayConfig);

          // Create Apple Pay button
          const button = document.createElement("button");
          button.className = "apple-pay-button apple-pay-button-black";
          button.style.cssText =
            "width: 100%; height: 45px; display: block; cursor: pointer; -webkit-appearance: -apple-pay-button; -apple-pay-button-type: plain;";

          button.addEventListener("click", () => {
            try {
              // Step 1: Create Apple Pay Payment Request (must be synchronous with click)
              console.log("Creating Apple Pay payment session...");

              const paymentRequest = {
                countryCode: applePayConfig.countryCode || "US",
                currencyCode: currency,
                merchantCapabilities: applePayConfig.merchantCapabilities,
                supportedNetworks: applePayConfig.supportedNetworks,
                total: {
                  label: "Total",
                  type: "final",
                  amount: totalAmount.toFixed(2)
                }
              };

              // Step 2: Create Apple Pay Session (MUST be called synchronously in click handler)
              if (!window.ApplePaySession) {
                console.error("ApplePaySession not available");
                onError("Apple Pay is not available on this device");
                return;
              }
              const session = new window.ApplePaySession(4, paymentRequest);

              // Handle merchant validation
              session.onvalidatemerchant = (event: { validationURL: string }) => {
                console.log("Validating merchant...");
                applepay.validateMerchant({
                  validationUrl: event.validationURL,
                  displayName: "Web Shop Manager"
                })
                .then((validateResult: { merchantSession: unknown }) => {
                  console.log("✅ Merchant validated");
                  session.completeMerchantValidation(validateResult.merchantSession);
                })
                .catch((validateError: Error) => {
                  console.error("❌ Merchant validation failed:", validateError);
                  session.abort();
                  onError("Apple Pay validation failed");
                });
              };

              // Handle payment authorization
              session.onpaymentauthorized = async (event: { payment: { token: unknown; billingContact?: unknown } }) => {
                try {
                  console.log("Payment authorized by user");

                  setIsProcessingPayment({
                    isModalOpen: true,
                    paymentProcessingLoading: true,
                    error: false,
                    success: false,
                  });

                  // Step 3: Create PayPal order
                  console.log("Creating PayPal order...");
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

                  console.log("✅ PayPal order created:", data.orderId);

                  // Store transaction ID for later use
                  if (data.transactionId) {
                    sessionStorage.setItem(`paypal-txn-${checkoutId}`, data.transactionId);
                  }

                  // Step 4: Confirm order with PayPal using Apple Pay token
                  console.log("Confirming order with PayPal...");
                  await applepay.confirmOrder({
                    orderId: data.orderId,
                    token: event.payment.token,
                    billingContact: event.payment.billingContact
                  });

                  console.log("✅ Order confirmed with PayPal");

                  // Complete the Apple Pay session as successful
                  if (window.ApplePaySession) {
                    session.completePayment(window.ApplePaySession.STATUS_SUCCESS);
                  }

                  // Step 5: Capture payment
                  setIsCapturingPayment(true);
                  console.log("Capturing payment...");

                  const transactionId = sessionStorage.getItem(`paypal-txn-${checkoutId}`);

                  const captureResponse = await fetch("/api/paypal/capture-order", {
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

                  const result = await captureResponse.json();

                  if (!captureResponse.ok || result.error) {
                    throw new Error(result.error || "Failed to capture payment");
                  }

                  const orderData = result.order;

                  if (orderData?.id && orderData?.number) {
                    console.log("✅ Apple Pay payment successful:", orderData.number);

                    setIsProcessingPayment({
                      isModalOpen: false,
                      paymentProcessingLoading: false,
                      error: false,
                      success: true,
                    });

                    router.push(
                      `/order-confirmation?orderId=${orderData.id}&orderNumber=${orderData.number}&total=${orderData.total}`
                    );

                    onSuccess();
                  } else {
                    throw new Error("Order data not found in response");
                  }
                } catch (error) {
                  console.error("❌ Payment processing error:", error);
                  if (window.ApplePaySession) {
                    session.completePayment(window.ApplePaySession.STATUS_FAILURE);
                  }
                  setIsCapturingPayment(false);
                  setIsProcessingPayment({
                    isModalOpen: false,
                    paymentProcessingLoading: false,
                    error: true,
                    success: false,
                  });
                  if (error instanceof Error) {
                    onError(`Apple Pay payment failed: ${error.message}`);
                  } else {
                    onError("Apple Pay payment failed");
                  }
                }
              };

              // Handle cancel event
              session.oncancel = () => {
                console.log("Apple Pay session cancelled by user");
                setIsProcessingPayment({
                  isModalOpen: false,
                  paymentProcessingLoading: false,
                  error: false,
                  success: false,
                });
              };

              // Begin the session
              session.begin();
              console.log("✅ Apple Pay session started");
            } catch (error) {
              console.error("❌ Apple Pay session error:", error);
              setIsProcessingPayment({
                isModalOpen: false,
                paymentProcessingLoading: false,
                error: true,
                success: false,
              });
              if (error instanceof Error) {
                onError(`Apple Pay initialization failed: ${error.message}`);
              } else {
                onError("Apple Pay initialization failed");
              }
            }
          });

          applePayContainer.appendChild(button);
        })
        .catch((error) => {
          console.error("Apple Pay not available:", error);
          // Apple Pay is not available on this device/browser
          // Hide the container
          applePayContainer.style.display = "none";
          // Reset flag if initialization failed
          applePayRendered.current = false;
        });
    } catch (error) {
      console.error("Failed to initialize Apple Pay:", error);
      applePayContainer.style.display = "none";
      // Reset flag if initialization failed
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

    // Check if Google Pay is enabled
    if (!paypalConfig?.paymentMethodReadiness?.googlePay) {
      return;
    }

    // Check if Google Pay SDK is loaded
    if (!googlePaySdkLoaded || !window.google?.payments?.api) {
      console.log("Google Pay SDK not loaded yet");
      return;
    }

    const googlePayContainer = document.getElementById("googlepay-container");
    if (!googlePayContainer) {
      return;
    }

    // Check if buttons are already rendered in the container
    if (googlePayContainer.children.length > 0) {
      googlePayRendered.current = true;
      return;
    }

    // Mark as rendered immediately to prevent race conditions
    googlePayRendered.current = true;

    try {
      const googlepay = window.paypal.Googlepay();

      // Configure Google Pay to check if it's available
      googlepay
        .config()
        .then(async (googlePayConfig) => {
          // Google Pay is available and configured
          console.log("Google Pay configured:", googlePayConfig);

          // Verify Google Pay SDK is still available (TypeScript safety check)
          if (!window.google?.payments?.api) {
            console.error("Google Pay SDK not available");
            googlePayContainer.style.display = "none";
            return;
          }

          // Create Google Payments client
          const paymentsClient = new window.google.payments.api.PaymentsClient({
            environment: environment === "sandbox" ? "TEST" : "PRODUCTION",
          });

          // Check if Google Pay is available on this device/browser
          const isReadyToPayRequest = {
            apiVersion: 2,
            apiVersionMinor: 0,
            allowedPaymentMethods: googlePayConfig.allowedPaymentMethods,
          };

          const { result: isReadyToPay } = await paymentsClient.isReadyToPay(isReadyToPayRequest);
          if (!isReadyToPay) {
            console.log("Google Pay not available on this device");
            googlePayContainer.style.display = "none";
            return;
          }

          // Create a regular button (not using paymentsClient.createButton)
          const button = document.createElement("button");
          button.className = "gpay-button";
          button.style.cssText =
            "width: 100%; height: 45px; background-color: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; display: flex; align-items: center; justify-content: center; font-size: 14px;";
          button.textContent = "Google Pay";

          button.addEventListener("click", async () => {
            try {
              // Step 1: Show Google Pay payment sheet IMMEDIATELY (must be synchronous with user click)
              // This preserves the user activation context required by Payment Request API
              console.log("💳 Showing Google Pay payment sheet...");

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

              // Show Google Pay payment sheet - MUST be called synchronously after user click
              const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);
              console.log("✅ Payment data received from Google Pay");

              // Step 2: User has authorized payment, now show processing modal
              setIsProcessingPayment({
                isModalOpen: true,
                paymentProcessingLoading: true,
                error: false,
                success: false,
              });

              // Step 3: Create PayPal order (after user authorization)
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

              console.log("✅ PayPal order created:", data.orderId);

              // Store transaction ID for later use
              if (data.transactionId) {
                sessionStorage.setItem(`paypal-txn-${checkoutId}`, data.transactionId);
              }

              // Step 4: Confirm order with PayPal using the payment method data
              console.log("🔐 Confirming order with PayPal SDK...");
              const confirmResult = await googlepay.confirmOrder({
                orderId: data.orderId,
                paymentMethodData: paymentData.paymentMethodData,
              });

              console.log("✅ PayPal confirm result:", confirmResult);

              // Check if payment was approved
              if (confirmResult.status !== "APPROVED" && confirmResult.status !== "COMPLETED") {
                throw new Error(`Payment was not approved. Status: ${confirmResult.status}`);
              }

              // Step 4: Capture the payment with retry logic
              setIsCapturingPayment(true);
              console.log("💰 Capturing payment...");

              // Get stored transaction ID
              const transactionId = sessionStorage.getItem(`paypal-txn-${checkoutId}`);

              // Retry logic for order creation (webhook processing can take time)
              const maxRetries = 3;
              const retryDelay = 2000; // 2 seconds

              let result: { order?: { id: string; number: string; total: number }; error?: string; status?: string } | undefined;
              let captureResponse: Response | undefined;
              let retryCount = 0;

              while (retryCount < maxRetries) {
                // Capture payment
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

                // If order is being processed (202), wait and retry
                if (captureResponse.status === 202 && result?.status === "processing") {
                  console.log(`⏳ Order still processing, retrying in ${retryDelay}ms... (${retryCount + 1}/${maxRetries})`);
                  await new Promise(resolve => setTimeout(resolve, retryDelay));
                  retryCount++;
                  continue;
                }

                // If successful or error, break out of loop
                break;
              }

              if (!captureResponse || !captureResponse.ok || result?.error) {
                // If still processing after all retries, show a different message
                if (captureResponse && captureResponse.status === 202) {
                  throw new Error("Your payment is being processed. Please check your email for order confirmation.");
                }
                throw new Error(result?.error || "Failed to capture payment");
              }

              // Extract order details
              const orderData = result?.order;

              if (orderData?.id && orderData?.number) {
                console.log("✅ Order completed successfully:", orderData.number);

                setIsProcessingPayment({
                  isModalOpen: false,
                  paymentProcessingLoading: false,
                  error: false,
                  success: true,
                });

                // Redirect to order confirmation
                router.push(
                  `/order-confirmation?orderId=${orderData.id}&orderNumber=${orderData.number}&total=${orderData.total}`
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

          // Append button to container
          googlePayContainer.appendChild(button);
        })
        .catch((error) => {
          console.error("Google Pay not available:", error);
          // Google Pay is not available on this device/browser
          // Hide the container
          googlePayContainer.style.display = "none";
          // Reset flag if initialization failed
          googlePayRendered.current = false;
        });
    } catch (error) {
      console.error("Failed to initialize Google Pay:", error);
      googlePayContainer.style.display = "none";
      // Reset flag if initialization failed
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

  // Show error if SDK failed to load
  if (sdkError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-700 text-sm">{sdkError}</p>
        <p className="text-red-600 text-xs mt-2">
          Please refresh the page or contact support.
        </p>
      </div>
    );
  }

  // Show loading while fetching config or loading SDK
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

  // Validation checks
  const hasEmail = userEmail || guestEmail;
  const needsTermsAcceptance = termsData?.page?.isPublished && !termsAccepted;
  const isDisabled = !questionsValid || needsTermsAcceptance || !hasEmail || isCapturingPayment;

  return (
    <div className="space-y-6">
      {/* Payment Capturing Loading Overlay */}
      {isCapturingPayment && (
        <div className="space-y-4">
          <LoadingUI className="h-32" />
          <p className="text-center text-sm text-[var(--color-secondary-600)]">
            Processing payment...
          </p>
        </div>
      )}

      {/* Main PayPal UI - hidden when capturing */}
      <div className={isCapturingPayment ? "hidden" : ""}>
        {/* Validation Messages - Only email and questions at top */}
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

        {/* Payment Buttons Container */}
        <div
          className={`transition-opacity space-y-3 mb-4 ${isDisabled ? "opacity-50 pointer-events-none" : ""}`}
        >
          {/* Apple Pay Button */}
          {paypalConfig?.paymentMethodReadiness?.applePay && (
            <div id="applepay-container" className="min-h-[50px]" />
          )}

          {/* Google Pay Button */}
          {paypalConfig?.paymentMethodReadiness?.googlePay && (
            <div id="googlepay-container" className="min-h-[50px]" />
          )}

          {/* PayPal Buttons */}
          {paypalConfig?.paymentMethodReadiness?.paypalButtons !== false && (
            <div
              id="paypal-button-container"
              ref={paypalContainerRef}
              className="min-h-[50px]"
            />
          )}
        </div>

        {/* Terms Warning - After PayPal Buttons */}
        {needsTermsAcceptance && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <p className="text-yellow-700 text-sm">
              Please accept the Terms and Conditions to continue.
            </p>
          </div>
        )}

        {/* Terms and Conditions Checkbox - At the end, before info message */}
        {termsData?.page?.isPublished && (
          <div className="flex items-start gap-2 w-full py-2 mb-4">
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
                className="font-semibold text-[var(--color-primary-500)] hover:underline focus:underline focus:outline-none"
              >
                Terms and Conditions
              </button>
            </label>
          </div>
        )}

      </div>
    </div>
  );
}
