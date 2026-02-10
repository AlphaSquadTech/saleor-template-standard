'use client';

import { useEffect } from 'react';
import { useGlobalStore } from '@/store/useGlobalStore';

/**
 * Hook to handle cart synchronization with Saleor
 * Automatically loads cart from Saleor when user logs in
 * Returns syncing state for UI feedback
 */
export function useCartSync() {
  const { isLoggedIn, syncingCart, loadCartFromSaleor } = useGlobalStore();

  useEffect(() => {
    if (isLoggedIn) {
      // Load cart from Saleor when component mounts and user is logged in
      loadCartFromSaleor().catch(console.error);
    }
  }, [isLoggedIn, loadCartFromSaleor]);

  return {
    syncingCart,
  };
}