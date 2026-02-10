'use client';

/**
 * DEPRECATED: This provider is no longer used.
 * Use ServerAppConfigurationProvider instead, which handles configuration server-side
 * to prevent exposing sensitive configuration data to the client.
 * 
 * This file is kept for backward compatibility but should not be used in new code.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  AppConfigurationResponse, 
  appConfigService,
  GoogleRecaptchaConfig,
  GoogleTagManagerConfig,
  GoogleMapsConfig,
  GoogleAnalyticsConfig,
  GoogleAdSenseConfig
} from '@/app/utils/appConfiguration';

interface AppConfigurationContextType {
  configuration: AppConfigurationResponse | null;
  loading: boolean;
  error: string | null;
  isAppActive: (appName: string) => boolean;
  isDealerLocatorEnabled: () => boolean;
  getGoogleRecaptchaConfig: () => GoogleRecaptchaConfig | null;
  getGoogleTagManagerConfig: () => GoogleTagManagerConfig | null;
  getGoogleMapsConfig: () => GoogleMapsConfig | null;
  getGoogleAnalyticsConfig: () => GoogleAnalyticsConfig | null;
  getGoogleAdSenseConfig: () => GoogleAdSenseConfig | null;
}

const AppConfigurationContext = createContext<AppConfigurationContextType | undefined>(undefined);

interface AppConfigurationProviderProps {
  children: React.ReactNode;
}

export const AppConfigurationProvider = ({ children }: AppConfigurationProviderProps) => {
  const [configuration, setConfiguration] = useState<AppConfigurationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadConfiguration = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const config = await appConfigService.fetchConfiguration();
        
        if (isMounted) {
          setConfiguration(config);
          
          const lastError = appConfigService.getLastError();
          if (lastError) {
            setError(lastError);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load configuration');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadConfiguration();

    return () => {
      isMounted = false;
    };
  }, []);

  const contextValue: AppConfigurationContextType = {
    configuration,
    loading,
    error,
    isAppActive: (appName: string) => appConfigService.isAppActive(appName),
    isDealerLocatorEnabled: () => appConfigService.isDealerLocatorEnabled(),
    getGoogleRecaptchaConfig: () => appConfigService.getGoogleRecaptchaConfig(),
    getGoogleTagManagerConfig: () => appConfigService.getGoogleTagManagerConfig(),
    getGoogleMapsConfig: () => appConfigService.getGoogleMapsConfig(),
    getGoogleAnalyticsConfig: () => appConfigService.getGoogleAnalyticsConfig(),
    getGoogleAdSenseConfig: () => appConfigService.getGoogleAdSenseConfig(),
  };

  return (
    <AppConfigurationContext.Provider value={contextValue}>
      {children}
    </AppConfigurationContext.Provider>
  );
};

export const useAppConfiguration = () => {
  const context = useContext(AppConfigurationContext);
  if (context === undefined) {
    throw new Error('useAppConfiguration must be used within an AppConfigurationProvider');
  }
  return context;
};