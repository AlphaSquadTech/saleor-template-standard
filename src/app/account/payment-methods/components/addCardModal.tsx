"use client";

import { useEffect, useRef, useState } from "react";

interface AddCardModalProps {
  onClose: () => void;
  onSuccess: () => void;
  setRefetchPaymentMethods: (value: boolean) => void;
  refetchPaymentMethods: boolean;
  isModalOpen: boolean;
}

function buildIframeSrcdoc({
  paymentAppUrl,
  saleorApiUrl,
  authToken,
  paypalSdkUrl,
}: {
  paymentAppUrl: string;
  saleorApiUrl: string;
  authToken: string;
  paypalSdkUrl: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    ::-webkit-scrollbar { display: none; }
    body {
      font-family: system-ui, -apple-system, sans-serif; padding: 20px; background: #fff;
      overflow: hidden; scrollbar-width: none; -ms-overflow-style: none;
    }
    .loading {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 260px; text-align: center;
    }
    .spinner {
      width: 40px; height: 40px; margin: 0 auto 14px;
      border: 3px solid #f3e8eb; border-bottom-color: #b71234;
      border-radius: 50%; animation: spin 0.9s linear infinite;
      margin: 0 auto 14px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-text { color: #9ca3af; font-size: 13px; letter-spacing: 0.01em; }
    .form-section { display: none; }
    .form-section.visible { display: block; }
    .helper-text {
      font-size: 12px; color: #9ca3af; margin-bottom: 20px;
      display: flex; align-items: center; gap: 6px;
    }
    .helper-text svg { flex-shrink: 0; }
    .field-group { margin-bottom: 18px; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .field-label {
      display: block; font-size: 11px; font-weight: 600;
      color: #6b7280; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.06em;
    }
    .field-container {
      height: 44px; overflow: hidden;
    }
    .divider { border: none; border-top: 1px solid #f3f4f6; margin: 4px 0 20px; }
    .error-text {
      font-size: 13px; color: #b71234; margin-top: 10px;
      display: flex; align-items: center; gap: 6px;
    }
    .success-text {
      font-size: 13px; color: #16a34a; margin-top: 10px;
      display: flex; align-items: center; gap: 6px; background: #f0fdf4;
      border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px 12px;
    }
    .actions { display: flex; gap: 10px; margin-top: 24px; }
    .btn {
      flex: 1; height: 40px; padding: 0 16px; border: 1.5px solid #e5e7eb;
      border-radius: 0px; font-size: 14px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-weight: 600; transition: all 0.15s; letter-spacing: 0.01em;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-cancel { background: #fff; color: #374151; }
    .btn-cancel:hover:not(:disabled) { background: #f9fafb; border-color: #9ca3af; }
    .btn-save { background: #b71234; color: #fff; border-color: #b71234; }
    .btn-save:hover:not(:disabled) { background: #9b0f2c; border-color: #9b0f2c; }
    .btn-spinner {
      width: 18px; height: 18px; margin: 0 auto;
      border: 2px solid rgba(255,255,255,0.3); border-bottom-color: #fff;
      border-radius: 50%; animation: spin 0.9s linear infinite;
    }
  </style>
</head>
<body>
  <div id="loading-section" class="loading">
    <div class="spinner"></div>
    <p class="loading-text">Preparing secure card form...</p>
  </div>

  <div id="form-section" class="form-section">
    <p class="helper-text">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      Card details are handled securely by PayPal.
    </p>

    <div class="field-group">
      <label class="field-label">Card Number</label>
      <div id="card-number" class="field-container"></div>
    </div>

    <div class="field-row">
      <div class="field-group">
        <label class="field-label">Expiry Date</label>
        <div id="card-expiry" class="field-container"></div>
      </div>
      <div class="field-group">
        <label class="field-label">CVV</label>
        <div id="card-cvv" class="field-container"></div>
      </div>
    </div>

    <div id="error-msg" class="error-text" style="display:none;"></div>
    <div id="success-msg" class="success-text" style="display:none;"></div>

    <div class="actions">
      <button id="btn-cancel" class="btn btn-cancel" onclick="handleCancel()">Cancel</button>
      <button id="btn-save" class="btn btn-save" onclick="handleSubmit()">Save Card</button>
    </div>
  </div>

  <div id="error-section" style="display:none; text-align:center; padding:16px 0;">
    <p id="init-error" class="error-text"></p>
  </div>

  <script src="${paypalSdkUrl}"><\/script>
  <script>
  var PAYMENT_APP_URL = ${JSON.stringify(paymentAppUrl)};
  var SALEOR_API_URL = ${JSON.stringify(saleorApiUrl)};
  var AUTH_TOKEN = ${JSON.stringify(authToken)};

  var vaultSession = null;
  var setupTokenId = null;
  var isSubmitting = false;

  function postHeight() {
    window.parent.postMessage(
      { type: "CARD_FORM_HEIGHT", height: document.body.scrollHeight },
      "*"
    );
  }
  new ResizeObserver(postHeight).observe(document.body);

  function trpcHeaders() {
    return {
      "content-type": "application/json",
      "authorization-bearer": AUTH_TOKEN,
      "saleor-api-url": SALEOR_API_URL
    };
  }

  function extractResult(data) {
    if (data.error) {
      var errMsg = (data.error.json && data.error.json.message) || data.error.message || "API error";
      throw new Error(errMsg);
    }
    return data.result && data.result.data || data;
  }

  async function trpcQuery(procedure, input) {
    var encodedInput = encodeURIComponent(JSON.stringify(input || {}));
    var url = PAYMENT_APP_URL + "/api/trpc/" + procedure + "?input=" + encodedInput;

    console.log("[Vault iframe] trpcQuery:", procedure);

    var res = await fetch(url, { headers: trpcHeaders() });
    if (!res.ok) throw new Error("API request failed: " + res.status);
    var data = await res.json();
    console.log("[Vault iframe] trpcQuery response:", JSON.stringify(data));
    return extractResult(data);
  }

  async function trpcMutate(procedure, input) {
    var url = PAYMENT_APP_URL + "/api/trpc/" + procedure;
    var reqBody = JSON.stringify(input || {});

    console.log("[Vault iframe] trpcMutate:", procedure, "body:", reqBody);

    var res = await fetch(url, {
      method: "POST",
      headers: trpcHeaders(),
      body: reqBody
    });

    if (!res.ok) {
      var errorText = await res.text();
      console.error("[Vault iframe] HTTP error:", res.status, errorText);
      throw new Error("API request failed: " + res.status);
    }

    var data = await res.json();
    console.log("[Vault iframe] trpcMutate response:", JSON.stringify(data));
    return extractResult(data);
  }

  function showError(msg) {
    var el = document.getElementById("error-msg");
    el.textContent = msg;
    el.style.display = "block";
    document.getElementById("success-msg").style.display = "none";
    postHeight();
  }

  function showSuccess(msg) {
    var el = document.getElementById("success-msg");
    el.textContent = msg;
    el.style.display = "block";
    document.getElementById("error-msg").style.display = "none";
    postHeight();
  }

  function showInitError(msg) {
    document.getElementById("loading-section").style.display = "none";
    document.getElementById("init-error").textContent = msg;
    document.getElementById("error-section").style.display = "block";
    postHeight();
  }

  function setSubmitting(val) {
    isSubmitting = val;
    var btnSave = document.getElementById("btn-save");
    var btnCancel = document.getElementById("btn-cancel");
    btnSave.disabled = val;
    btnCancel.disabled = val;
    btnSave.innerHTML = val ? '<div class="btn-spinner"><\/div>' : "Save Card";
  }

  function handleCancel() {
    window.parent.postMessage({ type: "CARD_CLOSE" }, "*");
  }

  async function handleSubmit() {
    if (!vaultSession || !setupTokenId || isSubmitting) {
      console.error("[Vault iframe] Cannot submit - vaultSession:", !!vaultSession, "setupTokenId:", setupTokenId);
      return;
    }

    setSubmitting(true);
    document.getElementById("error-msg").style.display = "none";
    console.log("[Vault iframe] Submitting with setupTokenId:", setupTokenId);

    try {
      var result = await vaultSession.submit(setupTokenId);
      console.log("[Vault iframe] SDK submit result:", JSON.stringify(result));

      if (result.state === "succeeded") {
        console.log("[Vault iframe] Creating payment token with setupTokenId:", setupTokenId);
        
        var paymentResult = await trpcMutate(
          "customerVault.createPaymentTokenFromSetupToken",
          { setupTokenId: setupTokenId }
        );

        console.log("[Vault iframe] Payment token created:", JSON.stringify(paymentResult));
        var cardInfo = paymentResult.card
          ? paymentResult.card.brand + " ending in " + paymentResult.card.lastDigits
          : "Card";
        showSuccess(cardInfo + " saved to your wallet.");
        setTimeout(function() {
          window.parent.postMessage({ type: "CARD_SAVED" }, "*");
        }, 2000);
      } else if (result.state === "canceled") {
        showError("Card save was canceled.");
      } else if (result.state === "failed") {
        showError("Card validation failed: " + ((result.data && result.data.message) || "Unknown error"));
      } else {
        showError("Unexpected result: " + result.state);
      }
    } catch (err) {
      console.error("[Vault iframe] Submit error:", err);
      showError(err.message || "Card submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  (async function init() {
    try {
      console.log("[Vault iframe] Initializing...");
      
      var tokenData = await trpcQuery("customerVault.generateClientToken", {});
      var clientToken = tokenData.clientToken;
      console.log("[Vault iframe] Client token received");

      if (!window.paypal || !window.paypal.createInstance) {
        throw new Error("PayPal SDK v6 not loaded");
      }
      
      var sdk = await window.paypal.createInstance({
        clientToken: clientToken,
        components: ["card-fields"]
      });
      console.log("[Vault iframe] SDK instance created");

      vaultSession = sdk.createCardFieldsSavePaymentSession();
      var numberField = vaultSession.createCardFieldsComponent({ type: "number" });
      var expiryField = vaultSession.createCardFieldsComponent({ type: "expiry" });
      var cvvField = vaultSession.createCardFieldsComponent({ type: "cvv" });
      console.log("[Vault iframe] Card fields created");

      var setupResult = await trpcMutate("customerVault.createSetupToken", {
        paymentMethodType: "card",
        verificationMethod: "SCA_WHEN_REQUIRED",
        returnUrl: window.location.href,
        cancelUrl: window.location.href
      });

      setupTokenId = setupResult.setupTokenId;
      console.log("[Vault iframe] Setup token created:", setupTokenId);

      document.getElementById("loading-section").style.display = "none";
      document.getElementById("form-section").classList.add("visible");

      document.getElementById("card-number").appendChild(numberField);
      document.getElementById("card-expiry").appendChild(expiryField);
      document.getElementById("card-cvv").appendChild(cvvField);
      console.log("[Vault iframe] Card fields mounted");

      postHeight();
      window.parent.postMessage({ type: "CARD_FORM_READY" }, "*");
    } catch (err) {
      console.error("[Vault iframe] Init error:", err);
      showInitError(err.message || "Failed to initialize");
    }
  })();
  <\/script>
</body>
</html>`;
}

export default function AddCardModal({
  onClose,
  onSuccess,
  setRefetchPaymentMethods,
  refetchPaymentMethods,
  isModalOpen,
}: AddCardModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(300);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Create blob URL when modal opens, revoke when it closes
  useEffect(() => {
    if (!isModalOpen) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      setIframeHeight(200);
      return;
    }

    const paymentAppUrl = process.env.NEXT_PUBLIC_PAYPAL_APP_URL || "";
    const saleorApiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const authToken = localStorage.getItem("token") || "";
    const paypalSdkUrl =
      process.env.NEXT_PUBLIC_PAYPAL_ENV === "production"
        ? "https://www.paypal.com/web-sdk/v6/core"
        : "https://www.sandbox.paypal.com/web-sdk/v6/core";

    if (!paypalSdkUrl) {
      console.error("PayPal SDK URL is not configured");
      return;
    }
    const html = buildIframeSrcdoc({
      paymentAppUrl,
      saleorApiUrl,
      authToken,
      paypalSdkUrl,
    });
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [isModalOpen]);

  // Listen for postMessage events from the iframe
  useEffect(() => {
    if (!isModalOpen) return;

    const handler = (e: MessageEvent) => {
      switch (e.data?.type) {
        case "CARD_FORM_HEIGHT":
          setIframeHeight(e.data.height);
          break;
        case "CARD_SAVED":
          setRefetchPaymentMethods(true);
          onSuccess();
          break;
        case "CARD_CLOSE":
          onClose();
          break;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isModalOpen, onClose, onSuccess, setRefetchPaymentMethods]);

  if (!isModalOpen || !blobUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-2xl min-h-[390px] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900 tracking-tight">
              Add New Card
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Your card will be saved for future purchases
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Iframe */}
        <iframe
          ref={iframeRef}
          src={blobUrl}
          style={{
            width: "100%",
            height: iframeHeight,
            border: "none",
            display: "block",
          }}
          title="Add Card Form"
        />
      </div>
    </div>
  );
}
