"use client";

import { PhoneInput } from "react-international-phone";
import Input from "../reuseableUI/input";
import Select from "../reuseableUI/select";
import { SwiperArrowIconLeft } from "@/app/utils/svgs/swiperArrowIconLeft";
import { PlusIcon } from "@/app/utils/svgs/plusIcon";
import CommonButton from "../reuseableUI/commonButton";
import { AddressForm } from "@/graphql/types/checkout";
import { MeAddressesData } from "@/graphql/queries/meAddresses";
import AddNewAddressModal from "@/app/checkout/components/addNewAddressModal";
import { useState, useMemo } from "react";
import { Country, State } from "country-state-city";

interface AddressInfo {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  email: string;
  phone: string;
  country: string;
}

interface AddressManagementProps {
  isLoggedIn: boolean;
  // Guest user props
  shippingInfo: AddressInfo;
  billingInfo: AddressInfo;
  useShippingAsBilling: boolean;
  onShippingChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  onBillingChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  onUseShippingAsBillingChange: (checked: boolean) => void;
  onShippingPhoneChange: (phone: string) => void;
  onBillingPhoneChange: (phone: string) => void;

  // Logged-in user props
  meData?: MeAddressesData;
  formData: AddressForm;
  setFormData: React.Dispatch<React.SetStateAction<AddressForm>>;
  selectedAddressId: string | null;
  setSelectedAddressId: (id: string | null) => void;
  selectedBillingAddressId: string | null;
  setSelectedBillingAddressId: (id: string | null) => void;
  onAddressAdded: () => Promise<void>;
  onSetDefaultAddress: (
    addressId: string,
    type: "SHIPPING" | "BILLING"
  ) => Promise<void>;
}

// Extract the LoggedInAddressSelector component
function LoggedInAddressSelector({
  meData,
  selectedAddressId,
  setSelectedAddressId,
  onAdded,
  formData,
  setFormData,
  title = "SHIPPING DETAILS",
  groupName = "accountAddress",
  handleSetDefaultAddress,
}: {
  meData: MeAddressesData | undefined;
  selectedAddressId: string | null;
  setSelectedAddressId: (id: string | null) => void;
  onAdded: () => Promise<void> | void;
  formData: AddressForm;
  setFormData: React.Dispatch<React.SetStateAction<AddressForm>>;
  title?: string;
  groupName?: "accountAddress" | "billingAddress";
  handleSetDefaultAddress?: (
    addressId: string,
    type: "SHIPPING" | "BILLING"
  ) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const me = meData?.me;
  const defaultShippingId = me?.defaultShippingAddress?.id;
  const defaultBillingId = me?.defaultBillingAddress?.id;

  const [getMethods] = useState({
    defaultShippingId: defaultShippingId || null,
    defaultBillingId: defaultBillingId || null,
  });

  const handleAddNewAddress = () => {
    setShowForm(true);
    setFormData({
      firstName: "",
      lastName: "",
      phone: "",
      streetAddress1: "",
      city: "",
      postalCode: "",
      country: "US",
      countryArea: "",
      companyName: "",
      streetAddress2: "",
    });
  };

  const handleEdit = (
    addr: NonNullable<MeAddressesData["me"]>["addresses"][number]
  ) => {
    setEditingId(addr.id);
    setFormData({
      id: addr.id,
      firstName: addr.firstName,
      lastName: addr.lastName,
      phone: addr.phone || "",
      companyName: addr.companyName || "",
      streetAddress1: addr.streetAddress1,
      streetAddress2: addr.streetAddress2 || "",
      city: addr.city,
      postalCode: addr.postalCode,
      country: addr.country.code,
      countryArea: addr.countryArea || "",
    });
    setShowForm(true);
  };

  const handleAddressSelect = async (
    addr: NonNullable<MeAddressesData["me"]>["addresses"][number]
  ) => {
    setSelectedAddressId(addr.id);
    if (!handleSetDefaultAddress) return;
    try {
      if (groupName === "accountAddress") {
        await handleSetDefaultAddress(addr.id, "SHIPPING");
      } else if (groupName === "billingAddress") {
        await handleSetDefaultAddress(addr.id, "BILLING");
      }
    } catch (error) {
      console.error("Error setting default address:", error);
    }
  };

  return (
    <>
      <div>
        <h2 className="text-base font-semibold font-secondary text-[var(--color-secondary-800)] mb-3 uppercase">
          {title}
        </h2>
        <div className=" grid grid-cols-2 gap-2">
          {meData?.me?.addresses?.map((addr) => (
            <div
              onClick={() => handleAddressSelect(addr)}
              key={addr.id}
              className={`border flex justify-between w-full items-center px-4 py-2 cursor-pointer ${
                selectedAddressId === addr.id
                  ? "border-[var(--color-primary-100)] bg-[var(--color-primary-50)]"
                  : "border-[var(--color-secondary-200)] bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name={groupName}
                  className="mt-1 accent-[var(--color-primary-600)]"
                  checked={selectedAddressId === addr.id}
                  onChange={() => handleAddressSelect(addr)}
                />
                <div className="font-secondary text-sm text-gray-800 space-y-1">
                  <div className="font-medium">{addr.companyName}</div>
                  <div className="flex items-center gap-1 font-medium text-sm  text-[var(--color-secondary-800)]">
                    {addr.streetAddress1} {addr.city}{" "}
                    {addr.countryArea ? `, ${addr.countryArea}` : ""}{" "}
                    {addr.postalCode} {addr.country?.country}
                  </div>
                  <div className="text-[var(--color-secondary-800)] text-sm  font-normal">
                    {addr.phone && (
                      <div className="text-gray-600">{addr.phone}</div>
                    )}
                  </div>
                </div>
              </div>
              <CommonButton
                variant="tertiary"
                className="text-sm p-0"
                onClick={() => handleEdit(addr)}
              >
                Edit
              </CommonButton>
            </div>
          ))}
          {meData?.me?.addresses?.length === 0 && (
            <div className="text-sm text-gray-600">
              No addresses yet. Click below to add your first address.
            </div>
          )}
        </div>

        <button
          onClick={handleAddNewAddress}
          className="mt-4 text-[var(--color-secondary-800)] underline underline-offset-4 uppercase transition-all ease-in-out duration-300 cursor-pointer font-semibold hover:text-[var(--color-primary-600)] text-sm font-secondary"
        >
          <div className="flex items-center gap-2">
            <span className="size-5 text-[var(--color-primary-600)]">
              {PlusIcon}
            </span>
            <p>
              {meData?.me?.addresses?.length === 0
                ? "Add Address"
                : "Add New Address"}
            </p>
          </div>
        </button>
      </div>
      <AddNewAddressModal
        getMethods={getMethods}
        editingId={editingId}
        isModalOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingId(null);
        }}
        formData={formData}
        setFormData={setFormData}
        onAddressAdded={onAdded}
      />
    </>
  );
}

export default function AddressManagement({
  isLoggedIn,
  shippingInfo,
  billingInfo,
  useShippingAsBilling,
  onShippingChange,
  onBillingChange,
  onUseShippingAsBillingChange,
  onShippingPhoneChange,
  onBillingPhoneChange,
  meData,
  formData,
  setFormData,
  selectedAddressId,
  setSelectedAddressId,
  selectedBillingAddressId,
  setSelectedBillingAddressId,
  onAddressAdded,
  onSetDefaultAddress,
}: AddressManagementProps) {
  // Country and state options for guest users
  const countryOptions = useMemo(() => {
    return Country.getAllCountries().map((country) => ({
      value: country.isoCode,
      label: country.name,
    }));
  }, []);

  const shippingStateOptions = useMemo(() => {
    if (!shippingInfo.country) return [];
    return State.getStatesOfCountry(shippingInfo.country).map((state) => ({
      value: state.isoCode, // Use state abbreviation like "NY", "CA"
      label: state.name,
    }));
  }, [shippingInfo.country]);

  const billingStateOptions = useMemo(() => {
    if (!billingInfo.country) return [];
    return State.getStatesOfCountry(billingInfo.country).map((state) => ({
      value: state.isoCode, // Use state abbreviation like "NY", "CA"
      label: state.name,
    }));
  }, [billingInfo.country]);
  if (!isLoggedIn) {
    return (
      <div>
        <p className="text-base font-semibold font-secondary text-[var(--color-secondary-800)] mb-3">
          SHIPPING DETAILS
        </p>
        <div className="space-y-4 md:space-y-2 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              name="firstName"
              type="text"
              value={shippingInfo.firstName}
              onChange={onShippingChange}
              required
              className="py-2"
            />
            <Input
              label="Last Name"
              name="lastName"
              type="text"
              value={shippingInfo.lastName}
              onChange={onShippingChange}
              required
              className="py-2"
            />
          </div>
          <Input
            label="Street Address"
            name="address"
            type="text"
            value={shippingInfo.address}
            onChange={onShippingChange}
            required
            className="py-2"
          />
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[var(--color-secondary-800)] pb-2 uppercase">
              Phone Number
            </label>
            <div className="relative">
              <PhoneInput
                required
                name="phoneNumber"
                defaultCountry="us"
                value={shippingInfo.phone}
                className="text-sm font-normal font-secondary text-[var(--color-secondary-800)] flex h-9 w-full !bg-white [&>div>button>div]:flex [&>div>button>div]:gap-3 [&>div>button]:!h-full [&>div>button>div>img]:!w-9 [&>div>button>div>img]:!pl-4 [&>div>button]:!w-[95px] [&>div>button]:border [&>div>button]:cursor-pointer [&>div>button]:border-[var(--color-secondary-200)] [&>input]:border [&>input]:border-[var(--color-secondary-200)] [&>div>button]:mr-1.5 [&>div>button]:border-r-dot-black-200 [&>div>button]:!bg-white [&>div]:!h-full [&>input]:!h-full [&>input]:w-full [&>input]:!bg-white [&>input]:px-4 [&>input]:py-3 [&>input]:outline-none"
                onChange={onShippingPhoneChange}
              />
              <div className="size-4 text-[var(--color-primary-600)] absolute left-14 rotate-[270deg] top-1/2 -translate-y-1/2 pointer-events-none">
                {SwiperArrowIconLeft}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Select
              label="Country"
              name="country"
              value={shippingInfo.country}
              options={countryOptions}
              onChange={(e) => {
                // Create a synthetic event that matches the expected signature
                const syntheticEvent = {
                  target: {
                    name: "country",
                    value: e.target.value,
                  },
                } as React.ChangeEvent<HTMLInputElement>;
                onShippingChange(syntheticEvent);

                // Also clear the state when country changes
                const stateEvent = {
                  target: {
                    name: "state",
                    value: "",
                  },
                } as React.ChangeEvent<HTMLInputElement>;
                onShippingChange(stateEvent);
              }}
              required
              className="py-2"
            />
            <Select
              label="State"
              name="state"
              value={shippingInfo.state}
              options={shippingStateOptions}
              onChange={onShippingChange}
              disabled={!shippingInfo.country}
              required
              className="py-2"
            />
            <Input
              label="ZIP / Postal Code"
              name="zipCode"
              type="text"
              value={shippingInfo.zipCode}
              onChange={onShippingChange}
              required
              className="py-2"
            />
            <Input
              label="City"
              name="city"
              type="text"
              value={shippingInfo.city}
              onChange={onShippingChange}
              required
              className="py-2"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 cursor-pointer mt-8">
          <input
            id="useShippingAsBilling"
            type="checkbox"
            className="accent-[var(--color-primary-600)]"
            checked={useShippingAsBilling}
            onChange={(e) => onUseShippingAsBillingChange(e.target.checked)}
          />
          <label
            htmlFor="useShippingAsBilling"
            className="text-base font-normal text-[var(--color-secondary-600)] select-none"
          >
            Use shipping address as billing address.
          </label>
        </div>

        {!useShippingAsBilling && (
          <div>
            <p className="text-base font-semibold font-secondary text-[var(--color-secondary-800)] mt-6 mb-3 md:mb-5 lg:mt-8">
              BILLING DETAILS
            </p>
            <div className="space-y-4 md:space-y-2 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  name="firstName"
                  type="text"
                  value={billingInfo.firstName}
                  onChange={onBillingChange}
                  required
                  className="py-2"
                />
                <Input
                  label="Last Name"
                  name="lastName"
                  type="text"
                  value={billingInfo.lastName}
                  onChange={onBillingChange}
                  required
                  className="py-2"
                />
              </div>
              <Input
                label="Street Address"
                name="address"
                type="text"
                value={billingInfo.address}
                onChange={onBillingChange}
                required
                className="py-2"
              />
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--color-secondary-800)] pb-2 uppercase">
                  Phone Number
                </label>
                <div className="relative">
                  <PhoneInput
                    required
                    name="phone"
                    defaultCountry="us"
                    value={billingInfo.phone}
                    className="text-sm font-normal font-secondary text-[var(--color-secondary-800)] flex h-9 w-full !bg-white [&>div>button>div]:flex [&>div>button>div]:gap-3 [&>div>button]:!h-full [&>div>button>div>img]:!w-9 [&>div>button>div>img]:!pl-4 [&>div>button]:!w-[95px] [&>div>button]:border [&>div>button]:cursor-pointer [&>div>button]:border-[var(--color-secondary-200)] [&>input]:border [&>input]:border-[var(--color-secondary-200)] [&>div>button]:mr-1.5 [&>div>button]:border-r-dot-black-200 [&>div>button]:!bg-white [&>div]:!h-full [&>input]:!h-full [&>input]:w-full [&>input]:!bg-white [&>input]:px-4 [&>input]:py-3 [&>input]:outline-none"
                    onChange={onBillingPhoneChange}
                  />
                  <div className="size-4 text-[var(--color-primary-600)] absolute left-14 rotate-[270deg] top-1/2 -translate-y-1/2 pointer-events-none">
                    {SwiperArrowIconLeft}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Select
                  label="Country"
                  name="country"
                  value={billingInfo.country}
                  options={countryOptions}
                  onChange={(e) => {
                    // Create a synthetic event that matches the expected signature
                    const syntheticEvent = {
                      target: {
                        name: "country",
                        value: e.target.value,
                      },
                    } as React.ChangeEvent<HTMLInputElement>;
                    onBillingChange(syntheticEvent);

                    // Also clear the state when country changes
                    const stateEvent = {
                      target: {
                        name: "state",
                        value: "",
                      },
                    } as React.ChangeEvent<HTMLInputElement>;
                    onBillingChange(stateEvent);
                  }}
                  required
                  className="py-2"
                />
                <Select
                  label="State"
                  name="state"
                  value={billingInfo.state}
                  options={billingStateOptions}
                  onChange={onBillingChange}
                  disabled={!billingInfo.country}
                  required
                  className="py-2"
                />
                <Input
                  label="ZIP / Postal Code"
                  name="zipCode"
                  type="text"
                  value={billingInfo.zipCode}
                  onChange={onBillingChange}
                  required
                  className="py-2"
                />
                <Input
                  label="City"
                  name="city"
                  type="text"
                  value={billingInfo.city}
                  onChange={onBillingChange}
                  required
                  className="py-2"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Shipping Address Selector for logged-in users */}
      <LoggedInAddressSelector
        meData={meData}
        formData={formData}
        setFormData={setFormData}
        selectedAddressId={selectedAddressId}
        setSelectedAddressId={setSelectedAddressId}
        onAdded={onAddressAdded}
        handleSetDefaultAddress={onSetDefaultAddress}
      />

      {/* Toggle + Billing selector for logged-in users */}
      <div className="flex items-center gap-2 cursor-pointer">
        <input
          id="useShippingAsBilling_logged"
          type="checkbox"
          className="accent-[var(--color-primary-600)]"
          checked={useShippingAsBilling}
          onChange={(e) => onUseShippingAsBillingChange(e.target.checked)}
        />
        <label
          htmlFor="useShippingAsBilling_logged"
          className="text-base font-normal text-[var(--color-secondary-600)] select-none cursor-pointer"
        >
          Use shipping address as billing address.
        </label>
      </div>

      {!useShippingAsBilling && (
        <LoggedInAddressSelector
          formData={formData}
          setFormData={setFormData}
          meData={meData}
          selectedAddressId={selectedBillingAddressId}
          setSelectedAddressId={setSelectedBillingAddressId}
          onAdded={onAddressAdded}
          title="Billing Address"
          groupName="billingAddress"
          handleSetDefaultAddress={onSetDefaultAddress}
        />
      )}
    </div>
  );
}
