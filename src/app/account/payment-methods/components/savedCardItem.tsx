"use client";

import type { SavedPaymentMethod } from "@/types/global";

interface SavedCardItemProps {
  method: SavedPaymentMethod;
}

export default function SavedCardItem({ method }: SavedCardItemProps) {
  if (method.type !== "card" || !method.card) {
    return null;
  }

  return (
    <div className="border border-[var(--color-secondary-500)] p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-[var(--color-secondary-800)] font-primary">
              {method.card.brand}
            </span>
          </div>
          <div className="text-base text-[var(--color-secondary-600)] font-secondary">
            •••• •••• •••• {method.card.lastDigits}
          </div>
          <div className="text-sm font-secondary text-[var(--color-secondary-500)] mt-1">
            Expires {method.card.expiry}
          </div>
        </div>
      </div>
    </div>
  );
}
