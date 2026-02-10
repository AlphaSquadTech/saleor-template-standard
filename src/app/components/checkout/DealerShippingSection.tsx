"use client";

import { useState, useEffect } from 'react';
import { useDealerLocations } from '@/app/hooks/useDealerLocations';
import { SearchIcon } from '@/app/utils/svgs/searchIcon';
import ModalLayout from '@/app/components/reuseableUI/modalLayout';
import CommonButton from '@/app/components/reuseableUI/commonButton';

interface DealerShippingOption {
  id: string;
  name: string;
  address: {
    streetAddress1?: string;
    city?: string;
    postalCode?: string;
    country?: { country?: string; code?: string };
  };
  phone?: string;
  distance?: string;
  hours?: string;
  comments?: string;
  state?: string;
}

interface DealerShippingSectionProps {
  isShipToDealer: boolean;
  onShippingTypeChange: (isShipToDealer: boolean) => void;
  selectedDealer: DealerShippingOption | null;
  onDealerSelect: (dealer: DealerShippingOption | null) => void;
}

export default function DealerShippingSection({
  isShipToDealer,
  onShippingTypeChange,
  selectedDealer,
  onDealerSelect
}: DealerShippingSectionProps) {
  const {
    sortedDealers,
    nearestDealer,
    userLocation,
    loading,
    locationError,
    isGettingLocation,
    requestUserLocation
  } = useDealerLocations();
  const [showDealerSelection, setShowDealerSelection] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasTriedLocation, setHasTriedLocation] = useState(false);

  // Filter dealers based on search term
  const filteredDealers = sortedDealers.filter(dealer => 
    dealer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dealer.address?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dealer.address?.streetAddress1?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle ship to dealer toggle
  const handleShipToDealerChange = async (checked: boolean) => {
    onShippingTypeChange(checked);
    
    if (checked) {
      setShowDealerSelection(true);
      
      // If we haven't tried getting location yet, attempt it
      if (!hasTriedLocation && !userLocation) {
        setHasTriedLocation(true);
        try {
          await requestUserLocation();
        } catch {
          // Location denied or failed, show manual selection
          console.log('Location access declined, showing manual selection');
        }
      }
    } else {
      setShowDealerSelection(false);
      onDealerSelect(null);
    }
  };

  // Auto-select nearest dealer when location is available
  useEffect(() => {
    if (isShipToDealer && nearestDealer && !selectedDealer && userLocation) {
      const dealerOption: DealerShippingOption = {
        id: nearestDealer.id,
        name: nearestDealer.name,
        address: nearestDealer.address || {},
        phone: nearestDealer.phone,
        distance: nearestDealer.distance,
        hours: nearestDealer.hours,
        comments: nearestDealer.comments,
        state: nearestDealer.state
      };
      onDealerSelect(dealerOption);
    }
  }, [isShipToDealer, nearestDealer, selectedDealer, userLocation, onDealerSelect]);

  const handleDealerSelect = (dealer: typeof sortedDealers[0]) => {
    const dealerOption: DealerShippingOption = {
      id: dealer.id,
      name: dealer.name,
      address: dealer.address || {},
      phone: dealer.phone,
      distance: dealer.distance,
      hours: dealer.hours,
      comments: dealer.comments,
      state: dealer.state
    };
    onDealerSelect(dealerOption);
    setShowDealerSelection(false);
  };

  return (
    <div>
      <h2 className="text-base font-semibold font-secondary text-[var(--color-secondary-800)] mb-3 uppercase">
        Shipping Options
      </h2>

      <div className="grid-cols-2 grid gap-2">
        {/* Standard Shipping Option */}
        <label className={`flex items-start gap-3 ring-1 p-2 cursor-pointer ${
          !isShipToDealer
            ? "ring-[var(--color-primary-100)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
            : "ring-gray-300 hover:bg-gray-50"
        }`}>
          <input
            type="radio"
            name="shippingType"
            checked={!isShipToDealer}
            onChange={() => handleShipToDealerChange(false)}
            className="mt-1 accent-[var(--color-primary-600)]"
          />
          <div className="flex-1">
            <div className="font-medium text-base font-secondary text-black">
              Ship to My Address
            </div>
            {/* <div className="text-sm text-[var(--color-secondary-600)] mt-1">
              Standard shipping to your provided address
            </div> */}
          </div>
        </label>

        {/* Ship to Dealer Option */}
        <label className={`flex items-start gap-3 ring-1 p-2 cursor-pointer ${
          isShipToDealer
            ? "ring-[var(--color-primary-100)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
            : "ring-gray-300 hover:bg-gray-50"
        }`}>
          <input
            type="radio"
            name="shippingType"
            checked={isShipToDealer}
            onChange={() => handleShipToDealerChange(true)}
            className="mt-1 accent-[var(--color-primary-600)]"
          />
          <div className="flex-1">
            <div className="font-medium text-base font-secondary text-black">
              Ship to Dealer
            </div>
            {/* <div className="text-sm text-[var(--color-secondary-600)] mt-1">
            Ship to your nearest dealer for pickup
            </div> */}
            {isShipToDealer && selectedDealer && (
              <div className="mt-3 p-3 bg-white rounded border border-[var(--color-secondary-200)]">
                <div className="font-medium text-sm">{selectedDealer.name}</div>
                <div className="text-sm text-[var(--color-secondary-600)]">
                  {selectedDealer.address.streetAddress1}
                  <br />
                  {selectedDealer.address.city}, {selectedDealer.address.country?.code} {selectedDealer.address.postalCode}
                </div>
                {selectedDealer.distance && selectedDealer.distance !== 'N/A' && (
                  <div className="text-sm text-green-600 font-medium mt-1">
                    Distance: {selectedDealer.distance}
                  </div>
                )}
                {selectedDealer.phone && (
                  <div className="text-sm text-[var(--color-secondary-600)]">
                    Phone: {selectedDealer.phone}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowDealerSelection(true)}
                  className="text-sm text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] mt-2 underline"
                >
                  Change Dealer
                </button>
              </div>
            )}
            {isShipToDealer && !selectedDealer && (
              <div className="mt-3 p-3 bg-white rounded border border-[var(--color-secondary-200)]">
                <div className="text-sm text-[var(--color-secondary-600)] mb-2">
                  Please select a dealer for pickup
                </div>
                <button
                  type="button"
                  onClick={() => setShowDealerSelection(true)}
                  className="text-sm bg-[var(--color-secondary-100)] cursor-pointer text-black px-3 py-1 rounded hover:bg-[var(--color-primary-700)]"
                >
                  Select Dealer
                </button>
              </div>
            )}
          </div>
        </label>
      </div>

      {/* Dealer Selection Modal */}
      <ModalLayout
        isModalOpen={showDealerSelection}
        onClose={() => setShowDealerSelection(false)}
        heading="Select a Dealer"
        className="lg:max-w-4xl"
      >
        <div className="mt-10 space-y-6">
          {/* Location Status Cards */}
          <div className="space-y-4">
            {!userLocation && !locationError && (
              <div className="p-2 bg-[var(--color-secondary-100)] border border-[var(--color-secondary-200)] rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-[var(--color-secondary-800)] font-secondary">
                      Enable location for distance calculations
                    </div>
                    <div className="text-sm text-[var(--color-secondary-600)] mt-1">
                      We&apos;ll show dealers nearest to you first
                    </div>
                  </div>
                  <CommonButton
                    variant="primary"
                    content={isGettingLocation ? 'Getting...' : 'Allow Location'}
                    onClick={requestUserLocation}
                    disabled={isGettingLocation}
                    className="text-sm py-2 px-4"
                  />
                </div>
              </div>
            )}

            {locationError && (
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                <div className="text-sm text-yellow-800 font-secondary font-medium">{locationError}</div>
                <div className="text-sm text-yellow-600 mt-1">
                  You can still browse all dealers below
                </div>
              </div>
            )}

            {userLocation && (
              <div className="p-2 bg-green-50 border border-green-200 rounded">
                <div className="text-sm text-green-800 font-secondary font-medium">
                  ✓ Using your location - dealers are sorted by distance
                </div>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <label className="block text-sm font-medium text-[var(--color-secondary-800)] pb-2 uppercase font-secondary">
              Search Dealers
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by dealer name, city, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-10 pr-4 text-sm border border-[var(--color-secondary-200)] bg-white rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-600)] font-secondary"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <span className="w-4 h-4 block text-[var(--color-secondary-600)]">
                  {SearchIcon}
                </span>
              </div>
            </div>
          </div>

          {/* Dealer List */}
          <div className="border border-[var(--color-secondary-200)] rounded bg-white">
            {loading && (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary-600)] mx-auto"></div>
                <div className="mt-2 text-sm text-[var(--color-secondary-600)] font-secondary">Loading dealers...</div>
              </div>
            )}

            {!loading && filteredDealers.length === 0 && (
              <div className="p-8 text-center">
                <div className="text-sm text-[var(--color-secondary-600)] font-secondary">
                  {searchTerm ? `No dealers found matching "${searchTerm}"` : 'No dealers available'}
                </div>
              </div>
            )}

            {!loading && filteredDealers.length > 0 && (
              <div className="max-h-96 overflow-y-auto">
                {filteredDealers.map((dealer, index) => (
                  <div
                    key={dealer.id}
                    className={`p-2 hover:bg-[var(--color-secondary-50)] cursor-pointer transition-colors ${
                      index !== filteredDealers.length - 1 ? 'border-b border-[var(--color-secondary-200)]' : ''
                    }`}
                    onClick={() => handleDealerSelect(dealer)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-[var(--color-secondary-900)] font-secondary">
                          {dealer.name}
                        </div>
                        <div className="text-sm text-[var(--color-secondary-600)] mt-1">
                          {dealer.address?.streetAddress1}
                          <br />
                          {dealer.address?.city}, {dealer.state || dealer.address?.country?.code} {dealer.address?.postalCode}
                        </div>
                        {dealer.phone && (
                          <div className="text-sm text-[var(--color-secondary-600)] mt-1">
                            <span className="font-medium">Phone:</span> {dealer.phone}
                          </div>
                        )}
                        {dealer.hours && (
                          <div className="text-sm text-[var(--color-secondary-600)]">
                            <span className="font-medium">Hours:</span> {dealer.hours}
                          </div>
                        )}
                      </div>
                      <div className="ml-4 text-right flex flex-col items-end gap-2">
                        {dealer.distance && dealer.distance !== 'N/A' && (
                          <div className="text-sm font-medium text-green-600 font-secondary">
                            {dealer.distance}
                          </div>
                        )}
                        <CommonButton
                          variant="primary"
                          content="Select"
                          className="text-xs py-1 px-3"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-4">
            <CommonButton
              variant="secondary"
              content="Cancel"
              onClick={() => setShowDealerSelection(false)}
              className="w-full text-sm md:text-base py-2.5 md:py-3"
            />
          </div>
        </div>
      </ModalLayout>
    </div>
  );
}