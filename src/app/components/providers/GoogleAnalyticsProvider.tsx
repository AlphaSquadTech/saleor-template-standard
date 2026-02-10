"use client";

import { useEffect } from "react";
import { useGoogleAnalytics, useTrackEntrance, useTrackExit } from "@/app/hooks/useGoogleAnalytics";
import { setUserProperties } from "@/app/utils/googleAnalytics";
import { sendGAEvent } from '@next/third-parties/google';
import { useAppConfiguration } from "./ServerAppConfigurationProvider";


interface GoogleAnalyticsProviderProps {
  children: React.ReactNode;
}

export default function GoogleAnalyticsProvider({ children }: GoogleAnalyticsProviderProps) {
  const { isAppActive, getGoogleAnalyticsConfig } = useAppConfiguration();
  
  const isGoogleAnalyticsEnabled = isAppActive('google_analytics');
  const gaConfig = getGoogleAnalyticsConfig();
  
  useGoogleAnalytics(isGoogleAnalyticsEnabled ? gaConfig?.measurement_id : null);
  
  useTrackEntrance(isGoogleAnalyticsEnabled ? gaConfig?.measurement_id : null);
  useTrackExit(isGoogleAnalyticsEnabled ? gaConfig?.measurement_id : null);

  useEffect(() => {
    if (!isGoogleAnalyticsEnabled) return;
    const userAgent = navigator.userAgent;
    const platform = (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform;
    const language = navigator.language;
    const screenResolution = `${screen.width}x${screen.height}`;
    const viewportSize = `${window.innerWidth}x${window.innerHeight}`;

    const userProperties = {
      user_agent: userAgent,
      platform: platform,
      language: language,
      screen_resolution: screenResolution,
      viewport_size: viewportSize,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    setUserProperties(userProperties, gaConfig?.measurement_id);

    // Bounce detection variables
    let interactionOccurred = false;
    let bounceTimer: NodeJS.Timeout | null = null;
    const startTime = Date.now();

    const trackInteraction = () => {
      if (!interactionOccurred) {
        interactionOccurred = true;
        
        // Clear the bounce timer since user interacted
        if (bounceTimer) {
          clearTimeout(bounceTimer);
        }
      }
    };

    const sendBounceEvent = (timeOnSite: number, trigger: string) => {
      if (!interactionOccurred) {
        const eventData = {
          event: 'bounce_detected',
          time_on_page: timeOnSite,
          interaction_occurred: false,
          trigger: trigger
        };
        
        // Send via Next.js third-parties
        sendGAEvent(eventData);
        
        // Also send via direct gtag as fallback
        if (typeof window !== 'undefined' && (window as { gtag?: (command: string, action: string, parameters?: object) => void }).gtag) {
          (window as { gtag: (command: string, action: string, parameters?: object) => void }).gtag('event', 'bounce_detected', {
            time_on_page: timeOnSite,
            interaction_occurred: false,
            trigger: trigger,
            custom_parameter_1: 'bounce_tracking'
          });
        }
        
        // Mark that bounce was detected to prevent duplicate events
        interactionOccurred = true;
      }
    };

    const handleBeforeUnload = () => {
      const timeOnSite = Date.now() - startTime;
      sendBounceEvent(timeOnSite, 'beforeunload');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const timeOnSite = Date.now() - startTime;
        sendBounceEvent(timeOnSite, 'visibility_change');
      }
    };

    // Set up interaction tracking
    const events = ["click", "scroll", "keydown", "mousemove", "touchstart"];
    events.forEach(event => {
      document.addEventListener(event, trackInteraction, { once: true, passive: true });
    });

    // Set up exit tracking
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set up bounce timer (10 seconds for faster testing, can be changed to 30000 for production)
    const BOUNCE_TIMEOUT = process.env.NODE_ENV === 'development' ? 10000 : 30000;
    bounceTimer = setTimeout(() => {
      const timeOnSite = Date.now() - startTime;
      sendBounceEvent(timeOnSite, `${BOUNCE_TIMEOUT/1000}_second_timeout`);
    }, BOUNCE_TIMEOUT);

    // Development helper: expose bounce testing to window
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as { testBounceDetection?: () => void }).testBounceDetection = () => {
        const timeOnSite = Date.now() - startTime;
        sendBounceEvent(timeOnSite, 'manual_test');
      };
      
      (window as { getBounceStatus?: () => object }).getBounceStatus = () => {
        const timeOnSite = Date.now() - startTime;
        return {
          timeOnSite: timeOnSite,
          interactionOccurred: interactionOccurred,
          bounceTimerActive: !!bounceTimer
        };
      };
    }

    // Cleanup function
    return () => {
      if (bounceTimer) {
        clearTimeout(bounceTimer);
      }
      
      events.forEach(event => {
        document.removeEventListener(event, trackInteraction);
      });
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isGoogleAnalyticsEnabled]);

  return <>{children}</>;
}