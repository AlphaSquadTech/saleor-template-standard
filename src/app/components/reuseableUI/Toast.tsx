"use client";

import { SuccessTickIcon } from "@/app/utils/svgs/cart/successTickIcon";
import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  subParagraph?: string;
  type?: ToastType;
  duration?: number; // ms
  onClose?: () => void;
}

const typeStyles: Record<ToastType, { bg: string; ring: string; icon: ReactNode; bar: string; }> = {
  success: {
    bg: "bg-white",
    ring: "ring-1 ring-green-200",
    icon: SuccessTickIcon,
    bar: "bg-green-500",
  },
  error: {
    bg: "bg-white",
    ring: "ring-1 ring-red-200",
    icon: (
      <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
    ),
    bar: "bg-red-500",
  },
  info: {
    bg: "bg-white",
    ring: "ring-1 ring-blue-200",
    icon: (
      <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
    bar: "bg-blue-500",
  },
};

export default function Toast({ message, subParagraph, type = "info", duration = 3000, onClose }: ToastProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const style = useMemo(() => typeStyles[type], [type]);

  useEffect(() => {
    if (duration <= 0) return;
    timerRef.current = setTimeout(() => onClose?.(), duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duration, onClose]);

  return (
    <div
      className={`pointer-events-auto top-16 -right-3.5 ${style.bg} shadow-[0_10px_20px_0_#0000001A] relative p-4 flex items-start gap-3 overflow-hidden max-w-[410px]
      backdrop-blur-sm border border-gray-100/60`}>
      <div className="flex items-start w-full gap-3">
        <div className="mt-0.5 size-5 [&>svg]:size-5">{style.icon}</div>
        <div className="space-y-1">
          <p className="font-semibold text-sm font-secondary text-[var(--color-secondary-800)]">{message}</p>
          {
            subParagraph && (
              <p className="text-xs text-[var(--color-secondary-600)] font-secondary font-normal">{subParagraph}</p>
            )
          }
        </div>
        {onClose && (
          <button
            aria-label="Close"
            onClick={onClose}
            className="inline-flex bg-[var(--color-secondary-200)] rounded-full p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {duration > 0 && (
        <span
          className={`absolute left-0 bottom-0 h-0.5 ${style.bar}`}
          style={{ animation: `toastbar ${duration}ms linear forwards` }}
        />
      )}

      <style jsx global>{`
        @keyframes toastbar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
