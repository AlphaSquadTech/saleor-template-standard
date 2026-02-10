'use client';

import React, { createContext, useContext } from 'react';
import type { ClientSafeConfiguration } from '@/app/utils/serverConfigurationService';

interface ServerAppConfigurationContextType {
  // Feature flags
  isDealerLocatorEnabled: () => boolean;
  isTieredPricingEnabled: () => boolean;
  isWillCallEnabled: () => boolean;
  
  // Dealer locator configuration
  getDealerLocatorToken: () => string | null;
  
  // Google services configurations (only what's needed client-side)
  getGoogleRecaptchaSiteKey: () => string | null;
  getGoogleTagManagerContainerId: () => string | null;
  getGoogleMapsApiKey: () => string | null;
  getGoogleAnalyticsMeasurementId: () => string | null;
  getGoogleAdSensePublisherId: () => string | null;
  
  // reCAPTCHA location-based checks
  isRecaptchaEnabledFor: (location: 'login' | 'signup' | 'checkout') => boolean;
  
  // Legacy compatibility methods
  isAppActive: (appName: string) => boolean;
  getGoogleRecaptchaConfig: () => { site_key: string; locations?: { login?: boolean; signup?: boolean; checkout?: boolean } } | null;
  getGoogleTagManagerConfig: () => { container_id: string } | null;
  getGoogleMapsConfig: () => { api_key: string } | null;
  getGoogleAnalyticsConfig: () => { measurement_id: string } | null;
  getGoogleAdSenseConfig: () => { publisher_id: string } | null;
}

const ServerAppConfigurationContext = createContext<ServerAppConfigurationContextType | undefined>(undefined);

interface ServerAppConfigurationProviderProps {
  children: React.ReactNode;
  configuration: ClientSafeConfiguration;
}

export const ServerAppConfigurationProvider = ({ 
  children, 
  configuration 
}: ServerAppConfigurationProviderProps) => {
  const contextValue: ServerAppConfigurationContextType = {
    // Feature flags
    isDealerLocatorEnabled: () => configuration.features.dealer_locator,
    isTieredPricingEnabled: () => configuration.features.tiered_pricing,
    isWillCallEnabled: () => configuration.features.will_call,
    
    // Dealer locator
    getDealerLocatorToken: () => configuration.dealer_locator.token,
    
    // Google services
    getGoogleRecaptchaSiteKey: () => configuration.google.recaptcha_site_key,
    getGoogleTagManagerContainerId: () => configuration.google.tag_manager_container_id,
    getGoogleMapsApiKey: () => configuration.google.maps_api_key,
    getGoogleAnalyticsMeasurementId: () => configuration.google.analytics_measurement_id,
    getGoogleAdSensePublisherId: () => configuration.google.adsense_publisher_id,
    
    // reCAPTCHA location-based checks
    isRecaptchaEnabledFor: (location: 'login' | 'signup' | 'checkout') => {
      if (!configuration.google.recaptcha_site_key) return false;
      return configuration.google.recaptcha_locations[location] ?? false;
    },
    
    // Legacy compatibility methods
    isAppActive: (appName: string) => {
      switch (appName) {
        case 'dealer_locator':
          return configuration.features.dealer_locator;
        case 'tiered-pricing':
          return configuration.features.tiered_pricing;
        case 'will-call':
          return configuration.features.will_call;
        case 'google_recaptcha':
          return !!configuration.google.recaptcha_site_key;
        case 'google_tag_manager':
          return !!configuration.google.tag_manager_container_id;
        case 'google_maps':
          return !!configuration.google.maps_api_key;
        case 'google_analytics':
          return !!configuration.google.analytics_measurement_id;
        case 'google_adsense':
          return !!configuration.google.adsense_publisher_id;
        default:
          return false;
      }
    },
    
    getGoogleRecaptchaConfig: () => 
      configuration.google.recaptcha_site_key 
        ? { 
            site_key: configuration.google.recaptcha_site_key,
            locations: configuration.google.recaptcha_locations
          }
        : null,
        
    getGoogleTagManagerConfig: () => 
      configuration.google.tag_manager_container_id 
        ? { container_id: configuration.google.tag_manager_container_id }
        : null,
        
    getGoogleMapsConfig: () => 
      configuration.google.maps_api_key 
        ? { api_key: configuration.google.maps_api_key }
        : null,
        
    getGoogleAnalyticsConfig: () => 
      configuration.google.analytics_measurement_id 
        ? { measurement_id: configuration.google.analytics_measurement_id }
        : null,
        
    getGoogleAdSenseConfig: () => 
      configuration.google.adsense_publisher_id 
        ? { publisher_id: configuration.google.adsense_publisher_id }
        : null,
  };

  return (
    <ServerAppConfigurationContext.Provider value={contextValue}>
      {children}
    </ServerAppConfigurationContext.Provider>
  );
};

export const useAppConfiguration = () => {
  const context = useContext(ServerAppConfigurationContext);
  if (context === undefined) {
    throw new Error('useAppConfiguration must be used within a ServerAppConfigurationProvider');
  }
  return context;
};