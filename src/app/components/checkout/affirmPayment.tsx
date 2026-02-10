"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentProcessingState } from "@/graphql/types/checkout";
import LoadingUI from "../reuseableUI/loadingUI";

interface AffirmPaymentProps {
  checkoutId: string;
  totalAmount: number;
  currency?: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  setIsProcessingPayment: (state: PaymentProcessingState) => void;
  userEmail?: string;
  guestEmail?: string;
  termsAccepted?: boolean;
  termsData?: { page?: { isPublished: boolean } | null };
  onTermsModalOpen?: () => void;
  onTermsAcceptedChange?: (accepted: boolean) => void;
  questionsValid?: boolean;
}

declare global {
  interface Window {
    _affirm_config: {
      public_api_key: string;
      script: string;
      locale: string;
      country_code: string;
    };
    affirm: {
      ui: {
        ready: (callback: () => void) => void;
      };
      checkout: {
        open: (config: { checkout_token: string }) => void;
        success: (callback: (checkoutToken: string) => void) => void;
        cancel: (callback: () => void) => void;
      };
    };
  }
}

export function AffirmPayment({
  checkoutId,
  totalAmount,
  currency = "USD",
  onSuccess,
  onError,
  setIsProcessingPayment,
  userEmail,
  guestEmail,
  termsAccepted = true,
  termsData,
  onTermsModalOpen,
  onTermsAcceptedChange,
  questionsValid = true,
}: AffirmPaymentProps) {
  const router = useRouter();
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [affirmConfig, setAffirmConfig] = useState<{
    publicApiKey: string;
    environment: string;
    scriptUrl: string;
  } | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const configFetched = useRef(false);

  // Fetch Affirm configuration
  useEffect(() => {
    if (configFetched.current) return;

    const fetchAffirmConfig = async () => {
      try {
        setIsLoadingConfig(true);

        const response = await fetch("/api/affirm/get-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkoutId, amount: totalAmount }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch Affirm configuration (HTTP ${response.status})`);
        }

        const result = await response.json();

        if (!result.publicApiKey) {
          throw new Error("Affirm public API key not configured in the payment app");
        }

        setAffirmConfig({
          publicApiKey: result.publicApiKey,
          environment: result.environment,
          scriptUrl: result.scriptUrl,
        });

        configFetched.current = true;
      } catch (error) {
        setSdkError(error instanceof Error ? error.message : "Failed to load Affirm configuration");
      } finally {
        setIsLoadingConfig(false);
      }
    };

    fetchAffirmConfig();
  }, [checkoutId, totalAmount]);

  // Load Affirm SDK
  useEffect(() => {
    if (!affirmConfig || isLoadingConfig) return;

    if (window.affirm) {
      setSdkLoaded(true);
      return;
    }
    
    const scriptUrl = affirmConfig.environment === "production" 
      ? "https://cdn1.affirm.com/js/v2/affirm.js"
      : "https://cdn1-sandbox.affirm.com/js/v2/affirm.js";
    
    window._affirm_config = {
      public_api_key: affirmConfig.publicApiKey,
      script: scriptUrl,
      locale: "en_US",
      country_code: "USA",
    };

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;

    script.onload = () => {
      console.log("✅ Affirm SDK loaded successfully");
      console.log("🔍 Window.affirm available:", !!window.affirm);
      setSdkLoaded(true);
    };

    script.onerror = () => {
      console.error("❌ Failed to load Affirm SDK from:", affirmConfig.scriptUrl);
      setSdkError("Failed to load Affirm payment system. Please check the configuration.");
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [affirmConfig, isLoadingConfig]);

  const handleAffirmPayment = async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      setIsProcessingPayment({
        isModalOpen: true,
        paymentProcessingLoading: true,
        error: false,
        success: false,
      });

      // Create Affirm checkout
      console.log("🚀 Starting Affirm checkout creation...");
      console.log("📊 Checkout details:", { checkoutId, totalAmount, currency });
      
      const response = await fetch("/api/affirm/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutId,
          amount: totalAmount,
          currency,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.checkoutToken) {
        console.error("❌ Affirm checkout creation failed:", data);
        throw new Error(data.error || "Failed to create Affirm checkout");
      }

      // Store transaction ID for later use
      if (data.transactionId) {
        sessionStorage.setItem(`affirm-txn-${checkoutId}`, data.transactionId);
      }

      // Use redirect approach instead of modal
      const redirectUrl = data.checkoutUrl;
      
      if (!redirectUrl) {
        console.error("❌ No redirect URL received from Affirm");
        throw new Error("No redirect URL received from Affirm");
      }

      // Open Affirm checkout in new window
      const affirmWindow = window.open(
        redirectUrl,
        'affirm-checkout',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!affirmWindow) {
        throw new Error("Failed to open Affirm checkout window. Please allow popups.");
      }

      // Monitor the window for completion and poll for payment success
      const checkClosed = setInterval(() => {
        if (affirmWindow.closed) {
          clearInterval(checkClosed);
          setIsProcessing(false);
          
          // Show error when popup is closed without completion
          setIsProcessingPayment({
            isModalOpen: false,
            paymentProcessingLoading: false,
            error: true,
            success: false,
          });
          
          onError("Your payment was not processed.");
        }
      }, 1000);

      // Listen for success message from popup instead of polling
      const handleMessage = (event: MessageEvent) => {
        console.log("📨 Received message:", event.data);
        
        if (event.data.type === 'AFFIRM_SUCCESS' && event.data.order) {
          console.log("✅ Received success message from Affirm popup");
          
          // Clean up
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          
          // Close popup if still open
          if (!affirmWindow.closed) {
            affirmWindow.close();
          }
          
          setIsProcessing(false);
          setIsProcessingPayment({
            isModalOpen: false,
            paymentProcessingLoading: false,
            error: false,
            success: true,
          });

          // Redirect to order confirmation
          router.push(
            `/order-confirmation?orderId=${event.data.order.id}&orderNumber=${event.data.order.number}&total=${event.data.order.total}`
          );

          onSuccess();
        }
      };

      // Add message listener
      console.log("🎧 Adding message listener for Affirm popup");
      window.addEventListener('message', handleMessage);

    } catch (error) {
      setIsProcessing(false);
      setIsProcessingPayment({
        isModalOpen: false,
        paymentProcessingLoading: false,
        error: true,
        success: false,
      });
      onError(error instanceof Error ? `Failed to create Affirm checkout: ${error.message}` : "Failed to create Affirm checkout");
    }
  };

  if (sdkError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-700 text-sm">{sdkError}</p>
        <p className="text-red-600 text-xs mt-2">Please refresh the page or contact support.</p>
      </div>
    );
  }

  if (isLoadingConfig || !affirmConfig || !sdkLoaded) {
    return (
      <div className="space-y-4">
        <LoadingUI className="h-32" />
        <p className="text-center text-sm text-[var(--color-secondary-600)]">
          {isLoadingConfig ? "Loading Affirm configuration..." : "Loading Affirm payment system..."}
        </p>
      </div>
    );
  }

  const hasEmail = userEmail || guestEmail;
  const needsTermsAcceptance = termsData?.page?.isPublished && !termsAccepted;
  const isDisabled = !questionsValid || needsTermsAcceptance || !hasEmail || isProcessing;

  return (
    <div className="space-y-6">
      {isProcessing && (
        <div className="space-y-4">
          <LoadingUI className="h-32" />
          <p className="text-center text-sm text-[var(--color-secondary-600)]">Processing payment...</p>
        </div>
      )}

      <div className={isProcessing ? "hidden" : ""}>
        {!hasEmail && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <p className="text-yellow-700 text-sm">Please provide an email address to continue with payment.</p>
          </div>
        )}

        {!questionsValid && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <p className="text-yellow-700 text-sm">Please complete all required questions below.</p>
          </div>
        )}

        <div className={`transition-opacity mb-4 ${isDisabled ? "opacity-50 pointer-events-none" : ""}`}>
          <button
            onClick={handleAffirmPayment}
            disabled={isDisabled}
            className="w-full bg-[#4a4af4] hover:bg-[#4646EB] text-white font-medium py-3 px-4 rounded-md transition-colors flex items-center justify-center"
          >
            <svg width="296" height="25" viewBox="0 8 296 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M44.667 30.939C44.667 26.615 47.473 23.648 51.245 23.648C54.58 23.648 56.627 25.603 57.156 28.432H54.235C53.752 27.144 52.878 26.27 51.245 26.27C48.991 26.27 47.657 28.248 47.657 30.939C47.657 33.607 48.991 35.608 51.245 35.608C52.878 35.608 53.752 34.734 54.235 33.423H57.156C56.627 36.275 54.58 38.23 51.245 38.23C47.473 38.23 44.667 35.263 44.667 30.939ZM59.0106 38V23.05H61.8626V28.662C62.4146 28.018 63.4266 27.489 64.6226 27.489C66.9456 27.489 68.2566 29.007 68.2566 31.284V38H65.4046V31.882C65.4046 30.801 64.8526 30.065 63.7256 30.065C62.8516 30.065 62.0926 30.594 61.8626 31.491V38H59.0106ZM76.8789 34.642H79.5239C79.1559 36.827 77.5459 38.23 74.9699 38.23C71.9799 38.23 69.9789 36.045 69.9789 32.871C69.9789 29.766 72.0489 27.489 74.9239 27.489C77.9369 27.489 79.5929 29.582 79.5929 32.595V33.469H72.7389C72.8309 35.01 73.7049 35.93 74.9699 35.93C75.9359 35.93 76.6489 35.516 76.8789 34.642ZM74.9469 29.812C73.8429 29.812 73.0609 30.479 72.8079 31.744H76.7869C76.7639 30.663 76.1199 29.812 74.9469 29.812ZM80.85 32.871C80.85 29.674 82.874 27.489 85.795 27.489C88.371 27.489 90.004 29.007 90.303 31.192H87.497C87.336 30.41 86.715 29.927 85.795 29.927C84.484 29.927 83.679 31.123 83.679 32.871C83.679 34.596 84.484 35.792 85.795 35.792C86.715 35.792 87.336 35.309 87.497 34.527H90.303C90.004 36.735 88.371 38.23 85.795 38.23C82.874 38.23 80.85 36.045 80.85 32.871ZM98.7436 38L95.7306 33.86L94.9026 34.757V38H92.0506V23.05H94.9026V31.537L98.4216 27.719H101.964L97.8006 32.089L102.125 38H98.7436ZM117.832 32.871C117.832 36.022 115.785 38.23 112.795 38.23C109.805 38.23 107.758 36.022 107.758 32.871C107.758 29.697 109.805 27.489 112.795 27.489C115.785 27.489 117.832 29.697 117.832 32.871ZM115.003 32.871C115.003 31.146 114.221 29.904 112.795 29.904C111.369 29.904 110.587 31.146 110.587 32.871C110.587 34.573 111.369 35.815 112.795 35.815C114.221 35.815 115.003 34.573 115.003 32.871ZM128.763 27.719V38H125.911V37.057C125.336 37.701 124.347 38.23 123.151 38.23C120.851 38.23 119.54 36.712 119.54 34.435V27.719H122.392V33.86C122.392 34.941 122.921 35.677 124.048 35.677C124.922 35.677 125.681 35.148 125.888 34.251V27.719H128.763ZM131.843 34.895V30.019H130.279V27.719H131.843V24.936H134.672V27.719H136.926V30.019H134.672V34.527C134.672 35.332 135.109 35.7 135.845 35.7C136.282 35.7 136.765 35.562 137.087 35.355V37.885C136.696 38.092 136.006 38.207 135.247 38.207C133.154 38.207 131.843 37.172 131.843 34.895ZM151.638 27.719L153.34 34.274L155.18 27.719H157.94L154.812 38H152.19L150.511 31.698L148.832 38H146.21L143.082 27.719H145.934L147.774 34.274L149.453 27.719H151.638ZM162.33 27.719V38H159.478V27.719H162.33ZM162.583 24.752C162.583 25.718 161.801 26.385 160.904 26.385C159.984 26.385 159.202 25.718 159.202 24.752C159.202 23.809 159.984 23.119 160.904 23.119C161.801 23.119 162.583 23.809 162.583 24.752ZM165.445 34.895V30.019H163.881V27.719H165.445V24.936H168.274V27.719H170.528V30.019H168.274V34.527C168.274 35.332 168.711 35.7 169.447 35.7C169.884 35.7 170.367 35.562 170.689 35.355V37.885C170.298 38.092 169.608 38.207 168.849 38.207C166.756 38.207 165.445 37.172 165.445 34.895ZM172.753 38V23.05H175.605V28.662C176.157 28.018 177.169 27.489 178.365 27.489C180.688 27.489 181.999 29.007 181.999 31.284V38H179.147V31.882C179.147 30.801 178.595 30.065 177.468 30.065C176.594 30.065 175.835 30.594 175.605 31.491V38H172.753Z" fill="white"/>
              <g clipPath="url(#clip0_2539_4435)">
              <path fillRule="evenodd" clipRule="evenodd" d="M193.13 36.0613C192.351 36.0613 191.954 35.687 191.954 35.0719C191.954 33.9248 193.266 33.5391 195.657 33.291C195.657 34.8195 194.598 36.0613 193.123 36.0613H193.13ZM194.159 27.4652C192.45 27.4652 190.484 28.2495 189.417 29.0798L190.392 31.0872C191.247 30.3229 192.631 29.6691 193.879 29.6691C195.065 29.6691 195.721 30.0562 195.721 30.8362C195.721 31.3596 195.287 31.6249 194.467 31.7295C191.4 32.1167 188.997 32.9426 188.997 35.2468C188.997 37.0736 190.33 38.1791 192.413 38.1791C193.901 38.1791 195.224 37.3733 195.853 36.3151V37.8923H198.626V31.2836C198.626 28.5593 196.687 27.4595 194.161 27.4595L194.159 27.4652Z" fill="white"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M221.987 27.7615V37.8789H224.953V33.0037C224.953 30.688 226.391 30.0069 227.392 30.0069C227.843 30.0035 228.285 30.1308 228.661 30.3726L229.203 27.6984C228.783 27.5343 228.333 27.4548 227.88 27.4647C226.356 27.4647 225.397 28.1228 224.765 29.4621V27.7615H221.987Z" fill="white"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M242.952 27.4648C241.383 27.4648 240.21 28.3682 239.6 29.24C239.034 28.1144 237.836 27.4648 236.395 27.4648C234.828 27.4648 233.742 28.3137 233.241 29.2916V27.7617H230.38V37.8791H233.349V32.6698C233.349 30.8058 234.353 29.9039 235.29 29.9039C236.138 29.9039 236.917 30.4387 236.917 31.8195V37.8791H239.881V32.6698C239.881 30.7785 240.86 29.9039 241.841 29.9039C242.626 29.9039 243.458 30.4602 243.458 31.7994V37.8791H246.421V30.8846C246.421 28.6119 244.853 27.4648 242.958 27.4648" fill="white"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M214.768 27.7614H212.08V26.7333C212.08 25.394 212.864 25.0126 213.539 25.0126C213.999 25.0185 214.452 25.129 214.862 25.3353L215.776 23.2949C215.776 23.2949 214.848 22.7041 213.162 22.7041C211.267 22.7041 209.111 23.7465 209.111 27.0172V27.7614H204.62V26.7333C204.62 25.394 205.402 25.0126 206.078 25.0126C206.539 25.0126 206.994 25.1234 207.401 25.3353L208.315 23.2949C207.77 22.9837 206.892 22.7041 205.703 22.7041C203.808 22.7041 201.652 23.7465 201.652 27.0172V27.7614H199.935V29.9925H201.656V37.8788H204.62V29.9925H209.117V37.8788H212.08V29.9925H214.768V27.7614Z" fill="white"/>
              <path d="M219.498 27.7622H216.538V37.8753H219.498V27.7622Z" fill="white"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M216.646 26.042H219.547C221.239 20.8529 226.98 16.2917 233.807 16.2917C242.11 16.2917 249.285 22.4574 249.285 32.0557C249.31 34.0259 249.033 35.9887 248.462 37.8787H251.277L251.305 37.784C251.779 35.913 252.013 33.9917 252.002 32.0643C252.002 21.3605 244.005 13.6562 233.813 13.6562C225.807 13.6562 218.671 19.0763 216.648 26.0449L216.646 26.042Z" fill="white"/>
              </g>
              <defs>
              </defs>
            </svg>
          </button>
        </div>

        {needsTermsAcceptance && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <p className="text-yellow-700 text-sm">Please accept the Terms and Conditions to continue.</p>
          </div>
        )}

        {termsData?.page?.isPublished && (
          <div className="flex items-start gap-2 w-full py-2 mb-4">
            <input
              style={{ accentColor: "var(--color-primary-600)" }}
              type="checkbox"
              id="termsAcceptedAffirm"
              className="w-5 h-5 cursor-pointer mt-0.5"
              checked={termsAccepted}
              onChange={(e) => onTermsAcceptedChange?.(e.target.checked)}
            />
            <label
              htmlFor="termsAcceptedAffirm"
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
