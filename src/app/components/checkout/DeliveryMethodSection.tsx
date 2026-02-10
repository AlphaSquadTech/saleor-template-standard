"use client";

import { InfoIcon } from "@/app/utils/svgs/infoIcon";

interface ShippingMethod {
  id: string;
  name: string;
  price: { amount: number; currency: string };
  minimumDeliveryDays?: number | null;
  maximumDeliveryDays?: number | null;
}

interface DeliveryMethodSectionProps {
  checkoutId: string | null | undefined;
  canShowDeliveryMethods: boolean;
  hasCompleteShippingInfo: boolean;
  missingForDelivery: string[];
  shippingLoading: boolean;
  shippingMethods: ShippingMethod[];
  shippingError: string | null;
  selectedShippingId: string | null;
  isUpdatingDelivery: boolean;
  isProcessingSelection?: boolean;
  isWillCallSelected?: boolean;
  onShippingMethodSelect: (methodId: string) => void;
  onRetryShippingMethods?: () => void;
}

export default function DeliveryMethodSection({
  checkoutId,
  canShowDeliveryMethods,
  hasCompleteShippingInfo,
  missingForDelivery,
  shippingLoading,
  shippingMethods,
  shippingError,
  selectedShippingId,
  isUpdatingDelivery,
  isProcessingSelection = false,
  isWillCallSelected = false,
  onShippingMethodSelect,
  onRetryShippingMethods,
}: DeliveryMethodSectionProps) {
  if (!checkoutId) {
    return null;
  }

  // Filter shipping methods: if "Free Shipping" is available, only show that one
  const filteredShippingMethods = (() => {
    const freeShippingMethod = shippingMethods.find(method => 
      method.name?.toLowerCase().includes('free shipping') && method.price?.amount === 0
    );
    
    if (freeShippingMethod) {
      return [freeShippingMethod];
    }
    
    return shippingMethods;
  })();

  return (
    <div>
      <h2 className="text-base font-semibold font-secondary text-[var(--color-secondary-800)] mb-3 uppercase">
        Delivery Method{" "}
        {!isWillCallSelected && (isUpdatingDelivery || shippingLoading || isProcessingSelection) && (
          <span className="ml-2 text-xs text-gray-500">(updating…)</span>
        )}
      </h2>

      {/* Show delivery methods directly */}
      {(
        <>
          {!canShowDeliveryMethods && (
            <div className="text-xs font-secondary text-[var(--color-secondary-600)] bg-[var(--color-secondary-100)] border border-[var(--color-secondary-200)] p-2  flex items-start gap-2">
              <span>{InfoIcon}</span>
              <p>
                Delivery methods will be available once you complete the shipping
                address.{" "}
                {!hasCompleteShippingInfo && missingForDelivery.length > 0 && (
                  <span>Missing: {missingForDelivery.join(", ")}</span>
                )}
              </p>
            </div>
          )}


          {!shippingLoading && !isUpdatingDelivery && shippingError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
          <p className="font-medium">
            {shippingError.includes("postal code") 
              ? "Address Validation Error"
              : shippingError.includes("session") || shippingError.includes("expired") || shippingError.includes("timeout") 
              ? "Session Issue"
              : "Delivery Method Error"}
          </p>
          <p className="text-xs mt-1">{shippingError}</p>
          
          {(shippingError.includes("session") || 
            shippingError.includes("expired") || 
            shippingError.includes("timeout") ||
            shippingError.includes("network") ||
            shippingError.includes("Failed to fetch")) && (
            <div className="mt-3">
              <p className="text-xs text-gray-600 mb-2">
                This might be due to a session timeout or network issue. Please try refreshing or retrying.
              </p>
              {onRetryShippingMethods && (
                <div className="flex gap-2">
                  <button
                    onClick={onRetryShippingMethods}
                    disabled={shippingLoading || isUpdatingDelivery}
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {shippingLoading ? "Retrying..." : "Retry"}
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    disabled={shippingLoading || isUpdatingDelivery}
                    className="px-3 py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Refresh Page
                  </button>
                </div>
              )}
            </div>
          )}
          
          {shippingError.includes("not applicable") && (
            <p className="text-xs mt-2 text-gray-600">
              This can happen if the shipping method does not support your
              address, product&apos;s weight/size, or geographic region.
            </p>
          )}
          
          {shippingError.includes("no longer available") && (
            <div className="mt-3">
              <p className="text-xs text-gray-600 mb-2">
                The selected shipping method is no longer available. This can happen if inventory or shipping options have changed.
              </p>
              {onRetryShippingMethods && (
                <button
                  onClick={onRetryShippingMethods}
                  disabled={shippingLoading || isUpdatingDelivery}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {shippingLoading ? "Refreshing..." : "Refresh Methods"}
                </button>
              )}
            </div>
          )}
            </div>
          )}

          {((!shippingLoading &&
            !isUpdatingDelivery &&
            filteredShippingMethods.length > 0 &&
            !shippingError &&
            canShowDeliveryMethods) || 
            (isWillCallSelected && filteredShippingMethods.length > 0)) && (
            <div>
            {/* Show message when free shipping is available */}
            {shippingMethods.length > filteredShippingMethods.length && (
              <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
                <p className="font-medium">Free Shipping Available!</p>
                <p className="text-xs mt-1">
                  Your order qualifies for free shipping.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredShippingMethods.map((m) => {
              const daysLabel =
                m.minimumDeliveryDays != null && m.maximumDeliveryDays != null
                  ? `${m.minimumDeliveryDays}-${m.maximumDeliveryDays} days`
                  : undefined;

              const isDisabled = isUpdatingDelivery || shippingLoading || isProcessingSelection;

              return (
                <label
                  key={m.id}
                  className={`flex items-center gap-3 ring-1 p-2 transition-all duration-200 ${
                    isDisabled ? "cursor-not-allowed opacity-50 pointer-events-none" : "cursor-pointer"
                  } ${
                    selectedShippingId === m.id
                      ? "ring-[var(--color-primary-100)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)] accent-[var(--color-primary-600)]"
                      : "ring-gray-300 hover:bg-gray-50"
                  } ${isDisabled ? "" : "hover:bg-gray-50"}`}
                >
                  <input
                    type="radio"
                    name="delivery"
                    disabled={isDisabled}
                    checked={selectedShippingId === m.id}
                    onChange={() => !isDisabled && onShippingMethodSelect(m.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-base/none font-secondary">
                      {m.name}
                    </div>
                    {daysLabel && (
                      <div className="text-xs text-gray-500">{daysLabel}</div>
                    )}
                  </div>
                  <div className="font-medium text-base/none">
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: m.price.currency,
                    }).format(m.price.amount)}
                  </div>
                </label>
              );
            })}
            </div>
            </div>
          )}

          {!shippingLoading &&
            !isUpdatingDelivery &&
            !shippingError &&
            filteredShippingMethods.length === 0 &&
            canShowDeliveryMethods && (
          <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="font-medium text-yellow-800">
              No delivery methods found
            </p>
            <p className="text-xs mt-1">
              No shipping methods are available for this address. This could be
              due to:
            </p>
            <ul className="text-xs mt-2 list-disc list-inside text-gray-600">
              <li>Invalid or incomplete address</li>
              <li>No shipping zones configured for this location</li>
              <li>Address verification issues</li>
            </ul>
            <p className="text-xs mt-2 text-gray-500">
              Try updating your address or contact support if the issue
              persists.
            </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
