"use client";

import { useEffect } from "react";
import { useAppConfiguration } from "../providers/ServerAppConfigurationProvider";

export default function AnalyticsScripts() {
  const { getGoogleTagManagerConfig, getGoogleAdSenseConfig } = useAppConfiguration();
  
  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    const gtmConfig = getGoogleTagManagerConfig();
    const adSenseConfig = getGoogleAdSenseConfig();

    const GTM_ID = gtmConfig?.container_id;
    const ADSENSE_CLIENT_ID = adSenseConfig?.publisher_id;

    // Load Authorize.Net Accept.js for payment tokenization FIRST
    // This loads synchronously (without async) to ensure it's available immediately
    // when users click on the credit/debit card payment option
    const acceptJsUrl = 'https://jstest.authorize.net/v1/Accept.js';

    // Check if Accept.js is already loaded
    if (!document.querySelector(`script[src="${acceptJsUrl}"]`)) {
      const acceptScript = document.createElement("script");
      acceptScript.src = acceptJsUrl;
      // Removed async to load synchronously for faster availability
      document.head.appendChild(acceptScript);
    }

    // Load Google Tag Manager
    if (GTM_ID) {
      // Initialize dataLayer
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        "gtm.start": new Date().getTime(),
        event: "gtm.js",
      });

      // Load GTM script
      const gtmScript = document.createElement("script");
      gtmScript.async = true;
      gtmScript.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
      document.head.appendChild(gtmScript);
    }

    // Load Google AdSense
    if (ADSENSE_CLIENT_ID) {
      const adSenseScript = document.createElement("script");
      adSenseScript.async = true;
      adSenseScript.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
      adSenseScript.crossOrigin = "anonymous";
      document.head.appendChild(adSenseScript);
    }

  }, [getGoogleTagManagerConfig, getGoogleAdSenseConfig]);

  return null;
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

declare global {
  interface Window {
    Accept: {
      dispatchData: (secureData: Record<string, unknown>, callback: (response: AuthorizeNetResponse) => void) => void;
    };
  }
}