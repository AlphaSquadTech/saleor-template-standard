export interface GoogleRecaptchaConfig {
  site_key: string;
  locations?: {
    login?: boolean;
    signup?: boolean;
    checkout?: boolean;
  };
}

export interface GoogleTagManagerConfig {
  container_id: string;
}

export interface GoogleMapsConfig {
  api_key: string;
}

export interface GoogleAnalyticsConfig {
  measurement_id: string;
}

export interface GoogleAdSenseConfig {
  publisher_id: string;
}

export interface GoogleSearchConsoleConfig {
  verification_meta_tag: string;
}

export interface DealerLocatorConfig {
  token: string;
}

export interface WillCallConfig {
  // Will call doesn't need any configurations for now, but we maintain this for consistency
  enabled?: boolean;
}

export interface AppConfig {
  app_name: string; // Allow any app name since API can return unknown apps
  configurations?: DealerLocatorConfig | GoogleRecaptchaConfig | GoogleTagManagerConfig | GoogleMapsConfig | GoogleAnalyticsConfig | GoogleAdSenseConfig | GoogleSearchConsoleConfig | WillCallConfig | Record<string, unknown>;
  is_active: boolean;
}

export interface ExternalAppConfig {
  app_name: 'dealer_locator' | 'google_recaptcha' | 'google_tag_manager' | 'google_maps' | 'google_analytics' | 'google_adsense' | 'google_search_console' | 'will-call';
  configurations: DealerLocatorConfig | GoogleRecaptchaConfig | GoogleTagManagerConfig | GoogleMapsConfig | GoogleAnalyticsConfig | GoogleAdSenseConfig | GoogleSearchConsoleConfig | WillCallConfig;
  is_active: boolean;
}

export interface InternalAppConfig {
  app_name: 'tiered_pricing';
  is_active: boolean;
}

export interface AppConfigurationResponse {
  internal?: InternalAppConfig[];
  external?: ExternalAppConfig[];
}

class AppConfigurationService {
  private configuration: AppConfigurationResponse | null = null;
  private loading = false;
  private error: string | null = null;
  private lastFetch: number = 0;
  private cacheTimeout: number = 10000; // 10 seconds cache timeout

  async fetchConfiguration(): Promise<AppConfigurationResponse> {
    if (this.configuration && !this.shouldRefetch()) {
      return this.configuration;
    }

    if (this.loading) {
      while (this.loading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.configuration!;
    }

    try {
      this.loading = true;
      this.error = null;

      // Use the API proxy route instead of direct external API call
      const configUrl = '/api/configuration';
      
      const response = await fetch(configUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch configuration: ${response.status}`);
      }

      const rawData = await response.json();
      
      // Handle flat array format or empty array
      let data: AppConfigurationResponse;
      if (rawData.length === 0) {
        data = this.getFallbackConfiguration();
      } else {
        data = this.transformFlatArrayToStructured(rawData);
      }
      
      this.configuration = data;
      this.lastFetch = Date.now();
      
      return data;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to fetch app configuration:', error);
      
      return this.getFallbackConfiguration();
    } finally {
      this.loading = false;
    }
  }

  private shouldRefetch(): boolean {
    const now = Date.now();
    return (now - this.lastFetch) > this.cacheTimeout;
  }

  private getFallbackConfiguration(): AppConfigurationResponse {
    // Return minimal fallback - all features disabled when API fails
    return {
      internal: [
        {
          app_name: 'tiered_pricing',
          is_active: false
        }
      ],
      external: [
        {
          app_name: 'dealer_locator',
          configurations: {
            token: ''
          },
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
          configurations: {
            container_id: ''
          },
          is_active: false
        },
        {
          app_name: 'google_maps',
          configurations: {
            api_key: ''
          },
          is_active: false
        },
        {
          app_name: 'google_analytics',
          configurations: {
            measurement_id: ''
          },
          is_active: false
        },
        {
          app_name: 'google_adsense',
          configurations: {
            publisher_id: ''
          },
          is_active: false
        },
        {
          app_name: 'google_search_console',
          configurations: {
            verification_meta_tag: ''
          },
          is_active: false
        }
      ]
    };
  }

  private transformFlatArrayToStructured(flatArray: AppConfig[]): AppConfigurationResponse {
    const internalApps: InternalAppConfig[] = [];
    const externalApps: ExternalAppConfig[] = [];
    
    flatArray.forEach(app => {
      // Only apps without configurations go to internal
      if (!app.configurations && app.app_name === 'tiered_pricing') {
        internalApps.push({
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
          externalApps.push({
            app_name: app.app_name as 'dealer_locator' | 'google_recaptcha' | 'google_tag_manager' | 'google_maps' | 'google_analytics' | 'google_adsense' | 'google_search_console' | 'will-call',
            configurations: app.configurations || {},
            is_active: app.is_active
          } as ExternalAppConfig);
        }
      }
    });
    
    return {
      internal: internalApps,
      external: externalApps
    };
  }

  getExternalConfig<T>(appName: string): T | null {
    if (!this.configuration) return null;
    
    const app = this.configuration.external?.find(app => app.app_name === appName);
    return app?.is_active ? (app.configurations as T) : null;
  }

  getInternalConfig(appName: string): boolean {
    if (!this.configuration) return false;
    
    const app = this.configuration.internal?.find(app => app.app_name === appName);
    return app?.is_active ?? false;
  }

  isAppActive(appName: string): boolean {
    if (!this.configuration) return false;
    
    const externalApp = this.configuration.external?.find(app => app.app_name === appName);
    if (externalApp) return externalApp.is_active;
    
    const internalApp = this.configuration.internal?.find(app => app.app_name === appName);
    return internalApp?.is_active ?? false;
  }

  getGoogleRecaptchaConfig(): GoogleRecaptchaConfig | null {
    return this.getExternalConfig<GoogleRecaptchaConfig>('google_recaptcha');
  }

  isRecaptchaEnabledFor(location: 'login' | 'signup' | 'checkout'): boolean {
    if (!this.isAppActive('google_recaptcha')) return false;
    
    const config = this.getGoogleRecaptchaConfig();
    return config?.locations?.[location] ?? false;
  }

  getGoogleTagManagerConfig(): GoogleTagManagerConfig | null {
    return this.getExternalConfig<GoogleTagManagerConfig>('google_tag_manager');
  }

  getGoogleMapsConfig(): GoogleMapsConfig | null {
    return this.getExternalConfig<GoogleMapsConfig>('google_maps');
  }

  getGoogleAnalyticsConfig(): GoogleAnalyticsConfig | null {
    return this.getExternalConfig<GoogleAnalyticsConfig>('google_analytics');
  }

  getGoogleAdSenseConfig(): GoogleAdSenseConfig | null {
    return this.getExternalConfig<GoogleAdSenseConfig>('google_adsense');
  }

  getGoogleSearchConsoleConfig(): GoogleSearchConsoleConfig | null {
    return this.getExternalConfig<GoogleSearchConsoleConfig>('google_search_console');
  }

  isDealerLocatorEnabled(): boolean {
    return this.getInternalConfig('dealer_locator');
  }

  isWillCallEnabled(): boolean {
    return this.isAppActive('will-call');
  }

  getLastError(): string | null {
    return this.error;
  }

  // Force refresh configuration (useful for development)
  clearCache(): void {
    this.configuration = null;
    this.lastFetch = 0;
    this.error = null;
  }

  // Reduce cache timeout for development
  setCacheTimeout(timeoutMs: number): void {
    this.cacheTimeout = timeoutMs;
  }
}

export const appConfigService = new AppConfigurationService();

// Development helper: expose cache clearing functions to window for easy access
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as Record<string, unknown>).clearAppConfigCache = () => {
    appConfigService.clearCache();
  };
  
  (window as Record<string, unknown>).refreshAppConfig = async () => {
    appConfigService.clearCache();
    const config = await appConfigService.fetchConfiguration();
    return config;
  };
  
  (window as Record<string, unknown>).setAppConfigCacheTimeout = (timeoutMs: number) => {
    appConfigService.setCacheTimeout(timeoutMs);

  };
}