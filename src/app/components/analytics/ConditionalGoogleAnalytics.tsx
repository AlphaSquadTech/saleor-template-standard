'use client';

import { GoogleAnalytics } from "@next/third-parties/google";
import { useAppConfiguration } from "../providers/ServerAppConfigurationProvider";

export default function ConditionalGoogleAnalytics() {
  const { getGoogleAnalyticsConfig } = useAppConfiguration();
  
  const analyticsConfig = getGoogleAnalyticsConfig();
  
  if (!analyticsConfig?.measurement_id) {
    return null;
  }

  return <GoogleAnalytics gaId={analyticsConfig.measurement_id} />;
}