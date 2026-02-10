import { AppConfigurationResponse } from './appConfiguration';
import { fetchConfigurationDirect } from './configurationService';
import { cache } from 'react';

/**
 * Cached server-side configuration fetcher
 * This will only run once per server request/render cycle
 */
export const getServerConfiguration = cache(async (): Promise<AppConfigurationResponse> => {
  try {
    const configuration = await fetchConfigurationDirect();
    return configuration;
  } catch (error) {
    console.error('Server-side configuration fetch failed:', error);
    
    // Return minimal fallback configuration
    return {
      internal: [
        { app_name: 'tiered_pricing', is_active: false }
      ],
      external: [
        {
          app_name: 'dealer_locator',
          configurations: { token: '' },
          is_active: false
        },
        {
          app_name: 'google_recaptcha',
          configurations: { 
            site_key: '',
            locations: {
              login: false,
              signup: false,
              checkout: false
            }
          },
          is_active: false
        },
        {
          app_name: 'google_tag_manager',
          configurations: { container_id: '' },
          is_active: false
        },
        {
          app_name: 'google_maps',
          configurations: { api_key: '' },
          is_active: false
        },
        {
          app_name: 'google_analytics',
          configurations: { measurement_id: '' },
          is_active: false
        },
        {
          app_name: 'google_adsense',
          configurations: { publisher_id: '' },
          is_active: false
        }
      ]
    };
  }
});

/**
 * Server-side helper functions that extract only necessary client-side data
 * This ensures we only send minimal, non-sensitive data to the client
 */

export interface ClientSafeConfiguration {
  features: {
    dealer_locator: boolean;
    tiered_pricing: boolean;
    will_call: boolean;
  };
  dealer_locator: {
    token: string | null;
  };
  google: {
    recaptcha_site_key: string | null;
    recaptcha_locations: {
      login: boolean;
      signup: boolean;
      checkout: boolean;
    };
    tag_manager_container_id: string | null;
    maps_api_key: string | null;
    analytics_measurement_id: string | null;
    adsense_publisher_id: string | null;
    search_console_verification_content: string | null;
  };
}

/**
 * Extracts only client-safe configuration data
 * This removes sensitive server-side configuration and only includes what the client needs
 */
export async function getClientSafeConfiguration(): Promise<ClientSafeConfiguration> {
  const config = await getServerConfiguration();
  // Helper function to find app configuration
  const findInternalApp = (appName: string) => 
    config.internal?.find(app => app.app_name === appName);
    
  const findExternalApp = (appName: string) => 
    config.external?.find(app => app.app_name === appName);

  // Extract only client-safe configuration
  const clientConfig: ClientSafeConfiguration = {
    features: {
      dealer_locator: findExternalApp('dealer_locator')?.is_active ?? false,
      tiered_pricing: findInternalApp('tiered_pricing')?.is_active ?? false,
      will_call: findExternalApp('will-call')?.is_active ?? false,
    },
    dealer_locator: {
      token: (() => {
        const app = findExternalApp('dealer_locator');
        if (app?.is_active && app.configurations) {
          return (app.configurations as import('./appConfiguration').DealerLocatorConfig).token || null;
        }
        return null;
      })(),
    },
    google: {
      recaptcha_site_key: (() => {
        const app = findExternalApp('google_recaptcha');
        if (app?.is_active && app.configurations) {
          return (app.configurations as { site_key: string }).site_key || null;
        }
        return null;
      })(),
      recaptcha_locations: (() => {
        const app = findExternalApp('google_recaptcha');
        if (app?.is_active && app.configurations) {
          const config = app.configurations as { locations?: { login?: boolean; signup?: boolean; checkout?: boolean } };
          return {
            login: config.locations?.login ?? false,
            signup: config.locations?.signup ?? false,
            checkout: config.locations?.checkout ?? false,
          };
        }
        return {
          login: false,
          signup: false,
          checkout: false,
        };
      })(),
      tag_manager_container_id: (() => {
        const app = findExternalApp('google_tag_manager');
        if (app?.is_active && app.configurations) {
          return (app.configurations as { container_id: string }).container_id || null;
        }
        return null;
      })(),
      maps_api_key: (() => {
        const app = findExternalApp('google_maps');
        if (app?.is_active && app.configurations) {
          return (app.configurations as { api_key: string }).api_key || null;
        }
        return null;
      })(),
      analytics_measurement_id: (() => {
        const app = findExternalApp('google_analytics');
        if (app?.is_active && app.configurations) {
          return (app.configurations as { measurement_id: string }).measurement_id || null;
        }
        return null;
      })(),
      adsense_publisher_id: (() => {
        const app = findExternalApp('google_adsense');
        if (app?.is_active && app.configurations) {
          return (app.configurations as { publisher_id: string }).publisher_id || null;
        }
        return null;
      })(),
      search_console_verification_content: (() => {
        const app = findExternalApp('google_search_console');
        if (app?.is_active && app.configurations) {
          const metaTag = (app.configurations as import('./appConfiguration').GoogleSearchConsoleConfig).verification_meta_tag;
          if (metaTag) {
            // Check if it's a full meta tag or just the verification code
            const contentMatch = metaTag.match(/content="([^"]+)"/);
            // If it matches the pattern, return the extracted content; otherwise return the value as-is
            return contentMatch ? contentMatch[1] : metaTag;
          }
        }
        return null;
      })(),
    }
  };

  return clientConfig;
}

/**
 * Server-side feature check (for server components and middleware)
 */
export async function isFeatureEnabledOnServer(featureName: string): Promise<boolean> {
  const config = await getServerConfiguration();
  
  const internalApp = config.internal?.find(app => app.app_name === featureName);
  if (internalApp) {
    return internalApp.is_active;
  }
  
  const externalApp = config.external?.find(app => app.app_name === featureName);
  if (externalApp) {
    return externalApp.is_active;
  }
  
  return false;
}