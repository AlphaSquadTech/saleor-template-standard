"use client";
import { useState } from "react";
import Image from "next/image";
import CommonButton from "../reuseableUI/commonButton";
import type { CartItem } from "@/store/useGlobalStore";

interface ShippingMethod {
  id: string;
  name: string;
  price: { amount: number; currency: string };
}

interface TaxInfo {
  totalTax: number;
  shippingTax: number;
  subtotalNet: number;
  shippingNet: number;
  currency: string;
}

interface VoucherInfo {
  voucherCode: string | null;
  discount: {
    amount: number;
    currency: string;
  } | null;
}

interface OrderSummaryProps {
  totalAmount: number;
  selectedShipping: ShippingMethod | null;
  grandTotal: number;
  saleorTotal: number | null;
  isUpdatingDelivery: boolean;
  shippingLoading: boolean;
  isCalculatingTotal: boolean;
  taxInfo: TaxInfo | null;
  isCalculatingTax: boolean;
  voucherInfo?: VoucherInfo | null;
  onApplyVoucher?: (code: string) => Promise<void>;
  onRemoveVoucher?: () => Promise<void>;
  isApplyingVoucher?: boolean;
  voucherError?: string | null;
  selectedCollectionPointId?: string | null;
  onCompletePayment?: () => Promise<void>;
  isPaymentProcessing?: boolean;
  paymentDisabled?: boolean;
  paymentDisabledReason?: string;
  lineItems?: CartItem[];
}

export default function OrderSummary({
  totalAmount,
  selectedShipping,
  grandTotal,
  saleorTotal,
  isUpdatingDelivery,
  shippingLoading,
  isCalculatingTotal,
  taxInfo,
  isCalculatingTax,
  voucherInfo,
  onApplyVoucher,
  onRemoveVoucher,
  isApplyingVoucher = false,
  voucherError,
  selectedCollectionPointId,
  onCompletePayment,
  isPaymentProcessing = false,
  paymentDisabled = false,
  paymentDisabledReason,
  lineItems,
}: OrderSummaryProps) {
  const [voucherCode, setVoucherCode] = useState("");

  const handleApplyVoucher = async () => {
    if (voucherCode.trim() && onApplyVoucher) {
      await onApplyVoucher(voucherCode.trim());
      if (!voucherError) {
        setVoucherCode("");
      }
    }
  };

  const handleRemoveVoucher = async () => {
    if (onRemoveVoucher) {
      await onRemoveVoucher();
      setVoucherCode("");
    }
  };
  const getItemTotal = (item: CartItem): number => {
    let total = item.price;
    if (item.selectedOptions?.length) {
      total += item.selectedOptions.reduce((sum, opt) => sum + opt.price, 0);
    }
    return total;
  };

  const isVoucherButtonDisabled =
    (!selectedShipping && !selectedCollectionPointId) ||
    isApplyingVoucher ||
    !voucherCode.trim();
  return (
    <div className="lg:col-span-1 flex flex-col lg:sticky lg:top-24 lg:self-start">
      <h2 className="font-medium font-secondary text-base text-[var(--color-secondary-800)] text-start pb-3 uppercase">
        Summary
      </h2>

      <div className="bg-white border border-[var(--color-secondary-200)] rounded-lg p-6 shadow-sm min-w-[360px]">
        {/* Payment Method Icons */}
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
          <Image src="/icons/visa.gif" alt="Visa" width={40} height={25} className="object-contain" />
          <Image src="/icons/master.gif" alt="Mastercard" width={40} height={25} className="object-contain" />
          <Image src="/icons/amex.gif" alt="American Express" width={40} height={25} className="object-contain" />
          <Image src="/icons/discover.gif" alt="Discover" width={40} height={25} className="object-contain" />
        </div>

        {/* Line Items */}
        {lineItems && lineItems.length > 0 && (
          <div className="mb-4 pb-4 border-b border-gray-200 space-y-4 max-h-80 overflow-y-auto pr-3">
            {lineItems.map((item) => (
              <div key={item.key} className="flex gap-3">
                <div className="relative w-14 h-14 flex-shrink-0">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--color-secondary-800)] truncate">
                      {item.name}
                    </p>
                    <span className="text-sm font-medium text-[var(--color-secondary-800)] flex-shrink-0">
                      ${(getItemTotal(item) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-secondary-500)]">
                    Qty: {item.quantity}
                  </p>
                  {/* Selected Options */}
                  {item.selectedOptions && item.selectedOptions.length > 0 && (
                    <div className="mt-2 text-xs border-l-2 border-gray-200 pl-2 space-y-1">
                      {item.selectedOptions.map((option, idx) => (
                        <div key={idx} className="text-[var(--color-secondary-600)]">
                          <span className="font-medium text-[var(--color-secondary-700)]">{option.optionSetLabel}</span>
                          <div className="flex justify-between items-baseline">
                            <span className="text-[var(--color-secondary-500)]">{option.name}</span>
                            {option.price > 0 && (
                              <span className="text-[var(--color-primary-600)] font-medium ml-2 whitespace-nowrap">
                                +${option.price.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Custom Inputs */}
                  {item.customInputs && Object.keys(item.customInputs).length > 0 && (
                    <div className="mt-2 text-xs border-l-2 border-blue-200 pl-2 space-y-1">
                      {Object.entries(item.customInputs).map(([key, value]) => (
                        <div key={key} className="text-[var(--color-secondary-600)]">
                          <span className="font-medium text-[var(--color-secondary-700)]">{key}</span>
                          <div className="text-[var(--color-secondary-500)]">{value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      <div className="w-full text-normal text-[var(--color-secondary-600)] text-base">
        <div className="flex justify-between mb-2">
          <span>Sub-Total</span>
          <span className="font-medium">
            {taxInfo && taxInfo.subtotalNet > 0
              ? new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: taxInfo.currency,
                }).format(taxInfo.subtotalNet)
              : `$${totalAmount.toFixed(2)}`}
          </span>
        </div>
        <div className="flex justify-between mb-2">
          <span>Tax</span>
          <span className="font-medium">
            {isCalculatingTax
              ? "Calculating…"
              : taxInfo && taxInfo.totalTax > 0
              ? new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: taxInfo.currency,
                }).format(taxInfo.totalTax)
              : "N/A"}
          </span>
        </div>
        <div className="flex justify-between mb-2">
          <span>Shipping Cost</span>
          <span className="font-medium">
            {isUpdatingDelivery || shippingLoading
              ? "Updating…"
              : selectedShipping
              ? new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: selectedShipping.price.currency,
                }).format(selectedShipping.price.amount)
              : "--"}
          </span>
        </div>
        {taxInfo && taxInfo.shippingTax > 0 && selectedShipping && (
          <div className="flex justify-between mb-2">
            <span className="text-sm text-start">Shipping Tax</span>
            <span className="font-medium text-sm">
              {new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: taxInfo.currency,
              }).format(taxInfo.shippingTax)}
            </span>
          </div>
        )}

        {/* Voucher Section */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          {voucherInfo?.voucherCode ? (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-green-600 font-medium">
                  Voucher Applied: {voucherInfo.voucherCode}
                </span>
                <button
                  onClick={handleRemoveVoucher}
                  className={`text-sm hover:underline ${
                    isApplyingVoucher
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-red-500"
                  }`}
                  disabled={isApplyingVoucher}
                >
                  {isApplyingVoucher ? "Removing..." : "Remove"}
                </button>
              </div>
              {voucherInfo.discount && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span className="font-medium">
                    -
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: voucherInfo.discount.currency,
                    }).format(voucherInfo.discount.amount)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-4">
              <div className="mb-3">
                <h3 className="text-sm font-medium text-[var(--color-secondary-800)] mb-2">
                  Have a voucher code?
                </h3>
                {!selectedShipping && !selectedCollectionPointId && (
                  <p className="text-orange-600 text-xs mb-3 bg-orange-50 p-2 rounded border border-orange-200">
                    Please select a delivery method or pickup location first to apply a voucher
                    code
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    placeholder="Enter voucher code"
                    className={`flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent ${
                      !selectedShipping && !selectedCollectionPointId
                        ? "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed"
                        : "border-gray-300"
                    }`}
                    disabled={(!selectedShipping && !selectedCollectionPointId) || isApplyingVoucher}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isVoucherButtonDisabled) {
                        handleApplyVoucher();
                      }
                    }}
                  />
                  <button
                    onClick={handleApplyVoucher}
                    disabled={isVoucherButtonDisabled}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      isVoucherButtonDisabled
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90"
                    }`}
                  >
                    {isApplyingVoucher ? "Applying..." : "Apply"}
                  </button>
                </div>
                {voucherError && (
                  <p className="text-red-500 text-xs">{voucherError}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between text-xl text-[var(--color-secondary-600)] font-semibold font-secondary mt-2 pt-4 border-t border-gray-200">
          <span className="font-medium">TOTAL</span>
          <div className="text-right">
            {voucherInfo?.discount &&
            voucherInfo.discount.amount > 0 &&
            saleorTotal ? (
              <div>
                <div className="text-sm text-gray-500 line-through">
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency:
                      selectedShipping?.price?.currency ||
                      taxInfo?.currency ||
                      "USD",
                  }).format(saleorTotal + voucherInfo.discount.amount)}
                </div>
                <div
                  className={`text-[var(--color-secondary-800)] ${
                    isCalculatingTotal || isCalculatingTax ? "opacity-60" : ""
                  }`}
                >
                  {isCalculatingTotal || isCalculatingTax
                    ? "Calculating…"
                    : new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency:
                          selectedShipping?.price?.currency ||
                          taxInfo?.currency ||
                          "USD",
                      }).format(saleorTotal)}
                </div>
              </div>
            ) : (
              <span
                className={`text-[var(--color-secondary-800)] ${
                  isCalculatingTotal || isCalculatingTax ? "opacity-60" : ""
                }`}
              >
                {isCalculatingTotal || isCalculatingTax
                  ? "Calculating…"
                  : new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency:
                        selectedShipping?.price?.currency ||
                        taxInfo?.currency ||
                        "USD",
                    }).format(saleorTotal || grandTotal)}
              </span>
            )}
          </div>
        </div>

        {/* Place Order Button */}
        {onCompletePayment && (
          <CommonButton
            onClick={() => onCompletePayment()}
            content={
              isPaymentProcessing
                ? "Processing..."
                : paymentDisabled && paymentDisabledReason
                ? paymentDisabledReason
                : "PLACE ORDER"
            }
            disabled={paymentDisabled || isPaymentProcessing}
            variant="primary"
            className="w-full mt-6"
            type="button"
          />
        )}
      </div>
      </div>
    </div>
  );
}
