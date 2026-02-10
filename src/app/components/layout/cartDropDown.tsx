'use client';

import { CHECKOUT_CREATE } from '@/graphql/mutations/checkoutCreate';
import { ME_ADDRESSES_QUERY, type MeAddressesData } from '@/graphql/queries/meAddresses';
import { useGlobalStore } from '@/store/useGlobalStore';
import { useQuery } from '@apollo/client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Breadcrumb from '@/app/components/reuseableUI/breadcrumb';
import CommonButton from '@/app/components/reuseableUI/commonButton';
import EmptyState from '@/app/components/reuseableUI/emptyState';
import { ArrowIcon } from '@/app/utils/svgs/arrowIcon';
import { CartIcon } from '@/app/utils/svgs/cart/cartIcon';
import { PlusIcon } from '@/app/utils/svgs/cart/plusIcon';
import { SubtractIcon } from '@/app/utils/svgs/cart/subtractIcon';
import { gtmBeginCheckout, gtmViewCart, gtmRemoveFromCart, Product } from '@/app/utils/googleTagManager';
import { useAppConfiguration } from '../providers/ServerAppConfigurationProvider';

type CartItemOption = {
    variantId: string;
    name: string;
    price: number;
    optionSetName: string;
    optionSetLabel: string;
};

type CartItem = {
    key: string;
    id: string;
    name: string;
    price: number;
    image: string;
    quantity: number;
    category?: string;
    sku?: string;
    selectedOptions?: CartItemOption[];
    customInputs?: Record<string, string>;
    skipBaseProduct?: boolean;
};

// Helper to calculate item total including options
const getItemTotal = (item: CartItem): number => {
    let total = item.price;
    if (item.selectedOptions?.length) {
        total += item.selectedOptions.reduce((sum, opt) => sum + opt.price, 0);
    }
    return total;
};

export default function CartDropDown() {
    const { cartItems: items, totalItems, totalAmount, removeFromCart, updateQuantity, addToCart, checkoutId, setCheckoutId, setCheckoutToken, isLoggedIn, user, guestEmail, guestShippingInfo, setGuestShippingInfo } = useGlobalStore();
    const { getGoogleTagManagerConfig } = useAppConfiguration();
    const router = useRouter();
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshedItems, setRefreshedItems] = useState<CartItem[]>([]);
    const [refreshedTotals, setRefreshedTotals] = useState({ totalItems: 0, totalAmount: 0 });
    const [pricesRefreshed, setPricesRefreshed] = useState(false);
    const [loadingItems, setLoadingItems] = useState<{ [key: string]: { plus: boolean; minus: boolean; remove: boolean } }>({});

    // When logged in, fetch account addresses
    const { data: meData, loading: meLoading } = useQuery<MeAddressesData>(ME_ADDRESSES_QUERY, { skip: !isLoggedIn });
    const accountShipping = useMemo(() => {
        const me = meData?.me;
        if (!me || !me.addresses?.length) return null;
        const defId = me.defaultShippingAddress?.id;
        return (defId ? me.addresses.find(a => a.id === defId) : me.addresses[0]) || null;
    }, [meData]);
    const accountBilling = useMemo(() => {
        const me = meData?.me;
        if (!me || !me.addresses?.length) return null;
        const defId = me.defaultBillingAddress?.id;
        return (defId ? me.addresses.find(a => a.id === defId) : accountShipping || me.addresses[0]) || null;
    }, [meData, accountShipping]);

    const endpoint = useMemo(() => {
        const raw = process.env.NEXT_PUBLIC_API_URL || '/api/graphql';
        let url = raw.trim();
        if (!/\/graphql\/?$/i.test(url)) url = url.replace(/\/+$/, '') + '/graphql';
        return url;
    }, []);

    const handleCountryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setGuestShippingInfo({ country: value });
    }, [setGuestShippingInfo]);

    // Refresh prices from checkout if available to ensure we show discounted prices
    useEffect(() => {
        const refreshPricesFromCheckout = async () => {
            if (!checkoutId || pricesRefreshed || items.length === 0) return;

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: `
                            query GetCheckoutDetails($id: ID!) {
                                checkout(id: $id) {
                                    id
                                    totalPrice { gross { amount currency } }
                                    subtotalPrice { gross { amount currency } }
                                    lines {
                                        id
                                        quantity
                                        totalPrice { gross { amount currency } }
                                        variant {
                                            id
                                            name
                                            product {
                                                name
                                                thumbnail { url }
                                                pricing {
                                                    discount { gross { amount currency } }
                                                }
                                            }
                                            pricing {
                                                price { gross { amount currency } }
                                            }
                                        }
                                    }
                                }
                            }
                        `,
                        variables: { id: checkoutId }
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    const checkout = data?.data?.checkout;

                    if (checkout?.lines?.length > 0) {

                        type CheckoutLine = {
                            id: string;
                            quantity: number;
                            variant: {
                                id: string;
                                product: {
                                    name: string;
                                    pricing?: {
                                        discount?: {
                                            gross?: {
                                                amount: number;
                                            };
                                        };
                                    };
                                };
                                pricing?: {
                                    price?: {
                                        gross?: {
                                            amount: number;
                                        };
                                    };
                                };
                                name: string;
                            };
                            totalPrice: {
                                gross: {
                                    amount: number;
                                    currency: string;
                                };
                            };
                            name: string;
                        };

                        // Build a map of checkout lines by variant ID for quick lookup
                        const checkoutLinesByVariantId = new Map<string, CheckoutLine>();
                        for (const line of checkout.lines) {
                            checkoutLinesByVariantId.set(line.variant.id, line);
                        }

                        const updatedItems: CartItem[] = items
                            .map((item: CartItem) => {
                                if (item.skipBaseProduct && item.selectedOptions?.length) {
                                    // For items with skipBaseProduct, match using the first selectedOption's variant
                                    const firstOptionLine = checkoutLinesByVariantId.get(item.selectedOptions[0].variantId);
                                    if (!firstOptionLine) return null;

                                    // Calculate total price from all option lines
                                    let optionsTotalPrice = 0;
                                    const updatedOptions = item.selectedOptions.map(opt => {
                                        const optLine = checkoutLinesByVariantId.get(opt.variantId);
                                        if (optLine) {
                                            const lineTotal = optLine.totalPrice?.gross?.amount ?? 0;
                                            const qty = Math.max(1, optLine.quantity);
                                            const unitPrice = lineTotal / qty;
                                            optionsTotalPrice += unitPrice;
                                            return { ...opt, price: unitPrice };
                                        }
                                        return opt;
                                    });

                                    return {
                                        ...item,
                                        price: 0, // Base product not included
                                        // Don't update quantity from Saleor - use the grouped quantity from store
                                        // Saleor combines lines, so line.quantity would be wrong for grouped items
                                        selectedOptions: updatedOptions,
                                    };
                                } else {
                                    // Normal item - match by item id (base product variant)
                                    const line = checkoutLinesByVariantId.get(item.id);
                                    if (!line) return null;

                                    // Use line totalPrice divided by quantity to get the actual unit price
                                    const lineTotal = line?.totalPrice?.gross?.amount ?? 0;
                                    const qty = Math.max(1, line.quantity);
                                    const unitPrice = lineTotal / qty;

                                    return {
                                        ...item,
                                        price: unitPrice,
                                        // Don't update quantity from Saleor - use the grouped quantity from store
                                        // Saleor combines lines, so line.quantity would be wrong for grouped items
                                    };
                                }
                            })
                            .filter(Boolean) as CartItem[];

                        const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
                        const totalAmount = updatedItems.reduce((sum, item) => sum + (getItemTotal(item) * item.quantity), 0);

                        setRefreshedItems(updatedItems);
                        setRefreshedTotals({ totalItems, totalAmount });
                        setPricesRefreshed(true);
                    }
                }
            } catch (error) {
                console.error('[CartDropdown] Failed to refresh prices from checkout:', error);
            }
        };

        refreshPricesFromCheckout();
    }, [checkoutId, endpoint, items, pricesRefreshed]);

    // Reset prices refreshed state when global cart items change (e.g., when items are removed from cart page)
    useEffect(() => {
        if (pricesRefreshed && refreshedItems.length > 0) {
            // Check if any items in refreshedItems no longer exist in the global store (by key)
            const hasRemovedItems = refreshedItems.some(refreshedItem =>
                !items.find(globalItem => globalItem.key === refreshedItem.key)
            );

            // Check if global items count differs from refreshed items count
            const itemCountDiffers = items.length !== refreshedItems.length;

            if (hasRemovedItems || itemCountDiffers) {
                setPricesRefreshed(false);
                setRefreshedItems([]);
                setRefreshedTotals({ totalItems: 0, totalAmount: 0 });
            }
        }
    }, [items, refreshedItems, pricesRefreshed]);

    // Force refresh when cart becomes empty but dropdown still has cached items
    useEffect(() => {
        if (items.length === 0 && (refreshedItems.length > 0 || pricesRefreshed)) {
            setPricesRefreshed(false);
            setRefreshedItems([]);
            setRefreshedTotals({ totalItems: 0, totalAmount: 0 });
        }
    }, [items.length, refreshedItems.length, pricesRefreshed]);

    // Use refreshed items and totals if available, otherwise fall back to store values
    const displayItems = pricesRefreshed ? refreshedItems : items;
    const displayTotalItems = pricesRefreshed ? refreshedTotals.totalItems : totalItems;
    const displayTotalAmount = pricesRefreshed ? refreshedTotals.totalAmount : totalAmount;

    // Track view_cart GTM event when cart dropdown is opened/items change
    useEffect(() => {
        const gtmConfig = getGoogleTagManagerConfig();
        const currentItems = pricesRefreshed ? refreshedItems : items;
        if (currentItems.length > 0) {
            const products: Product[] = currentItems.map((item, index) => ({
                item_id: item.id,
                item_name: item.name,
                item_category: item.category || 'Products',
                price: item.price,
                quantity: item.quantity,
                currency: 'USD',
                index: index
            }));
            const totalValue = currentItems.reduce((sum, item) => sum + (getItemTotal(item) * item.quantity), 0);
            gtmViewCart(products, 'USD', totalValue, gtmConfig?.container_id);
        }
    }, [items, refreshedItems, pricesRefreshed, getGoogleTagManagerConfig]);

    // Enhanced cart functions that work with refreshed prices and use add to cart endpoint
    // Now uses item.key for all identity operations to support different option sets
    const handleRemoveFromCart = useCallback(async (itemKey: string) => {
        setLoadingItems(prev => ({ ...prev, [itemKey]: { ...prev[itemKey], remove: true } }));

        // Track remove_from_cart GTM event BEFORE removing the item
        const gtmConfig = getGoogleTagManagerConfig();
        const currentItems = pricesRefreshed ? refreshedItems : items;
        const itemToRemove = currentItems.find(item => item.key === itemKey);

        if (itemToRemove) {
            const product: Product = {
                item_id: itemToRemove.id,
                item_name: itemToRemove.name,
                item_category: itemToRemove.category || 'Products',
                price: itemToRemove.price,
                quantity: itemToRemove.quantity,
                currency: 'USD',
                index: 0
            };
            const itemValue = getItemTotal(itemToRemove) * itemToRemove.quantity;
            gtmRemoveFromCart([product], 'USD', itemValue, gtmConfig?.container_id);
        }

        try {
            if (pricesRefreshed) {
                // Update both store and local refreshed state
                setRefreshedItems(prev => prev.filter(item => item.key !== itemKey));
                setRefreshedTotals(() => {
                    const filteredItems = refreshedItems.filter(item => item.key !== itemKey);
                    const totalItems = filteredItems.reduce((sum, item) => sum + item.quantity, 0);
                    const totalAmount = filteredItems.reduce((sum, item) => sum + (getItemTotal(item) * item.quantity), 0);
                    return { totalItems, totalAmount };
                });
            }
            removeFromCart(itemKey);

            // Small delay to ensure backend sync completes
            await new Promise(resolve => setTimeout(resolve, 500));
        } finally {
            setLoadingItems(prev => ({ ...prev, [itemKey]: { ...prev[itemKey], remove: false } }));
        }
    }, [pricesRefreshed, refreshedItems, removeFromCart]);

    const handleUpdateQuantity = useCallback(async (itemKey: string, newQuantity: number) => {
        setLoadingItems(prev => ({ ...prev, [itemKey]: { ...prev[itemKey], minus: true } }));

        try {
            if (pricesRefreshed) {
                // Update both store and local refreshed state
                setRefreshedItems(prev => {
                    const updated = prev.map(item =>
                        item.key === itemKey
                            ? { ...item, quantity: Math.max(0, newQuantity) }
                            : item
                    ).filter(item => item.quantity > 0);

                    // Update totals
                    const totalItems = updated.reduce((sum, item) => sum + item.quantity, 0);
                    const totalAmount = updated.reduce((sum, item) => sum + (getItemTotal(item) * item.quantity), 0);
                    setRefreshedTotals({ totalItems, totalAmount });

                    return updated;
                });
            }
            updateQuantity(itemKey, newQuantity);

            // Small delay to ensure backend sync completes
            await new Promise(resolve => setTimeout(resolve, 500));
        } finally {
            setLoadingItems(prev => ({ ...prev, [itemKey]: { ...prev[itemKey], minus: false } }));
        }
    }, [pricesRefreshed, updateQuantity]);

    const handleAddToCart = useCallback(async (item: CartItem) => {
        setLoadingItems(prev => ({ ...prev, [item.key]: { ...prev[item.key], plus: true } }));

        try {
            await addToCart({
                key: item.key,
                id: item.id,
                name: item.name,
                price: item.price,
                image: item.image,
                quantity: 1,
                sku: item.sku,
                category: item.category,
                selectedOptions: item.selectedOptions,
                customInputs: item.customInputs,
                skipBaseProduct: item.skipBaseProduct
            });

            // Reset price refresh state to force refresh with new data
            setPricesRefreshed(false);
        } catch (error) {
            console.error('[CartDropdown] Failed to add item to cart:', error);
        } finally {
            setLoadingItems(prev => ({ ...prev, [item.key]: { ...prev[item.key], plus: false } }));
        }
    }, [addToCart]);

    const handleProceed = useCallback(async () => {
        setError(null);
        if (isLoggedIn && meLoading) {
            return;
        }

        // Track begin_checkout GTM event
        const gtmConfig = getGoogleTagManagerConfig();
        if (displayItems.length > 0) {
            const products: Product[] = displayItems.map((item, index) => ({
                item_id: item.id,
                item_name: item.name,
                item_category: item.category || 'Products',
                price: item.price,
                quantity: item.quantity,
                currency: 'USD',
                index: index
            }));
            const totalValue = displayItems.reduce((sum, item) => sum + (getItemTotal(item) * item.quantity), 0);
            gtmBeginCheckout(products, 'USD', totalValue, undefined, gtmConfig?.container_id);
        }

        // If we already have a checkout, use it instead of creating a new one
        if (checkoutId) {
            router.push(`/checkout?checkoutId=${encodeURIComponent(checkoutId)}`);
            return;
        }

        // Otherwise, create a new checkout
        setCreating(true);
        try {
            // Build lines from cart using the item id as variantId directly
            const lines = displayItems.map((it) => ({ quantity: it.quantity, variantId: it.id }));
            if (lines.length === 0) {
                setCreating(false);
                return;
            }
            const email = (isLoggedIn ? (user?.email || meData?.me?.email || '') : guestEmail) || 'guest@example.com';

            const mutation = CHECKOUT_CREATE;
            type CheckoutLineInputTS = { variantId: string; quantity: number };
            type CheckoutCreateInputTS = {
                channel: string;
                email: string;
                lines: CheckoutLineInputTS[];
            };
            const input: CheckoutCreateInputTS = {
                channel: process.env.NEXT_PUBLIC_SALEOR_CHANNEL || 'default-channel',
                email,
                lines,
            };
            const variables = { input };
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: mutation, variables }),
            });
            if (!res.ok) throw new Error('Failed to create checkout');
            const json = await res.json();
            const errs = json.data?.checkoutCreate?.errors;
            if (errs && errs.length) throw new Error(errs[0]?.message || 'Checkout creation error');
            const createdId = json.data?.checkoutCreate?.checkout?.id as string | undefined;
            const createdToken = json.data?.checkoutCreate?.checkout?.token as string | undefined;
            if (!createdId) throw new Error('No checkout id returned');
            setCheckoutId(createdId);
            if (createdToken) {
                setCheckoutToken(createdToken);
            }
            try {
                localStorage.setItem('checkoutId', createdId);
                if (createdToken) localStorage.setItem('checkoutToken', createdToken);
            } catch { }
            router.push(`/checkout?checkoutId=${encodeURIComponent(createdId)}`);
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Unable to proceed to checkout';
            console.error('[Cart] handleProceed error:', e);
            setError(msg);
        } finally {
            setCreating(false);
        }
    }, [checkoutId, endpoint, guestEmail, isLoggedIn, displayItems, meData, meLoading, router, setCheckoutId, setCheckoutToken, user?.email]);

    if (displayItems.length === 0) {
        return (
            <div className="max-w-md w-full absolute right-20 top-20 pt-7 z-10">
                <div className='bg-white shadow-[0_10px_20px_0_#0000001A] p-4'>
                    <p className='border-b border-[var(--color-secondary-200)] pb-2 font-secondary font-semibold text-xl text-[var(--color-secondary-800)]'>
                        MY CART
                    </p>
                    <EmptyState
                        icon={CartIcon}
                        iconContainer="p-5"
                        text="YOUR CART IS EMPTY"
                        textParagraph="Browse parts and accessories to get started."
                        className='min-h-96'
                    />
                </div>
            </div >
        );
    }

    return (
        <div className="max-w-md w-full absolute right-20 top-20 pt-7 z-10">
            <div className='bg-white shadow-[0_10px_20px_0_#0000001A] p-4'>
                <div className="space-y-5">
                    <p className='border-b border-[var(--color-secondary-200)] pb-2 font-secondary font-semibold text-xl text-[var(--color-secondary-800)]'>
                        MY CART
                    </p>
                    <div className='space-y-4'>
                        {displayItems.map((item: CartItem) => (
                            <div key={item.key} className="flex items-center gap-4 border-b border-[var(--color-secondary-200)] last:border-b-0 pb-4 last:pb-0">
                                <div className='w-full items-center gap-2 flex'>
                                    <div className="relative size-[100px] flex-shrink-0">
                                        <Image
                                            src={item?.image || '/no-image-avail-large.png'}
                                            alt={item?.name || 'Product Image'}
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <div className='space-y-1'>
                                            <p className="text-xs font-normal text-[var(--color-secondary-800)]">{item.category ?? "N/A"}</p>
                                            <h3 className="font-medium font-secondary text-sm text-[var(--color-secondary-800)] line-clamp-2">{item.name}</h3>
                                            {/* Display selected options */}
                                            {item.selectedOptions && item.selectedOptions.length > 0 && (
                                                <div className="mt-1 space-y-0.5">
                                                    {item.selectedOptions.map((option, idx) => (
                                                        <p key={idx} className="text-xs text-[var(--color-secondary-600)]">
                                                            + {option.name}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Display custom inputs */}
                                            {item.customInputs && Object.keys(item.customInputs).length > 0 && (
                                                <div className="mt-1 space-y-0.5">
                                                    {Object.entries(item.customInputs).map(([key, value]) => (
                                                        <p key={key} className="text-xs text-[var(--color-secondary-600)]">
                                                            + {key}: {value}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <p className="font-semibold text-base text-[var(--color-primary-500)] font-secondary">
                                            ${(getItemTotal(item) * item.quantity).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                                <div className='flex flex-col items-end gap-8'>
                                    <CommonButton
                                        onClick={() => handleRemoveFromCart(item.key)}
                                        disabled={loadingItems[item.key]?.remove || loadingItems[item.key]?.plus || loadingItems[item.key]?.minus}
                                        variant="tertiary"
                                        className="p-0"
                                    >
                                        {loadingItems[item.key]?.remove ? 'Removing...' : 'Remove'}
                                    </CommonButton>
                                    <div className="flex items-center border border-[var(--color-secondary-200)] bg-[var(--color-secondary-50)] px-2 py-3 gap-2 min-w-32 justify-between">
                                        <button
                                            onClick={() => handleUpdateQuantity(item.key, item.quantity - 1)}
                                            disabled={loadingItems[item.key]?.minus || loadingItems[item.key]?.plus || loadingItems[item.key]?.remove}
                                            className={`border-r border-[var(--color-secondary-200)] [&>svg]:size-6 pr-2 transition-opacity ${
                                                loadingItems[item.key]?.minus || loadingItems[item.key]?.plus || loadingItems[item.key]?.remove
                                                    ? 'cursor-not-allowed opacity-50'
                                                    : 'cursor-pointer hover:opacity-75'
                                            }`}
                                        >
                                            {loadingItems[item.key]?.minus ? (
                                                <svg className="animate-spin size-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            ) : (
                                                SubtractIcon
                                            )}
                                        </button>
                                        <span className='font-normal text-base font-secondary text-[var(--color-secondary-800)]'>{item.quantity}</span>
                                        <button
                                            onClick={() => handleAddToCart(item)}
                                            disabled={loadingItems[item.key]?.plus || loadingItems[item.key]?.minus || loadingItems[item.key]?.remove}
                                            className={`border-l border-[var(--color-secondary-200)] [&>svg]:size-6 pl-2 transition-opacity ${
                                                loadingItems[item.key]?.plus || loadingItems[item.key]?.minus || loadingItems[item.key]?.remove
                                                    ? 'cursor-not-allowed opacity-50'
                                                    : 'cursor-pointer hover:opacity-75'
                                            }`}
                                        >
                                            {loadingItems[item.key]?.plus ? (
                                                <svg className="animate-spin size-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            ) : (
                                                PlusIcon
                                            )}
                                        </button>
                                    </div>

                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="gap-2 flex flex-col mb-4 font-normal text-base font-secondary text-[var(--color-secondary-600)] border-t border-[var(--color-secondary-200)] pt-4">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span className='font-medium'>${displayTotalAmount.toFixed(2)}</span>
                        </div>
                        {/* <div className="flex justify-between pb-2">
                            <span>Tax</span>
                            <span className='font-medium'>N/A</span>
                        </div> */}
                        <div className="border-t border-[var(--color-secondary-200)] pt-4 flex justify-between text-xl text-[var(--color-secondary-600)] font-medium ">
                            <span>TOTAL</span>
                            <span className='font-semibold text-[var(--color-secondary-800)]'>${displayTotalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                    {error && (
                        <div className="mb-3 text-sm text-red-600">{error}</div>
                    )}
                    <div className='grid grid-cols-2 gap-4'>
                        <CommonButton
                            onClick={() => router.push("/cart")}
                            variant="secondary"
                        >
                            VIEW CART
                        </CommonButton>
                        <CommonButton
                            onClick={handleProceed}
                            disabled={creating || (isLoggedIn && meLoading)}
                            variant="primary"
                        >
                            {creating ? 'Loading..' : (isLoggedIn && meLoading ? 'Loading your address...' : 'CHECKOUT')}
                        </CommonButton>
                    </div>
                </div>
            </div>
        </div>
    );
}
