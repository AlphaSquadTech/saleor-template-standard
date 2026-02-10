'use client';

import { useAppConfiguration } from "../providers/ServerAppConfigurationProvider";

export default function ConditionalGTMNoscript() {
  const { getGoogleTagManagerConfig } = useAppConfiguration();
  
  const gtmConfig = getGoogleTagManagerConfig();
  
  if (!gtmConfig?.container_id) {
    return null;
  }

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmConfig.container_id}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      ></iframe>
    </noscript>
  );
}