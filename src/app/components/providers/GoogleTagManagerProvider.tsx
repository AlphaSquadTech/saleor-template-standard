"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gtmPageView } from "@/app/utils/googleTagManager";
import { useGTMEngagement } from "@/app/hooks/useGTMEngagement";
import { useAppConfiguration } from "./ServerAppConfigurationProvider";

interface GoogleTagManagerProviderProps {
  children: React.ReactNode;
}

export default function GoogleTagManagerProvider({ children }: GoogleTagManagerProviderProps) {
  const pathname = usePathname();
  const { isAppActive, getGoogleTagManagerConfig } = useAppConfiguration();
  
  const isGTMEnabled = isAppActive('google_tag_manager');
  const gtmConfig = getGoogleTagManagerConfig();
  
  // Track user engagement (scroll depth, time on page) - only if GTM is enabled
  useGTMEngagement(isGTMEnabled ? gtmConfig?.container_id : null);

  useEffect(() => {
    if (!isGTMEnabled || !gtmConfig?.container_id) return;
    if (typeof window !== "undefined") {
      gtmPageView(window.location.href, undefined, gtmConfig.container_id);
    }
  }, [pathname, isGTMEnabled, gtmConfig]);

  return <>{children}</>;
}