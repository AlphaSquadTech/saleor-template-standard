import { ErrorTag } from "@/app/components/reuseableUI/errorTag";
import CommonButton from "@/app/components/reuseableUI/commonButton";
import Input from "@/app/components/reuseableUI/input";
import Select from "@/app/components/reuseableUI/select";
import ModalLayout from "@/app/components/reuseableUI/modalLayout";
import { SwiperArrowIconLeft } from "@/app/utils/svgs/swiperArrowIconLeft";
import { ACCOUNT_ADDRESS_CREATE, type AccountAddressCreateData, type AccountAddressCreateVars } from '@/graphql/mutations/accountAddressCreate';
import { ACCOUNT_ADDRESS_UPDATE, type AccountAddressUpdateData, type AccountAddressUpdateVars } from '@/graphql/mutations/accountAddressUpdate';
import { ACCOUNT_SET_DEFAULT_ADDRESS, type AccountSetDefaultAddressData, type AccountSetDefaultAddressVars } from '@/graphql/mutations/accountSetDefaultAddress';
import { ME_ADDRESSES_QUERY, MeAddressesData } from "@/graphql/queries/meAddresses";
import { AddressForm } from "@/graphql/types/checkout";
import { useMutation, useQuery } from "@apollo/client";
import { useEffect, useState, useMemo } from "react";
import { PhoneInput } from "react-international-phone";
import { cn } from "@/app/utils/functions";
import { Country, State } from 'country-state-city';

const AddNewAddressModal = ({ isModalOpen, onClose, formData, setFormData, editingId, getMethods, onAddressAdded }: { isModalOpen: boolean, onClose: () => void, formData: AddressForm, setFormData: React.Dispatch<React.SetStateAction<AddressForm>>, editingId?: string | null, getMethods?: { defaultShippingId: string | null, defaultBillingId: string | null }, onAddressAdded?: () => Promise<void> | void }) => {
    const { data, error, refetch } = useQuery<MeAddressesData>(ME_ADDRESSES_QUERY, { fetchPolicy: 'cache-and-network' });
    const [createAddress, { loading: creating }] = useMutation<AccountAddressCreateData, AccountAddressCreateVars>(ACCOUNT_ADDRESS_CREATE, {
      refetchQueries: [{ query: ME_ADDRESSES_QUERY }],
    });
    const [updateAddress, { loading: updating }] = useMutation<AccountAddressUpdateData, AccountAddressUpdateVars>(ACCOUNT_ADDRESS_UPDATE, {
      refetchQueries: [{ query: ME_ADDRESSES_QUERY }],
    });
    const [setDefaultAddress, { loading: settingDefault }] = useMutation<AccountSetDefaultAddressData, AccountSetDefaultAddressVars>(ACCOUNT_SET_DEFAULT_ADDRESS);
  const me = data?.me;
  const [currentAddressId, setCurrentAddressId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    country: "",
    countryArea: "",
    city: "",
    streetAddress1: "",
    postalCode: "",
  });
  const [defaultMethods, setDefaultMethods] = useState<{
    billing: boolean;
    shipping: boolean;
  }>({
    billing: false,
    shipping: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const countryOptions = useMemo(() => {
    return Country.getAllCountries().map(country => ({
      value: country.isoCode,
      label: country.name
    }));
  }, []);

  const stateOptions = useMemo(() => {
    if (!formData.country) return [];
    return State.getStatesOfCountry(formData.country).map(state => ({
      value: state.isoCode, // Use state abbreviation like "NY", "CA"
      label: state.name
    }));
  }, [formData.country]);


useEffect(() => {
    setFieldErrors({
      firstName: "",
      lastName: "",
      phone: "",
      country: "",
      countryArea: "",
      city: "",
      streetAddress1: "",
      postalCode: "",
    });
    setApiError(null);
    setDefaultMethods({
      billing: Boolean(formData?.id && getMethods?.defaultBillingId === formData?.id),
      shipping: Boolean(formData?.id && getMethods?.defaultShippingId === formData?.id),
    });
}, [isModalOpen, formData?.id, getMethods?.defaultBillingId, getMethods?.defaultShippingId]);

  const handleValidation = () => {
    setFieldErrors({
      firstName: "",
      lastName: "",
      phone: "",
      country: "",
      countryArea: "",
      city: "",
      streetAddress1: "",
      postalCode: "",
    });

        const errors = 
          {
      firstName: "",
      lastName: "",
      phone: "",
      country: "",
      countryArea: "",
      city: "",
      streetAddress1: "",
      postalCode: "",
    };

    let hasError = false;

    if (!formData.firstName.trim()) {
      errors.firstName = "First name is required.";
      hasError = true;
    }

    if (!formData.lastName.trim()) {
      errors.lastName = "Last name is required.";
      hasError = true;
    } 
    if (!formData.phone?.trim()) {
      errors.phone = "Phone Number is required.";
      hasError = true;
    }
    if (!formData.country?.trim()) {
      errors.country = "Country is required.";
      hasError = true;
    }
    if (!formData.countryArea?.trim()) {
      errors.countryArea = "State is required.";
      hasError = true;
    }
    if (!formData.city?.trim()) {
      errors.city = "City is required.";
      hasError = true;
    }
    if (!formData.streetAddress1?.trim()) {
      errors.streetAddress1 = "Street address is required.";
      hasError = true;
    }

    if (!formData.postalCode?.trim()) {
      errors.postalCode = "Postal code is required.";
      hasError = true;
    }

    setFieldErrors(errors);
    return !hasError;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    const isValid = handleValidation();
    if (!isValid) return;

    setSubmitting(true);
    
    try {
      let addressId = currentAddressId;
      
      if (editingId) {
        const { data } = await updateAddress({
          variables: {
            id: editingId,
            input: {
              firstName: formData.firstName,
              lastName: formData.lastName,
              phone: formData.phone || undefined,
              companyName: formData.companyName || undefined,
              streetAddress1: formData.streetAddress1,
              streetAddress2: formData.streetAddress2 || undefined,
              city: formData.city,
              postalCode: formData.postalCode,
              country: formData.country,
              countryArea: formData.countryArea || undefined,
            }
          }
        });
        
        const errs = data?.accountAddressUpdate.errors || [];
        if (errs.length) {
          setApiError(errs[0]?.message || 'Unable to update address.');
          setSubmitting(false);
          return;
        }
        
        addressId = editingId;
      } else {
        const { data } = await createAddress({
          variables: {
            input: {
              firstName: formData.firstName,
              lastName: formData.lastName,
              phone: formData.phone || undefined,
              companyName: formData.companyName || undefined,
              streetAddress1: formData.streetAddress1,
              streetAddress2: formData.streetAddress2 || undefined,
              city: formData.city,
              postalCode: formData.postalCode,
              country: formData.country,
              countryArea: formData.countryArea || undefined,
            }
          }
        });
        
        const errs = data?.accountAddressCreate.errors || [];
        if (errs.length) {
          setApiError(errs[0]?.message || 'Unable to add address.');
          setSubmitting(false);
          return;
        }
        
        addressId = data?.accountAddressCreate.address?.id || null;
        
        if (!addressId) {
          setApiError('Address was not created successfully.');
          setSubmitting(false);
          return;
        }
      }

      // Handle default address settings
      const defaultPromises = [];
      if (defaultMethods.billing && addressId) {
        defaultPromises.push(
          setDefaultAddress({
            variables: { id: addressId, type: "BILLING" }
          })
        );
      }
      if (defaultMethods.shipping && addressId) {
        defaultPromises.push(
          setDefaultAddress({
            variables: { id: addressId, type: "SHIPPING" }
          })
        );
      }

      if (defaultPromises.length > 0) {
        await Promise.all(defaultPromises);
      }

      await refetch();
      
      // Call the callback to refresh the parent component's address list
      if (onAddressAdded) {
        await onAddressAdded();
      }
      
      onClose();
      
    } catch (error) {
      console.error('Address submission error:', error);
      setApiError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }


  };

  useEffect(() => {
    if (me?.addresses && formData?.id) {
      const match = me.addresses.find((addr) => addr.id === formData.id);
      if (match) {
        setCurrentAddressId(match.id);
      }
    }
  }, [me, formData?.id]);


  return (
    <ModalLayout
      isModalOpen={isModalOpen}
      onClose={onClose}
      heading="Add New Address"
    >
      <form onSubmit={handleSubmit} className="mt-10 space-y-10">
        <div className="space-y-5 w-full font-secondary font-normal text-[var(--color-secondary-600)] text-base">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <Input
                label="First Name"
                name="firstName"
                placeholder="Enter First Name"
                value={formData.firstName}
                onChange={(e) => {
                  const filteredValue = e.target.value.replace(/[^A-Za-z ]/g, "");
                  setFormData((f) => ({ ...f, firstName: filteredValue }));
                }}
                hasError={!!fieldErrors.firstName}
                errorMessage={fieldErrors.firstName}
              />
            </div>
            <Input
              label="Last Name"
              name="lastName"
              placeholder="Enter Last Name"
              value={formData.lastName}
              onChange={(e) => {
                const filteredValue = e.target.value.replace(/[^A-Za-z ]/g, "");
                setFormData((f) => ({ ...f, lastName: filteredValue }));
              }}
              hasError={!!fieldErrors.lastName}
              errorMessage={fieldErrors.lastName}
            />

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--color-secondary-800)] pb-2 uppercase">
                Phone Number
              </label>
              <div className="relative">
                <PhoneInput
                  name="phoneNumber"
                  defaultCountry="us"
                  value={formData.phone}
                  className={cn(
                    "text-sm font-normal font-secondary text-[var(--color-secondary-800)] flex h-12 w-full !bg-white [&>div>button>div]:flex [&>div>button>div]:gap-3 [&>div>button]:!h-full [&>div>button>div>img]:!w-9 [&>div>button>div>img]:!pl-4 [&>div>button]:!w-[95px] [&>div>button]:border [&>div>button]:cursor-pointer [&>input]:border [&>div>button]:mr-1.5 [&>div>button]:border-r-dot-black-200 [&>div>button]:!bg-white [&>div]:!h-full [&>input]:!h-full [&>input]:w-full [&>input]:!bg-white [&>input]:px-4 [&>input]:py-3 [&>input]:outline-none",
                    !!fieldErrors.phone
                      ? "[&>input]:border-[var(--color-primary-600)] [&>div>button]:border-[var(--color-primary-600)]"
                      : "[&>input]:border-[var(--color-secondary-200)] [&>div>button]:border-[var(--color-secondary-200)]"
                  )}
                  onChange={(phone) =>
                    setFormData((f) => ({
                      ...f,
                      phone,
                    }))
                  }
                />
                <div className="size-4 text-[var(--color-primary-600)] absolute left-14 rotate-[270deg] top-1/2 -translate-y-1/2 pointer-events-none">
                  {SwiperArrowIconLeft}
                </div>
              </div>
              {fieldErrors.phone && (
                <div
                  style={{ color: "var(--color-primary-600)" }}
                  className="text-sm leading-5 tracking-[-0.035px] mt-1.5"
                >
                  {fieldErrors.phone}
                </div>
              )}
            </div>
            <Select
              label="Country"
              name="country"
              placeholder="Select Country"
              value={formData.country}
              options={countryOptions}
              onChange={(e) => {
                setFormData((f) => ({ 
                  ...f, 
                  country: e.target.value,
                  countryArea: "",
                  city: ""
                }));
              }}
              hasError={!!fieldErrors.country}
              errorMessage={fieldErrors.country}
            />
            <Select
              label="State"
              name="countryArea"
              placeholder="Select State"
              value={formData.countryArea}
              options={stateOptions}
              onChange={(e) => {
                setFormData((f) => ({ 
                  ...f, 
                  countryArea: e.target.value,
                  city: ""
                }));
              }}
              hasError={!!fieldErrors.countryArea}
              errorMessage={fieldErrors.countryArea}
              disabled={!formData.country}
            />
            <Input
              label="City"
              name="city"
              placeholder="Enter City"
              value={formData.city}
              onChange={(e) =>
                setFormData((f) => ({ ...f, city: e.target.value }))
              }
              hasError={!!fieldErrors.city}
              errorMessage={fieldErrors.city}
              parentClassName="md:col-span-2"
            />
            <Input
              label="Street Address"
              name="streetAddress1"
              placeholder="Enter your Street Address"
              value={formData.streetAddress1}
              onChange={(e) =>
                setFormData((f) => ({ ...f, streetAddress1: e.target.value }))
              }
              parentClassName="md:col-span-2"
              hasError={!!fieldErrors.streetAddress1}
              errorMessage={fieldErrors.streetAddress1}
            />
            <Input
              label="ZIP / POSTAL CODE"
              name="postalCode"
              placeholder="Enter ZIP / Postal Code"
              parentClassName="md:col-span-2"
              value={formData.postalCode}
              onChange={(e) =>
                setFormData((f) => ({ ...f, postalCode: e.target.value }))
              }
              hasError={!!fieldErrors.postalCode}
              errorMessage={fieldErrors.postalCode}
            />
          </div>
          <div className="flex items-center gap-2 select-none">
            <input
              id="defaultBilling"
              type="checkbox"
              checked={defaultMethods.billing}
              onChange={(e) =>
                setDefaultMethods((prev) => ({
                  ...prev,
                  billing: e.target.checked,
                }))
              }
              className="accent-[var(--color-primary-600)] size-4 cursor-pointer"
            />
            <label htmlFor="defaultBilling" className="cursor-pointer">
              Default billing address
            </label>
          </div>

          <div className="flex items-center gap-2 select-none">
            <input
              id="defaultShipping"
              type="checkbox"
              checked={defaultMethods.shipping}
              onChange={(e) =>
                setDefaultMethods((prev) => ({
                  ...prev,
                  shipping: e.target.checked,
                }))
              }
              className="accent-[var(--color-primary-600)] size-4 cursor-pointer"
            />
            <label htmlFor="defaultShipping" className="cursor-pointer">
              Default shipping address
            </label>
          </div>
        </div>
           <div className="flex-col gap-2">
              {error && <ErrorTag message="Failed to load addresses." />}
              {apiError && <ErrorTag message={apiError} />}
            </div>
        <div className="flex flex-col gap-4">
          <CommonButton
            type="submit"
            disabled={submitting || creating || updating || settingDefault}
            variant="primary"
            className="w-full text-sm md:text-base py-2.5 md:py-3 disabled:opacity-50 transition-opacity"
            content={submitting ? "Saving..." : "Save"}
          />
          <CommonButton
            variant="secondary"
            className="w-full text-sm md:text-base py-2.5 md:py-3"
            content="Cancel"
            onClick={() => {
              onClose();
            }}
          />
        </div>
      </form>
    </ModalLayout>
  );
}

export default AddNewAddressModal