/**
 * Utility function to get the user's IP address
 * This will try multiple methods to detect the user's IP
 */
export async function getUserIP(): Promise<string> {
  try {
    // Try ipify service first (most reliable)
    const response = await fetch('https://api.ipify.org?format=json');
    if (response.ok) {
      const data = await response.json();
      if (data.ip) return data.ip;
    }
  } catch (error) {
    console.warn('Failed to get IP from ipify:', error);
  }

  try {
    // Fallback to ipinfo.io
    const response = await fetch('https://ipinfo.io/json');
    if (response.ok) {
      const data = await response.json();
      if (data.ip) return data.ip;
    }
  } catch (error) {
    console.warn('Failed to get IP from ipinfo.io:', error);
  }

  // Final fallback - return a default IP
  return '127.0.0.1';
}

/**
 * Generate a random transaction ID for Kount
 */
export function generateTransactionId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a valid device session ID for Kount
 * Must be <= 36 characters and contain only alphanumeric, hyphen, and underscore
 */
export function generateDeviceSessionId(userId?: string, checkoutId?: string): string {
  // Create a base from user ID or checkout ID if available
  let base = '';
  if (userId) {
    base = userId.replace(/[^a-zA-Z0-9\-_]/g, '').substring(0, 16);
  } else if (checkoutId) {
    base = checkoutId.replace(/[^a-zA-Z0-9\-_]/g, '').substring(0, 16);
  }
  
  // Generate random suffix to make it unique
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const randomSuffix = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Combine base with random suffix, ensuring total length <= 36
  const deviceSessionId = base ? `${base}-${randomSuffix}` : `device-${randomSuffix}`;
  
  // Ensure it's not longer than 36 characters
  return deviceSessionId.substring(0, 36);
}

/**
 * Format date to RFC3339 format for Kount API
 */
export function formatRFC3339Date(date: Date): string {
  return date.toISOString();
}

/**
 * Payment type constants as defined by Kount API
 */
export const PAYMENT_TYPES = {
  AFFIRM: 'AFFIRM',
  AFTERPAY: 'AFTRPAY',
  ALIPAY: 'ALIPAY',
  AMAZON_PAY: 'AMZN',
  APPLE_PAY: 'APAY',
  BILL_ME_LATER: 'BLML',
  BPAY: 'BPAY',
  CARTE_BLEUE: 'CARTE_BLEUE',
  CHECK: 'CHEK',
  CREDIT_CARD: 'CREDIT_CARD',
  CRYPTO: 'CRYPTO',
  DEBIT_CARD: 'DEBIT_CARD',
  ELV: 'ELV',
  FACEBOOK_PAY: 'FBPAY',
  GREEN_DOT_MONEY_PACK: 'GDMP',
  GIFT_CARD: 'GIFT',
  GIROPAY: 'GIROPAY',
  GOOGLE_CHECKOUT: 'GOOG',
  INTERAC: 'INTERAC',
  KLARNA: 'KLARNA',
  PAYPAL: 'PYPL',
  MERCADE_PAGO: 'MERCADE_PAGO',
  NETELLER: 'NETELLER',
  NONE: 'NONE',
  POLI: 'POLI',
  SAMSUNG_PAY: 'SAMPAY',
  SEPA: 'SEPA',
  SKRILL: 'SKRILL',
  SOFORT: 'SOFORT',
  SPLITIT: 'SPLIT',
  TOKEN: 'TOKEN',
  WECHAT_PAY: 'WCPAY'
} as const;

/**
 * Detect payment type based on card number patterns
 * @param cardNumber - The card number (with or without spaces/dashes)
 * @param paymentMethod - Optional payment method identifier
 * @returns Payment type constant
 */
export function detectPaymentType(cardNumber: string, paymentMethod?: string): string {
  // Handle non-card payment methods first
  if (paymentMethod) {
    const method = paymentMethod.toLowerCase();
    
    if (method.includes('paypal')) return PAYMENT_TYPES.PAYPAL;
    if (method.includes('apple') || method.includes('applepay')) return PAYMENT_TYPES.APPLE_PAY;
    if (method.includes('google') || method.includes('googlepay')) return PAYMENT_TYPES.GOOGLE_CHECKOUT;
    if (method.includes('samsung') || method.includes('samsungpay')) return PAYMENT_TYPES.SAMSUNG_PAY;
    if (method.includes('amazon')) return PAYMENT_TYPES.AMAZON_PAY;
    if (method.includes('affirm')) return PAYMENT_TYPES.AFFIRM;
    if (method.includes('afterpay')) return PAYMENT_TYPES.AFTERPAY;
    if (method.includes('klarna')) return PAYMENT_TYPES.KLARNA;
    if (method.includes('alipay')) return PAYMENT_TYPES.ALIPAY;
    if (method.includes('wechat')) return PAYMENT_TYPES.WECHAT_PAY;
    if (method.includes('facebook')) return PAYMENT_TYPES.FACEBOOK_PAY;
    if (method.includes('sofort')) return PAYMENT_TYPES.SOFORT;
    if (method.includes('giropay')) return PAYMENT_TYPES.GIROPAY;
    if (method.includes('sepa')) return PAYMENT_TYPES.SEPA;
    if (method.includes('interac')) return PAYMENT_TYPES.INTERAC;
    if (method.includes('splitit')) return PAYMENT_TYPES.SPLITIT;
    if (method.includes('crypto') || method.includes('bitcoin') || method.includes('ethereum')) return PAYMENT_TYPES.CRYPTO;
  }

  // Clean the card number - remove spaces, dashes, and any non-digit characters
  const cleanCardNumber = cardNumber.replace(/\D/g, '');
  
  // Return early if no valid card number
  if (!cleanCardNumber || cleanCardNumber.length < 4) {
    return PAYMENT_TYPES.CREDIT_CARD; // Default fallback
  }

  // Get first few digits for pattern matching
  const firstDigit = cleanCardNumber.charAt(0);
  const firstTwoDigits = cleanCardNumber.substring(0, 2);
  const firstThreeDigits = cleanCardNumber.substring(0, 3);
  const firstFourDigits = cleanCardNumber.substring(0, 4);

  // Visa: starts with 4
  if (firstDigit === '4') {
    return PAYMENT_TYPES.CREDIT_CARD;
  }

  // Mastercard: starts with 5 (51-55) or 2 (2221-2720)
  if (firstDigit === '5') {
    const secondDigit = parseInt(cleanCardNumber.charAt(1));
    if (secondDigit >= 1 && secondDigit <= 5) {
      return PAYMENT_TYPES.CREDIT_CARD;
    }
  }
  if (firstDigit === '2') {
    const first4 = parseInt(firstFourDigits);
    if (first4 >= 2221 && first4 <= 2720) {
      return PAYMENT_TYPES.CREDIT_CARD;
    }
  }

  // American Express: starts with 34 or 37
  if (firstTwoDigits === '34' || firstTwoDigits === '37') {
    return PAYMENT_TYPES.CREDIT_CARD;
  }

  // Discover: starts with 6011, 622126-622925, 644-649, or 65
  if (firstFourDigits === '6011' || firstTwoDigits === '65') {
    return PAYMENT_TYPES.CREDIT_CARD;
  }
  if (firstTwoDigits === '64') {
    const thirdDigit = parseInt(cleanCardNumber.charAt(2));
    if (thirdDigit >= 4 && thirdDigit <= 9) {
      return PAYMENT_TYPES.CREDIT_CARD;
    }
  }
  if (firstThreeDigits === '622') {
    const next3 = parseInt(cleanCardNumber.substring(3, 6));
    if (next3 >= 126 && next3 <= 925) {
      return PAYMENT_TYPES.CREDIT_CARD;
    }
  }

  // Diners Club: starts with 300-305, 36, 38, or 54-55
  if (firstThreeDigits >= '300' && firstThreeDigits <= '305') {
    return PAYMENT_TYPES.CREDIT_CARD;
  }
  if (firstTwoDigits === '36' || firstTwoDigits === '38') {
    return PAYMENT_TYPES.CREDIT_CARD;
  }

  // JCB: starts with 35 or 2131/1800
  if (firstTwoDigits === '35') {
    return PAYMENT_TYPES.CREDIT_CARD;
  }
  if (firstFourDigits === '2131' || firstFourDigits === '1800') {
    return PAYMENT_TYPES.CREDIT_CARD;
  }

  // UnionPay: starts with 62
  if (firstTwoDigits === '62') {
    return PAYMENT_TYPES.CREDIT_CARD;
  }

  // Maestro: starts with 5018, 5020, 5038, 5893, 6304, 6759, 6761, 6762, 6763
  const maestroPrefixes = ['5018', '5020', '5038', '5893', '6304', '6759', '6761', '6762', '6763'];
  if (maestroPrefixes.includes(firstFourDigits)) {
    return PAYMENT_TYPES.DEBIT_CARD;
  }

  // If we can't determine the specific type, default to credit card
  return PAYMENT_TYPES.CREDIT_CARD;
}

/**
 * Get a user-friendly name for the payment type
 * @param paymentType - Payment type constant
 * @returns Human-readable payment type name
 */
export function getPaymentTypeName(paymentType: string): string {
  const names: Record<string, string> = {
    [PAYMENT_TYPES.AFFIRM]: 'Affirm',
    [PAYMENT_TYPES.AFTERPAY]: 'Afterpay',
    [PAYMENT_TYPES.ALIPAY]: 'AliPay',
    [PAYMENT_TYPES.AMAZON_PAY]: 'Amazon Pay',
    [PAYMENT_TYPES.APPLE_PAY]: 'Apple Pay',
    [PAYMENT_TYPES.BILL_ME_LATER]: 'Bill Me Later',
    [PAYMENT_TYPES.BPAY]: 'BPAY',
    [PAYMENT_TYPES.CARTE_BLEUE]: 'Carte Bleue',
    [PAYMENT_TYPES.CHECK]: 'Check',
    [PAYMENT_TYPES.CREDIT_CARD]: 'Credit Card',
    [PAYMENT_TYPES.CRYPTO]: 'Crypto Payments',
    [PAYMENT_TYPES.DEBIT_CARD]: 'Debit Card',
    [PAYMENT_TYPES.ELV]: 'ELV',
    [PAYMENT_TYPES.FACEBOOK_PAY]: 'Facebook Pay',
    [PAYMENT_TYPES.GREEN_DOT_MONEY_PACK]: 'Green Dot Money Pack',
    [PAYMENT_TYPES.GIFT_CARD]: 'Gift Card',
    [PAYMENT_TYPES.GIROPAY]: 'GiroPay',
    [PAYMENT_TYPES.GOOGLE_CHECKOUT]: 'Google Checkout',
    [PAYMENT_TYPES.INTERAC]: 'Interac',
    [PAYMENT_TYPES.KLARNA]: 'Klarna',
    [PAYMENT_TYPES.PAYPAL]: 'PayPal',
    [PAYMENT_TYPES.MERCADE_PAGO]: 'Mercade Pago',
    [PAYMENT_TYPES.NETELLER]: 'Neteller',
    [PAYMENT_TYPES.NONE]: 'None',
    [PAYMENT_TYPES.POLI]: 'POLi',
    [PAYMENT_TYPES.SAMSUNG_PAY]: 'Samsung Pay',
    [PAYMENT_TYPES.SEPA]: 'Single Euro Payments Area',
    [PAYMENT_TYPES.SKRILL]: 'Skrill/Moneybookers',
    [PAYMENT_TYPES.SOFORT]: 'Sofort',
    [PAYMENT_TYPES.SPLITIT]: 'Splitit',
    [PAYMENT_TYPES.TOKEN]: 'Token provided from payment processor',
    [PAYMENT_TYPES.WECHAT_PAY]: 'WeChat Pay'
  };

  return names[paymentType] || 'Unknown Payment Type';
}