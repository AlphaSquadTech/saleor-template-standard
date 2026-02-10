"use client";

import { useEffect, useRef } from "react";
import { useAppConfiguration } from "../providers/ServerAppConfigurationProvider";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

interface GoogleAdSenseProps {
  adSlot?: string;
  adFormat?: string;
  fullWidthResponsive?: boolean;
  style?: React.CSSProperties;
  className?: string;
  autoAds?: boolean;
}

export default function GoogleAdSense({
  adSlot,
  adFormat = "auto",
  fullWidthResponsive = true,
  style = { display: "block" },
  className = "",
  autoAds = false,
}: GoogleAdSenseProps) {
  const adRef = useRef<HTMLModElement>(null);
  const isInitialized = useRef(false);
  const { getGoogleAdSenseConfig } = useAppConfiguration();
  const adSenseConfig = getGoogleAdSenseConfig();
  const adSenseClientId = adSenseConfig?.publisher_id;

  useEffect(() => {
    if (autoAds || isInitialized.current) return;

    try {
      if (typeof window !== "undefined" && adRef.current) {
        // Check if this specific ad element has already been processed
        if (!adRef.current.getAttribute('data-adsbygoogle-status')) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          isInitialized.current = true;
        }
      }
    } catch (error) {
      console.error("AdSense error:", error);
    }
  }, [autoAds]);

  // For Auto ads, just return a placeholder div
  if (autoAds) {
    return (
      <div 
        className={`adsense-auto ${className}`} 
        style={style}
        data-ad-client={adSenseClientId}
      />
    );
  }

  // For manual ad units
  return (
    <ins
      ref={adRef}
      className={`adsbygoogle ${className}`}
      style={style}
      data-ad-client={adSenseClientId}
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-full-width-responsive={fullWidthResponsive.toString()}
    />
  );
}