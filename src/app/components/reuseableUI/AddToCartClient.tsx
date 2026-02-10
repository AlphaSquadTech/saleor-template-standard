"use client";

import { useState, useCallback } from "react";
import { useGlobalStore } from "@/store/useGlobalStore";
import Toast from "@/app/components/reuseableUI/Toast";
import { gtmAddToCart, Product } from "@/app/utils/googleTagManager";
import { useAppConfiguration } from "@/app/components/providers/ServerAppConfigurationProvider";

export type AddToCartClientProps = {
  id: string;
  name: string;
  price: number;
  image: string;
  sku?: string | null;
  category?: string;
};

export default function AddToCartClient({ id, name, price, image, sku, category }: AddToCartClientProps) {
  const { addToCart } = useGlobalStore();
  const { getGoogleTagManagerConfig } = useAppConfiguration();
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [toast, setToast] = useState<{ message: string; subParagraph?: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const gtmConfig = getGoogleTagManagerConfig();

  const btnPrimary = "bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  const btnSecondary = "border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-3 py-2 rounded-md transition-colors";

  const showToast = useCallback((message: string, subParagraph?: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, subParagraph, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleAddToCart = async () => {
    try {
      setIsAdding(true);
      
      // GTM tracking for add to cart
      const product: Product = {
        item_id: id,
        item_name: name,
        item_category: category || 'Products',
        price: price,
        quantity: quantity,
        currency: 'USD'
      };
      
      await addToCart({ id, name, price, image, quantity, sku: sku || undefined, category });
      
      // Track successful add to cart
      gtmAddToCart([product], 'USD', price * quantity, gtmConfig?.container_id);
      
      showToast('ITEM ADDED TO CART', "Your item has been added. You can continue shopping or proceed to checkout.", "success");
    } catch (e) {
      showToast('FAILED TO ADD TO CART', "Please try again later.", "error");
    } finally {
      setTimeout(() => setIsAdding(false), 400);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center border border-gray-300 rounded-md w-fit">
        <button
          className={`${btnSecondary} !border-0 !px-3 !py-2`}
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          aria-label="Decrease quantity"
        >
          -
        </button>
        <input
          type="number"
          value={quantity}
          min={1}
          className=" text-center border-x border-gray-300 py-2 w-16"
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
        />
        <button
          className={`${btnSecondary} !border-0 !px-3 !py-2`}
          onClick={() => setQuantity(quantity + 1)}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
      <button
        className={`${btnPrimary} w-full flex items-center justify-center`}
        onClick={handleAddToCart}
        disabled={!id || isAdding}
      >
        {isAdding ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Adding...
          </>
        ) : (
          'Add to Cart'
        )}
      </button>

      {/* SKU line */}
      {sku ? <div className="text-xs text-gray-500">SKU: {sku}</div> : null}

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 space-y-3 animate-[slidein_.25s_ease-out]">
          <Toast
            message={toast.message}
            type={toast.type}
            subParagraph={toast.subParagraph}
            duration={2500}
            onClose={() => setToast(null)}
          />
          <style jsx>{`
            @keyframes slidein { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
          `}</style>
        </div>
      )}
    </div>
  );
}
