"use client";

import { sendGAEvent } from '@next/third-parties/google';

// GA_MEASUREMENT_ID is now obtained from app configuration service, not process.env
let GA_MEASUREMENT_ID: string | null = null;

// Function to get GA Measurement ID from app configuration
export const getGAMeasurementId = async (): Promise<string | null> => {
  if (GA_MEASUREMENT_ID) return GA_MEASUREMENT_ID;
  
  try {
    // Import app config service dynamically to avoid circular dependencies
    const { appConfigService } = await import('./appConfiguration');
    await appConfigService.fetchConfiguration();
    const gaConfig = appConfigService.getGoogleAnalyticsConfig();
    GA_MEASUREMENT_ID = gaConfig?.measurement_id || null;
    return GA_MEASUREMENT_ID;
  } catch (error) {
    console.error('Failed to get GA configuration:', error);
    return null;
  }
};

// For client-side components that use useAppConfiguration hook
export const getGAMeasurementIdFromContext = (gaConfig: { measurement_id: string } | null): string | null => {
  return gaConfig?.measurement_id || null;
};

// Legacy support - will be deprecated
export { GA_MEASUREMENT_ID };

export const gtag = (...args: unknown[]) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag(...args);
  }
};


export const trackPageView = (url: string, title?: string, measurementId?: string | null) => {
  // Use provided measurementId or fall back to legacy GA_MEASUREMENT_ID
  const activeMeasurementId = measurementId !== undefined ? measurementId : GA_MEASUREMENT_ID;
  if (!activeMeasurementId) return;
  
  sendGAEvent({
    event: 'page_view',
    page_title: title || document.title,
    page_location: url,
  });
};

export const trackEvent = (action: string, parameters?: Record<string, unknown>, measurementId?: string | null) => {
  const activeMeasurementId = measurementId !== undefined ? measurementId : GA_MEASUREMENT_ID;
  if (!activeMeasurementId) return;
  
  sendGAEvent({
    event: action,
    ...parameters,
  });
};

export const trackCustomEvent = (eventName: string, parameters?: Record<string, unknown>, measurementId?: string | null) => {
  const activeMeasurementId = measurementId !== undefined ? measurementId : GA_MEASUREMENT_ID;
  if (!activeMeasurementId) return;
  
  sendGAEvent({
    event: eventName,
    custom_parameter: true,
    ...parameters,
  });
};

export const trackUserEngagement = (engagementTimeMs: number, measurementId?: string | null) => {
  const activeMeasurementId = measurementId !== undefined ? measurementId : GA_MEASUREMENT_ID;
  if (!activeMeasurementId) return;
  
  sendGAEvent({
    event: 'user_engagement',
    engagement_time_msec: engagementTimeMs,
  });
};

export const trackScrollDepth = (scrollPercent: number, measurementId?: string | null) => {
  const activeMeasurementId = measurementId !== undefined ? measurementId : GA_MEASUREMENT_ID;
  if (!activeMeasurementId) return;
  
  sendGAEvent({
    event: 'scroll',
    percent_scrolled: scrollPercent,
  });
};

export const trackOutboundClick = (url: string, linkText?: string, measurementId?: string | null) => {
  const activeMeasurementId = measurementId !== undefined ? measurementId : GA_MEASUREMENT_ID;
  if (!activeMeasurementId) return;
  
  sendGAEvent({
    event: 'click',
    event_category: 'outbound',
    event_label: url,
    link_text: linkText,
    transport_type: 'beacon',
  });
};

export const trackFileDownload = (fileName: string, fileType?: string, measurementId?: string | null) => {
  const activeMeasurementId = measurementId !== undefined ? measurementId : GA_MEASUREMENT_ID;
  if (!activeMeasurementId) return;
  
  sendGAEvent({
    event: 'file_download',
    file_name: fileName,
    file_extension: fileType,
  });
};

export const trackSiteSearch = (searchTerm: string, resultCount?: number, measurementId?: string | null) => {
  const activeMeasurementId = measurementId !== undefined ? measurementId : GA_MEASUREMENT_ID;
  if (!activeMeasurementId) return;
  
  sendGAEvent({
    event: 'search',
    search_term: searchTerm,
    number_of_results: resultCount,
  });
};

export const trackTimingEvent = (name: string, value: number, category?: string, measurementId?: string | null) => {
  const activeMeasurementId = measurementId !== undefined ? measurementId : GA_MEASUREMENT_ID;
  if (!activeMeasurementId) return;
  
  sendGAEvent({
    event: 'timing_complete',
    name: name,
    value: value,
    event_category: category || 'performance',
  });
};

export const trackEcommerce = (action: string, parameters: Record<string, unknown>, measurementId?: string | null) => {
  const activeMeasurementId = measurementId !== undefined ? measurementId : GA_MEASUREMENT_ID;
  if (!activeMeasurementId) return;
  
  sendGAEvent({
    event: action,
    ...parameters,
  });
};

export const setUserProperties = (properties: Record<string, unknown>, measurementId?: string | null) => {
  const activeMeasurementId = measurementId !== undefined ? measurementId : GA_MEASUREMENT_ID;
  if (!activeMeasurementId) return;
  
  gtag("config", activeMeasurementId, {
    user_properties: properties,
  });
};

export const trackException = (description: string, fatal = false, measurementId?: string | null) => {
  const activeMeasurementId = measurementId !== undefined ? measurementId : GA_MEASUREMENT_ID;
  if (!activeMeasurementId) return;
  
  sendGAEvent({
    event: 'exception',
    description: description,
    fatal: fatal,
  });
};