"use client";

import { useEffect, useRef, useState } from "react";
import { PaymentProcessingState } from "@/graphql/types/checkout";

// Google Pay Config Response Type
interface GooglePayConfigResponse {
  allowedPaymentMethods: AllowedPaymentMethod[];
  merchantInfo: {
    merchantId?: string;
    merchantName?: string;
  };
  isEligible: boolean;
}

interface GooglePayButtonProps {
  checkoutId: string;
  totalAmount: number;
  currency: string;
  environment: "sandbox" | "live";
  onSuccess: () => void;
  onError: (message: string) => void;
  setIsProcessingPayment: (state: PaymentProcessingState) => void;
  disabled?: boolean;
}

export function GooglePayButton({
  checkoutId,
  totalAmount,
  currency,
  environment,
  onSuccess,
  onError,
  setIsProcessingPayment,
  disabled = false,
}: GooglePayButtonProps) {
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRendered = useRef(false);

  useEffect(() => {
    if (buttonRendered.current || !containerRef.current || disabled) {
      return;
    }

    // Check if SDKs are loaded
    if (!window.paypal?.Googlepay || !window.google?.payments?.api) {
      console.log("Google Pay SDKs not loaded yet");
      return;
    }

    const initializeGooglePay = async () => {
      try {
        const googlepay = window.paypal!.Googlepay();
        const paymentsClient = new window.google!.payments!.api.PaymentsClient({
          environment: environment === "sandbox" ? "TEST" : "PRODUCTION",
        });

        // Get PayPal's Google Pay configuration
        const googlePayConfig = await googlepay.config();

        console.log("Google Pay configured:", googlePayConfig);

        // Check if Google Pay is available on this device
        const isReadyToPayRequest: IsReadyToPayRequest = {
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: googlePayConfig.allowedPaymentMethods,
        };

        const readyToPay = await paymentsClient.isReadyToPay(isReadyToPayRequest);

        if (!readyToPay.result) {
          console.log("Google Pay not available on this device");
          return;
        }

        console.log("Google Pay is available");
        setIsReady(true);

        // Create Google Pay button
        const button = document.createElement("button");
        button.className = "gpay-button";
        button.type = "button";
        button.style.cssText = `
          width: 100%;
          height: 48px;
          background-color: #000;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          gap: 8px;
          transition: background-color 0.2s;
        `;

        button.onmouseover = () => {
          button.style.backgroundColor = "#3c4043";
        };
        button.onmouseout = () => {
          button.style.backgroundColor = "#000";
        };

        // Add Google Pay logo
        button.innerHTML = `
          <svg width="41" height="17" viewBox="0 0 41 17" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#clip0)">
              <path d="M19.526 8.433c0 2.537-1.995 4.41-4.465 4.41-2.47 0-4.465-1.873-4.465-4.41 0-2.548 1.994-4.41 4.465-4.41 2.47 0 4.465 1.862 4.465 4.41zm-1.94 0c0-1.615-1.17-2.718-2.524-2.718-1.355 0-2.525 1.103-2.525 2.718 0 1.604 1.17 2.718 2.525 2.718 1.354 0 2.524-1.114 2.524-2.718z" fill="white"/>
              <path d="M28.51 8.433c0 2.537-1.994 4.41-4.464 4.41-2.47 0-4.465-1.873-4.465-4.41 0-2.548 1.994-4.41 4.465-4.41 2.47 0 4.465 1.862 4.465 4.41zm-1.94 0c0-1.615-1.17-2.718-2.524-2.718-1.354 0-2.524 1.103-2.524 2.718 0 1.604 1.17 2.718 2.524 2.718 1.354 0 2.524-1.114 2.524-2.718z" fill="white"/>
              <path d="M36.746 4.248v7.978c0 3.285-1.94 4.632-4.233 4.632-2.16 0-3.458-1.45-3.946-2.631l1.692-.703c.302.724 1.045 1.577 2.254 1.577 1.475 0 2.39-.91 2.39-2.62v-.639h-.068c-.44.542-1.287 1.016-2.355 1.016-2.237 0-4.285-1.948-4.285-4.455 0-2.518 2.048-4.465 4.285-4.465 1.068 0 1.916.474 2.355 1.005h.068v-.695h1.843zm-1.712 4.196c0-1.577-1.057-2.729-2.4-2.729-1.362 0-2.504 1.152-2.504 2.729 0 1.565 1.142 2.695 2.504 2.695 1.343 0 2.4-1.13 2.4-2.695z" fill="white"/>
              <path d="M6.368 7.41v-1.83h6.177c.06.316.09.688.09 1.093 0 1.358-.372 3.04-1.571 4.24-1.165 1.212-2.655 1.86-4.696 1.86C2.934 12.773 0 9.928 0 6.495 0 3.06 2.934.216 6.368.216c1.977 0 3.392.779 4.453 1.795L9.517 3.313C8.777 2.603 7.788 2.056 6.368 2.056c-2.757 0-4.91 2.23-4.91 4.993 0 2.764 2.153 4.994 4.91 4.994 1.786 0 2.8-.72 3.458-1.382.534-.537.884-1.303 1.023-2.353H6.368v.001z" fill="white"/>
            </g>
            <defs>
              <clipPath id="clip0">
                <path fill="white" d="M0 0h41v17H0z"/>
              </clipPath>
            </defs>
          </svg>
          <span>Pay</span>
        `;

        // Handle button click
        button.addEventListener("click", async () => {
          if (isCapturing) return;

          try {
            setIsProcessingPayment({
              isModalOpen: true,
              paymentProcessingLoading: true,
              error: false,
              success: false,
            });

            // Step 1: Create PaymentDataRequest
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
              callbackIntents: ["PAYMENT_AUTHORIZATION"],
            };

            // Step 2: Show Google Pay payment sheet and get payment data
            console.log("Showing Google Pay payment sheet...");
            const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);
            console.log("Payment data received from Google Pay");

            // Step 3: Create PayPal order
            console.log("Creating PayPal order...");
            const createResponse = await fetch("/api/paypal/create-order", {
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

            const createData = await createResponse.json();

            if (!createResponse.ok || !createData.orderId) {
              throw new Error(createData.error || "Failed to create PayPal order");
            }

            console.log("PayPal order created:", createData.orderId);

            // Store transaction ID
            if (createData.transactionId) {
              sessionStorage.setItem(`paypal-txn-${checkoutId}`, createData.transactionId);
            }

            // Step 4: Confirm order with Google Pay payment data
            console.log("Confirming order with PayPal...");
            const confirmResult = await googlepay.confirmOrder({
              orderId: createData.orderId,
              paymentMethodData: paymentData.paymentMethodData,
            });

            console.log("Confirm result:", confirmResult);

            if (confirmResult.status !== "APPROVED" && confirmResult.status !== "COMPLETED") {
              throw new Error(`Payment was not approved. Status: ${confirmResult.status}`);
            }

            // Step 5: Complete the checkout by processing the transaction
            // For Google Pay, we need to call transactionProcess with the PayPal order ID
            setIsCapturing(true);
            console.log("Processing Google Pay payment...");

            const transactionId = createData.transactionId;

            if (!transactionId) {
              throw new Error("Transaction ID not found. Cannot process payment.");
            }

            // Call capture-order endpoint with retry logic
            // This will trigger Saleor's transactionProcess mutation
            let captureResult: { order?: { id: string; number: string; total: number }; error?: string; status?: string } | undefined;
            let captureResponse: Response | undefined;
            const maxRetries = 5;
            const retryDelay = 2000; // 2 seconds between retries

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              console.log(`Processing attempt ${attempt}/${maxRetries}...`);

              captureResponse = await fetch("/api/paypal/capture-order", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  checkoutId,
                  orderId: createData.orderId,
                  transactionId,
                }),
              });

              captureResult = await captureResponse.json();

              // If successful, break the retry loop
              if (captureResponse.ok && captureResult?.order?.id) {
                console.log("✅ Order created successfully!");
                break;
              }

              // If status is 202 (processing), wait and retry
              if (captureResponse.status === 202 || captureResult?.status === "processing") {
                console.log(`⏳ Payment processing, waiting for order creation... (${attempt}/${maxRetries})`);

                if (attempt < maxRetries) {
                  // Wait before next retry
                  await new Promise(resolve => setTimeout(resolve, retryDelay));
                  continue;
                } else {
                  // Max retries reached - payment is authorized but order creation is slow
                  console.warn("⚠️ Max retries reached. Payment authorized, redirecting to success page...");

                  // Redirect to checkout with success indicator
                  // The order should appear in their order history soon
                  window.location.href = `/checkout?checkoutId=${checkoutId}&payment=processing&orderId=${createData.orderId}`;

                  onSuccess();
                  return;
                }
              }

              // Other errors - don't retry
              throw new Error(captureResult?.error || "Failed to process payment");
            }

            // Step 6: Handle success
            const orderData = captureResult?.order;

            if (orderData?.id && orderData?.number) {
              console.log("✅ Google Pay payment successful!", orderData);

              setIsProcessingPayment({
                isModalOpen: false,
                paymentProcessingLoading: false,
                error: false,
                success: true,
              });

              // Redirect to order confirmation
              window.location.href = `/order-confirmation?orderId=${orderData.id}&orderNumber=${orderData.number}&total=${orderData.total}`;

              onSuccess();
            } else {
              throw new Error("Order data not found in response");
            }
          } catch (error) {
            setIsCapturing(false);
            setIsProcessingPayment({
              isModalOpen: false,
              paymentProcessingLoading: false,
              error: true,
              success: false,
            });

            console.error("Google Pay error:", error);

            if (error instanceof Error) {
              onError(`Google Pay payment failed: ${error.message}`);
            } else {
              onError("Google Pay payment failed");
            }
          }
        });

        containerRef.current?.appendChild(button);
        buttonRendered.current = true;
      } catch (error) {
        console.error("Failed to initialize Google Pay:", error);
        setIsReady(false);
      }
    };

    initializeGooglePay();
  }, [
    checkoutId,
    totalAmount,
    currency,
    environment,
    onSuccess,
    onError,
    setIsProcessingPayment,
    disabled,
  ]);

  if (!isReady && !buttonRendered.current) {
    return null; // Don't show anything if not ready
  }

  return (
    <div
      ref={containerRef}
      className={`min-h-[50px] ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    />
  );
}
