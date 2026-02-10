"use client";

declare global {
  interface Window {
    dataLayer?: object[];
    gtag: (...args: unknown[]) => void;
  }
}

// GTM_ID is now obtained from app configuration service, not process.env
let GTM_ID: string | null = null;

// Function to get GTM ID from app configuration
export const getGTMId = async (): Promise<string | null> => {
  if (GTM_ID) return GTM_ID;
  
  try {
    // Import app config service dynamically to avoid circular dependencies
    const { appConfigService } = await import('./appConfiguration');
    await appConfigService.fetchConfiguration();
    const gtmConfig = appConfigService.getGoogleTagManagerConfig();
    GTM_ID = gtmConfig?.container_id || null;
    return GTM_ID;
  } catch (error) {
    console.error('Failed to get GTM configuration:', error);
    return null;
  }
};

// For client-side components that use useAppConfiguration hook
export const getGTMIdFromContext = (gtmConfig: { container_id: string } | null): string | null => {
  return gtmConfig?.container_id || null;
};

// Legacy support - will be deprecated
export { GTM_ID };

export const pushToDataLayer = (data: Record<string, unknown>) => {
  if (typeof window !== "undefined") {
    if (!window.dataLayer) {
      window.dataLayer = [];
    }
    window.dataLayer.push(data);
  }
};

export const gtmPageView = (url: string, title?: string, gtmId?: string | null) => {
  // GTM ID validation removed - events should fire regardless
  
  pushToDataLayer({
    event: 'page_view',
    page_title: title || document.title,
    page_location: url,
    page_path: window.location.pathname,
  });
};

export interface Product {
  item_id: string;
  item_name: string;
  affiliation?: string;
  coupon?: string;
  currency?: string;
  discount?: number;
  index?: number;
  item_brand?: string;
  item_category?: string;
  item_category2?: string;
  item_category3?: string;
  item_category4?: string;
  item_category5?: string;
  item_list_id?: string;
  item_list_name?: string;
  item_variant?: string;
  location_id?: string;
  price?: number;
  quantity?: number;
}

export const gtmViewItemList = (items: Product[], listName?: string, listId?: string, gtmId?: string | null) => {
  if (!items.length) return;
  
  pushToDataLayer({
    event: 'view_item_list',
    item_list_id: listId,
    item_list_name: listName,
    items: items,
  });
};

export const gtmSelectItem = (items: Product[], listName?: string, listId?: string, gtmId?: string | null) => {
  if (!items.length) return;
  
  pushToDataLayer({
    event: 'select_item',
    item_list_id: listId,
    item_list_name: listName,
    items: items,
  });
};

export const gtmViewItem = (items: Product[], currency: string = 'USD', value?: number, gtmId?: string | null) => {
  if (!items.length) return;
  
  pushToDataLayer({
    event: 'view_item',
    currency: currency,
    value: value || items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0),
    items: items,
  });
};

export const gtmAddToCart = (items: Product[], currency: string = 'USD', value?: number, gtmId?: string | null) => {
  if (!items.length) return;
  
  pushToDataLayer({
    event: 'add_to_cart',
    currency: currency,
    value: value || items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0),
    items: items,
  });
};

export const gtmRemoveFromCart = (items: Product[], currency: string = 'USD', value?: number, gtmId?: string | null) => {
  if (!items.length) return;
  
  pushToDataLayer({
    event: 'remove_from_cart',
    currency: currency,
    value: value || items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0),
    items: items,
  });
};

export const gtmViewCart = (items: Product[], currency: string = 'USD', value?: number, gtmId?: string | null) => {
  if (!items.length) return;
  
  pushToDataLayer({
    event: 'view_cart',
    currency: currency,
    value: value || items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0),
    items: items,
  });
};

export const gtmBeginCheckout = (items: Product[], currency: string = 'USD', value?: number, coupon?: string, gtmId?: string | null) => {
  if (!items.length) return;
  
  pushToDataLayer({
    event: 'begin_checkout',
    currency: currency,
    value: value || items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0),
    coupon: coupon,
    items: items,
  });
};

export interface ShippingAddress {
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  first_name?: string;
  last_name?: string;
}

export const gtmAddShippingInfo = (
  items: Product[], 
  currency: string = 'USD', 
  value?: number, 
  coupon?: string,
  shippingTier?: string,
  shippingAddress?: ShippingAddress,
  gtmId?: string | null
) => {
  if (!items.length) return;
  
  pushToDataLayer({
    event: 'add_shipping_info',
    currency: currency,
    value: value || items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0),
    coupon: coupon,
    shipping_tier: shippingTier,
    items: items,
    ...shippingAddress,
  });
};

export const gtmAddPaymentInfo = (
  items: Product[], 
  currency: string = 'USD', 
  value?: number, 
  coupon?: string,
  paymentType?: string,
  gtmId?: string | null
) => {
  if (!items.length) return;
  
  pushToDataLayer({
    event: 'add_payment_info',
    currency: currency,
    value: value || items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0),
    coupon: coupon,
    payment_type: paymentType,
    items: items,
  });
};

export interface PurchaseData {
  transaction_id: string;
  affiliation?: string;
  value: number;
  tax?: number;
  shipping?: number;
  currency?: string;
  coupon?: string;
  items: Product[];
}

export const gtmPurchase = (purchaseData: PurchaseData, gtmId?: string | null) => {
  // GTM ID validation removed - events should fire regardless
  
  pushToDataLayer({
    event: 'purchase',
    transaction_id: purchaseData.transaction_id,
    affiliation: purchaseData.affiliation,
    value: purchaseData.value,
    tax: purchaseData.tax,
    shipping: purchaseData.shipping,
    currency: purchaseData.currency || 'USD',
    coupon: purchaseData.coupon,
    items: purchaseData.items,
  });
};

export const gtmRefund = (
  transactionId: string, 
  items?: Product[], 
  currency: string = 'USD', 
  value?: number,
  gtmId?: string | null
) => {
  // GTM ID validation removed - events should fire regardless
  
  const refundData: Record<string, unknown> = {
    event: 'refund',
    transaction_id: transactionId,
    currency: currency,
  };

  if (items && items.length > 0) {
    refundData.value = value || items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
    refundData.items = items;
  } else if (value) {
    refundData.value = value;
  }
  
  pushToDataLayer(refundData);
};

export const gtmSearch = (searchTerm: string, numberOfResults?: number, gtmId?: string | null) => {
  // GTM ID validation removed - events should fire regardless
  
  pushToDataLayer({
    event: 'search',
    search_term: searchTerm,
    number_of_results: numberOfResults,
  });
};

export const gtmShare = (method: string, contentType: string, itemId: string, gtmId?: string | null) => {
  // GTM ID validation removed - events should fire regardless
  
  pushToDataLayer({
    event: 'share',
    method: method,
    content_type: contentType,
    item_id: itemId,
  });
};

export const gtmLogin = (method?: string, gtmId?: string | null) => {
  // GTM ID validation removed - events should fire regardless
  
  pushToDataLayer({
    event: 'login',
    method: method,
  });
};

export const gtmSignUp = (method?: string, gtmId?: string | null) => {
  // GTM ID validation removed - events should fire regardless
  
  pushToDataLayer({
    event: 'sign_up',
    method: method,
  });
};

export const gtmGenerateLead = (currency: string = 'USD', value?: number, gtmId?: string | null) => {
  // GTM ID validation removed - events should fire regardless
  
  pushToDataLayer({
    event: 'generate_lead',
    currency: currency,
    value: value,
  });
};

export const gtmCustomEvent = (eventName: string, parameters?: Record<string, unknown>, gtmId?: string | null) => {
  // GTM ID validation removed - events should fire regardless
  
  pushToDataLayer({
    event: eventName,
    ...parameters,
  });
};

export const gtmSetUserProperties = (userId?: string, properties?: Record<string, unknown>, gtmId?: string | null) => {
  // GTM ID validation removed - events should fire regardless
  
  const userData: Record<string, unknown> = {
    event: 'user_properties',
  };
  
  if (userId) {
    userData.user_id = userId;
  }
  
  if (properties) {
    userData.user_properties = properties;
  }
  
  pushToDataLayer(userData);
};

// Enhanced Conversion Tracking
export interface EnhancedConversionData {
  email?: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  street?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
}

export const gtmEnhancedConversion = (
  conversionData: EnhancedConversionData,
  conversionValue?: number,
  conversionCurrency: string = 'USD',
  gtmId?: string | null
) => {
  // GTM ID validation removed - events should fire regardless
  
  pushToDataLayer({
    event: 'enhanced_conversion',
    enhanced_conversion_data: conversionData,
    value: conversionValue,
    currency: conversionCurrency,
  });
};

// Enhanced E-commerce - Select Promotion
export const gtmSelectPromotion = (
  promotionId: string,
  promotionName: string,
  creativeName?: string,
  creativeSlot?: string,
  locationId?: string,
  items?: Product[],
  gtmId?: string | null
) => {
  // GTM ID validation removed - events should fire regardless
  
  pushToDataLayer({
    event: 'select_promotion',
    promotion_id: promotionId,
    promotion_name: promotionName,
    creative_name: creativeName,
    creative_slot: creativeSlot,
    location_id: locationId,
    items: items || [],
  });
};

// Enhanced E-commerce - View Promotion
export const gtmViewPromotion = (
  promotionId: string,
  promotionName: string,
  creativeName?: string,
  creativeSlot?: string,
  locationId?: string,
  items?: Product[],
  gtmId?: string | null
) => {
  // GTM ID validation removed - events should fire regardless
  
  pushToDataLayer({
    event: 'view_promotion',
    promotion_id: promotionId,
    promotion_name: promotionName,
    creative_name: creativeName,
    creative_slot: creativeSlot,
    location_id: locationId,
    items: items || [],
  });
};

// User Engagement Events
export const gtmEngagementTime = (engagementTimeMs: number, gtmId?: string | null) => {
  // GTM ID validation removed - events should fire regardless
  
  pushToDataLayer({
    event: 'user_engagement',
    engagement_time_msec: engagementTimeMs,
  });
};

export const gtmScrollDepth = (scrollDepthPercent: number, pagePath?: string, gtmId?: string | null) => {
  // GTM ID validation removed - events should fire regardless
  
  pushToDataLayer({
    event: 'scroll',
    scroll_depth: scrollDepthPercent,
    page_path: pagePath || window.location.pathname,
  });
};

// Enhanced Search with Result Count
export const gtmSearchWithResults = (searchTerm: string, numberOfResults: number, searchCategory?: string, gtmId?: string | null) => {
  // GTM ID validation removed - events should fire regardless
  
  pushToDataLayer({
    event: 'search',
    search_term: searchTerm,
    search_category: searchCategory,
    number_of_results: numberOfResults,
  });
};

const gtmUtils = {
  gtmPageView,
  gtmViewItemList,
  gtmSelectItem,
  gtmViewItem,
  gtmAddToCart,
  gtmRemoveFromCart,
  gtmViewCart,
  gtmBeginCheckout,
  gtmAddShippingInfo,
  gtmAddPaymentInfo,
  gtmPurchase,
  gtmRefund,
  gtmSearch,
  gtmSearchWithResults,
  gtmShare,
  gtmLogin,
  gtmSignUp,
  gtmGenerateLead,
  gtmCustomEvent,
  gtmSetUserProperties,
  gtmEnhancedConversion,
  gtmSelectPromotion,
  gtmViewPromotion,
  gtmEngagementTime,
  gtmScrollDepth,
  pushToDataLayer,
};

export default gtmUtils;