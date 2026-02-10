"use client";

import { cn } from "@/app/utils/functions";
import { ModalCrossIcon } from "@/app/utils/svgs/paymentProcessingIcons/modalCrossIcon";
import { useEffect } from "react";

const ModalLayout = ({
  children,
  isModalOpen,
  onClose,
  className,
  removeCrossIcon,
  removeBgClose = false,
  heading,
}: {
  children: React.ReactNode;
  isModalOpen: boolean;
  onClose: () => void;
  className?: string;
  removeCrossIcon?: boolean;
  removeBgClose?: boolean;
  heading?: string;
}) => {
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isModalOpen]);
  return (
    <>
      <div className={cn("", isModalOpen ? "fixed left-0 top-0 h-full w-full z-[120]" : "")}>
        {isModalOpen && (
          <div
            onClick={() => {
              if (!removeBgClose) {
                onClose()
              }
            }}
            className="bg-black/60 w-full h-full absolute top-0 z-[120]"
          />
        )}
        <div
          className={cn(
            `fixed bottom-0 overflow-y-auto lg:inset-0 h-[calc(100dvh-8rem)] m-auto w-full lg:h-[calc(100dvh-280px)] lg:top-24 lg:overflow-auto z-[120] bg-white lg:max-w-5xl px-4 py-6 md:px-6 lg:p-10 transition-all duration-[400ms] ease-in-out`,
            isModalOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none",
            className
          )}
        >
          <div className="flex items-center justify-between w-full">
            {
              heading && (
                <h2 className="font-semibold text-[var(--color-secondary-800)] font-secondary text-xl" >
                  {heading}
                </h2>
              )
            }
            {!removeCrossIcon && (
              <button
                onClick={onClose}
                className="text-black absolute top-5 right-5 [&>svg]:size-4 size-6 p-1 rounded-full bg-[var(--color-secondary-200)] cursor-pointer"
              >
                {ModalCrossIcon}
              </button>
            )}
          </div>

          {children}
        </div>
      </div>
    </>
  );
};

export default ModalLayout;
