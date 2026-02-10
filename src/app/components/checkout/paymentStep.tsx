'use client';
import { useState, useCallback } from 'react';
import { PaymentProcessingState, KountConfigResponse } from '@/graphql/types/checkout';
import { SaleorNativePayment } from './saleorNativePayment';

interface PaymentGateway {
  id: string;
  name: string;
  config: Array<{
    field: string;
    value: string;
  }>;
}

interface TaxInfo {
  totalTax: number;
  shippingTax: number;
  subtotalNet: number;
  shippingNet: number;
  currency: string;
}

interface PaymentStepProps {
  onBack: () => void;
  totalAmount: number;
  checkoutId: string;
  onComplete: () => void;
  onStartPayment?: () => Promise<void> | void;
  isProcessingPayment: PaymentProcessingState;
  setIsProcessingPayment: (state: PaymentProcessingState) => void;
  availablePaymentGateways?: PaymentGateway[];
  kountConfig?: KountConfigResponse | null;
  selectedShippingId?: string;
  userEmail?: string;
  guestEmail?: string;
  questionsValid?: boolean;
  termsAccepted?: boolean;
  termsData?: { page?: { isPublished: boolean } | null };
  onTermsModalOpen?: () => void;
  onTermsAcceptedChange?: (accepted: boolean) => void;
  billingAddress?: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
  };
  shippingAddress?: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
  };
  lineItems?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    category?: string;
    sku?: string;
  }>;
  taxInfo?: TaxInfo | null;
  disabled?: boolean;
  isCalculatingTotal?: boolean;
  onPaymentReady?: (triggerPayment: () => Promise<void>) => void;
}

export default function PaymentStep({
  onBack: _onBack,
  totalAmount,
  checkoutId,
  onComplete,
  onStartPayment,
  isProcessingPayment: _isProcessingPayment,
  setIsProcessingPayment,
  availablePaymentGateways,
  kountConfig,
  selectedShippingId,
  userEmail,
  guestEmail,
  lineItems,
  billingAddress,
  shippingAddress,
  questionsValid = true,
  termsAccepted = true,
  termsData,
  onTermsModalOpen,
  onTermsAcceptedChange,
  taxInfo,
  disabled = false,
  isCalculatingTotal = false,
  onPaymentReady,
}: PaymentStepProps) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isCheckoutBlocked, setIsCheckoutBlocked] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState('');

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type }); setTimeout(() => setToast(null), 3000);
  }, []);
  const handlePaymentSuccess = () => onComplete();
  const handlePaymentError = (message: string) => showToast(message, 'error');
  const handleCheckoutBlocked = useCallback((message: string) => {
    setIsCheckoutBlocked(true);
    setBlockedMessage(message);
  }, []);

  return (
    <div className="relative overflow-hidden">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-secondary text-[var(--color-secondary-800)] font-semibold">PAYMENT METHOD</h2>
      </div>
      {toast && <div className={`mb-4 p-3 rounded-md ${toast.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{toast.message}</div>}

      {disabled && (
        <div className="text-xs font-secondary text-[var(--color-secondary-600)] items-center bg-[var(--color-secondary-100)] border border-[var(--color-secondary-200)] p-2 mb-4 flex  gap-2">
          {isCalculatingTotal ? (
            <svg className="w-5 h-5 text-[var(--color-secondary-600)] mt-0.5 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-5 h-5 text-[var(--color-secondary-600)] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )}
          <p>
            {isCalculatingTotal
              ? "Calculating total..."
              : "Please select a delivery method to enable payment options."}
          </p>
        </div>
      )}

      {isCheckoutBlocked ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center">
          <div className="text-red-800 font-medium mb-2">
            Checkout Unavailable
          </div>
          <div className="text-red-700 text-sm">
            {blockedMessage}
          </div>
        </div>
      ) : (
        <SaleorNativePayment
          checkoutId={checkoutId}
          totalAmount={totalAmount}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          onCheckoutBlocked={handleCheckoutBlocked}
          setIsProcessingPayment={setIsProcessingPayment}
          availablePaymentGateways={availablePaymentGateways}
          kountConfig={kountConfig}
          onStartPayment={onStartPayment}
          selectedShippingId={selectedShippingId}
          userEmail={userEmail}
          guestEmail={guestEmail}
          lineItems={lineItems}
          billingAddress={billingAddress}
          shippingAddress={shippingAddress}
          questionsValid={questionsValid}
          termsAccepted={termsAccepted}
          termsData={termsData}
          onTermsModalOpen={onTermsModalOpen}
          onTermsAcceptedChange={onTermsAcceptedChange}
          taxInfo={taxInfo}
          disabled={disabled}
          onPaymentReady={onPaymentReady}
        />
      )}
    </div>
  );
}
