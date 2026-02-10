'use client';

import { ME_ADDRESSES_QUERY, type MeAddressesData } from '@/graphql/queries/meAddresses';
import { useMutation, useQuery } from '@apollo/client';

import AddNewAddressModal from '@/app/checkout/components/addNewAddressModal';
import CommonButton from '@/app/components/reuseableUI/commonButton';
import EmptyState from '@/app/components/reuseableUI/emptyState';
import LoadingUI from '@/app/components/reuseableUI/loadingUI';
import { PlusIcon } from '@/app/utils/svgs/plusIcon';
import { ACCOUNT_ADDRESS_DELETE, AccountAddressDeleteData, AccountAddressDeleteVars } from '@/graphql/mutations/accountAddressDelete';
import { AddressForm } from '@/graphql/types/checkout';
import { useEffect, useState } from 'react';
export default function AddressBookPage() {
  const { data, loading, refetch } = useQuery<MeAddressesData>(ME_ADDRESSES_QUERY, { fetchPolicy: 'cache-and-network' });
  const [deleteAddress] = useMutation<AccountAddressDeleteData, AccountAddressDeleteVars>(ACCOUNT_ADDRESS_DELETE);
  const me = data?.me;
  const defaultShippingId = me?.defaultShippingAddress?.id;
  const defaultBillingId = me?.defaultBillingAddress?.id;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [getMethods, setGetMethods] = useState({
    defaultShippingId: defaultShippingId || null,
    defaultBillingId: defaultBillingId || null
  })
  useEffect(() => {
    setGetMethods({
      defaultShippingId: defaultShippingId || null,
      defaultBillingId: defaultBillingId || null
    })
  }, [defaultShippingId, defaultBillingId])
  const [formData, setFormData] = useState<AddressForm>({
    firstName: '',
    lastName: '',
    phone: '',
    companyName: '',
    streetAddress1: '',
    streetAddress2: '',
    city: '',
    postalCode: '',
    country: 'US',
    countryArea: '',
  });
  const handleEdit = (addr: NonNullable<MeAddressesData['me']>['addresses'][number]) => {
    setEditingId(addr.id);
    setFormData({
      id: addr.id,
      firstName: addr.firstName,
      lastName: addr.lastName,
      phone: addr.phone || '',
      companyName: addr.companyName || '',
      streetAddress1: addr.streetAddress1,
      streetAddress2: addr.streetAddress2 || '',
      city: addr.city,
      postalCode: addr.postalCode,
      country: addr.country.code,
      countryArea: addr.countryArea || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { data } = await deleteAddress({ variables: { id } });
      const errs = data?.accountAddressDelete.errors || [];
      if (errs.length) {
        console.log(errs[0]?.message || 'Unable to delete address.');
      } else {
        await refetch();
      }
    } catch {
      console.log('Unable to delete address. Please try again.');
    }
  };
  const handleAddNewAddress = () => {
    setIsModalOpen(true);
    setEditingId(null);
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      companyName: '',
      streetAddress1: '',
      streetAddress2: '',
      city: '',
      postalCode: '',
      country: 'US',
      countryArea: '',
    });
  };
  return (
    <>
      <div>
        <div className='flex items-center justify-between w-full'>
          <h2 className="text-lg lg:text-xl text-[var(--color-secondary-800)] font-secondary font-semibold">MY ADDRESSES</h2>
          <div className="uppercase cursor-pointer flex items-center gap-2" onClick={handleAddNewAddress}>
            <span className="size-5 text-[var(--color-primary-600)]">{PlusIcon}</span>
            <CommonButton variant='tertiary' content="Add New Address" className="p-0 text-sm lg:text-base " />
          </div>
        </div>

        <div className="mt-4">
          {
            loading ? <LoadingUI /> :
              !loading && me?.addresses?.length === 0
                ? <EmptyState text='No Address yet.' className='h-[50vh]' /> :
                <div className='flex flex-col space-y-4 w-full'>
                  {me?.addresses?.map((address) => (
                    <div key={address.id} className=" w-full border-b border-[var(--color-secondary-200)] pb-4 flex flex-col md:flex-row gap-4 justify-between md:items-center ">

                      <div>

                        <div className="absolute top-4 right-4 space-x-2">
                          {defaultShippingId === address.id && (
                            <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded">Default Shipping</span>
                          )}
                          {defaultBillingId === address.id && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">Default Billing</span>
                          )}
                        </div>

                        <div className='space-y-1'>
                          <div className='flex items-center gap-2 text-medium text-lg lg:text-xl font-secondary text-[var(--color-secondary-800)]'>
                            {address.streetAddress1}{address.streetAddress2 ? `, ${address.streetAddress2}` : ''} {" "}
                            {address.city}{address.countryArea ? `, ${address.countryArea}` : ''} {" "}
                            {address.country.country}
                          </div>
                          {address.phone && <p className='text-medium text-lg font-secondary text-[var(--color-secondary-500)]'>{address.phone}</p>}
                        </div>
                        <div className="flex flex-wrap gap-3 pt-2">
                          {defaultShippingId === address.id && (
                            <p className="font-medium text-sm text-[var(--color-secondary-800)] font-secondary bg-[var(--color-secondary-600)]/10 px-2 py-0.5 border border-[var(--color-secondary-600)]/60 h-fit">
                              Default Shipping Address
                            </p>
                          )}
                          {defaultBillingId === address.id && (
                            <p className="font-medium text-sm text-[var(--color-secondary-800)] font-secondary bg-[var(--color-secondary-600)]/10 px-2 py-0.5 border border-[var(--color-secondary-600)]/60 h-fit">
                              Default Billing Address
                            </p>
                          )}
                        </div>
                      </div>
                      <div className='flex ml-auto items-center gap-5 [&>button]:p-0'>
                        <CommonButton
                          onClick={() => handleEdit(address)}
                          className='text-sm md:text-base py-3 px-4'
                          variant='tertiary'
                          content="Edit"
                        />
                        <CommonButton
                          onClick={() => handleDelete(address.id)}
                          className='text-sm md:text-base py-3 px-4'
                          variant='tertiarySecondary'
                          content="Delete"
                        />
                      </div>
                    </div>
                  ))}
                </div>
          }
        </div>
      </div>
      <div className='relative z-20'>
        <AddNewAddressModal isModalOpen={isModalOpen} onClose={() => setIsModalOpen(false)} formData={formData} setFormData={setFormData} editingId={editingId} getMethods={getMethods} />
      </div>
    </>
  );
}
