import { AppConfigurationResponse, AppConfig, InternalAppConfig, ExternalAppConfig } from './appConfiguration';

// Cache for configuration to avoid repeated API calls in middleware
let configurationCache: { data: AppConfigurationResponse; timestamp: number } | null = null;
const CACHE_DURATION = 10 * 1000; // 10 seconds (reduced from 5 minutes for real-time updates)

/**
 * Fetches configuration from the external API directly.
 * This is used by middleware since it can't call internal API routes.
 */
export async function fetchConfigurationDirect(): Promise<AppConfigurationResponse> {
  // Check cache first
  if (configurationCache && Date.now() - configurationCache.timestamp < CACHE_DURATION) {
    return configurationCache.data;
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      throw new Error('NEXT_PUBLIC_API_URL not configured');
    }

    const configUrl = `https://wsm-migrator-api.alphasquadit.com/app/get-configuration?tenant=${encodeURIComponent(apiUrl)}`;
    
    const response = await fetch(configUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000) // 10 seconds timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch configuration: ${response.status}`);
    }

    const rawData = await response.json();
    
    // Handle flat array format or empty array
    let data: AppConfigurationResponse;
    if (rawData.length === 0) {
      data = getFallbackConfiguration();
    } else {
      data = transformFlatArrayToStructured(rawData);
    }
    
    // Update cache
    configurationCache = {
      data,
      timestamp: Date.now()
    };
    
    return data;
  } catch (error) {
    console.error('Failed to fetch app configuration:', error);
    
    return getFallbackConfiguration();
  }
}

/**
 * Transforms flat array format to structured format
 */
function transformFlatArrayToStructured(flatArray: AppConfig[]): AppConfigurationResponse {
  const internal: InternalAppConfig[] = [];
  const external: ExternalAppConfig[] = [];
  
  flatArray.forEach(app => {
    // Only apps without configurations go to internal
    if (!app.configurations && app.app_name === 'tiered_pricing') {
      internal.push({
        app_name: app.app_name as 'tiered_pricing',
        is_active: app.is_active
      });
    } else {
      // Apps with configurations go to external (including dealer_locator)
      const knownExternalApps = [
        'dealer_locator', 'google_recaptcha', 'google_tag_manager', 
        'google_maps', 'google_analytics', 'google_adsense', 'google_search_console', 'will-call'
      ];
      
      if (knownExternalApps.includes(app.app_name)) {
        external.push({
          app_name: app.app_name as 'dealer_locator' | 'google_recaptcha' | 'google_tag_manager' | 'google_maps' | 'google_analytics' | 'google_adsense' | 'google_search_console' | 'will-call',
          configurations: app.configurations || {} as Record<string, unknown>,
          is_active: app.is_active
        } as ExternalAppConfig);
      }
    }
  });
  
  return {
    internal,
    external
  };
}

/**
 * Returns fallback configuration with all features disabled
 */
function getFallbackConfiguration(): AppConfigurationResponse {
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

/**
 * Checks if a feature is active in the given configuration
 */
export function isFeatureActive(configuration: AppConfigurationResponse, featureName: string): boolean {
  const internalApp = configuration.internal?.find(app => app.app_name === featureName);
  if (internalApp) {
    return internalApp.is_active;
  }
  
  const externalApp = configuration.external?.find(app => app.app_name === featureName);
  if (externalApp) {
    return externalApp.is_active;
  }
  
  return false;
}

/**
 * Get the configuration URL for external API calls
 */
export function getConfigurationUrl(): string | null {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return null;
  }
  return `https://wsm-migrator-api.alphasquadit.com/app/get-configuration?tenant=${encodeURIComponent(apiUrl)}`;
}

/**
 * Clear the configuration cache - useful for development and testing
 */
export function clearConfigurationCache(): void {
  configurationCache = null;
}

/**
 * Force refresh configuration by clearing cache and fetching new data
 */
export async function refreshConfiguration(): Promise<AppConfigurationResponse> {
  clearConfigurationCache();
  return await fetchConfigurationDirect();
}

// Development helper: expose cache clearing functions to window for easy access
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as Record<string, unknown>).clearServerConfigCache = () => {
    clearConfigurationCache();
  };
  
  (window as Record<string, unknown>).refreshServerConfig = async () => {
    const config = await refreshConfiguration();
    return config;
  };
}