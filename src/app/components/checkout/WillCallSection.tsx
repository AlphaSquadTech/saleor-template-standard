"use client";

import { CollectionPoint } from "@/graphql/queries/willCallCollectionPoints";

interface WillCallSectionProps {
  checkoutId: string | null | undefined;
  willCallEnabled: boolean;
  collectionPoints: CollectionPoint[];
  selectedCollectionPointId: string | null;
  isUpdatingDelivery: boolean;
  isProcessingSelection?: boolean;
  onCollectionPointSelect: (collectionPointId: string) => void;
  userState: string | null;
  willCallLoading?: boolean;
  willCallError?: string | null;
}

export default function WillCallSection({
  checkoutId,
  willCallEnabled,
  collectionPoints,
  selectedCollectionPointId,
  isUpdatingDelivery,
  isProcessingSelection = false,
  onCollectionPointSelect,
  userState,
  willCallLoading = false,
  willCallError = null,
}: WillCallSectionProps) {
  if (!checkoutId || !willCallEnabled) {
    return null;
  }

  // Filter collection points to match user's state
  const availableCollectionPoints = collectionPoints.filter(
    (point) => point.address.countryArea === userState
  );

  // Don't show will-call if no matching collection points
  if (availableCollectionPoints.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h2 className="text-base font-semibold font-secondary text-[var(--color-secondary-800)] mb-3 uppercase">
        Local Pickup (Will Call)
        {(isUpdatingDelivery || willCallLoading || isProcessingSelection) && (
          <span className="ml-2 text-xs text-gray-500">(updating…)</span>
        )}
      </h2>

      {/* Collection Points Selection - Direct, no toggle */}
      <div className="mb-3">
      


          {willCallError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3 mb-3">
              <p className="font-medium">Error loading pickup locations</p>
              <p className="text-xs mt-1">{willCallError}</p>
            </div>
          )}
          
          {!willCallLoading && availableCollectionPoints.length === 0 ? (
            <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="font-medium text-yellow-800">
                No pickup locations available in your area
              </p>
              <p className="text-xs mt-1">
                No pickup locations are available for your state ({userState}). 
                Please use regular shipping or contact support.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1  gap-3">
              {availableCollectionPoints.map((point) => {
                const isDisabled = isUpdatingDelivery || willCallLoading || isProcessingSelection;
                
                return (
                <label
                  key={point.id}
                  className={`flex items-center gap-3 ring-1 p-4 transition-all duration-200 ${
                    isDisabled ? "cursor-not-allowed opacity-50 pointer-events-none" : "cursor-pointer"
                  } ${
                    selectedCollectionPointId === point.id
                      ? "ring-[var(--color-primary-100)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)] accent-[var(--color-primary-600)]"
                      : "ring-gray-300 hover:bg-gray-50"
                  } ${isDisabled ? "" : "hover:bg-gray-50"}`}
                >
                  <input
                    type="radio"
                    name="delivery"
                    checked={selectedCollectionPointId === point.id}
                    onChange={() => !isDisabled && onCollectionPointSelect(point.id)}
                    disabled={isDisabled}
                    className="accent-[var(--color-primary-600)]"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-base/none font-secondary mb-2">
                      {point.name}
                    </div>
                    <div className="text-sm text-gray-700 space-y-1">
                      <div className="flex items-start gap-1">
                        <span className="text-gray-500 min-w-0">📍</span>
                        <div className="min-w-0 flex ">
                          <div>{point.address.streetAddress1},</div>
                          <div>{point.address.city}, {point.address.countryArea} {point.address.postalCode},</div>
                          <div className="text-xs text-gray-500">{point.address.country.country}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {point.isPrivate && (
                        <div className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                          Private Location
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="font-medium text-base/none text-green-600">
                    FREE
                  </div>
                </label>
                );
              })}
            </div>
          )}
      </div>

    </div>
  );
}
