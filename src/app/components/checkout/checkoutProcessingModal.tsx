  import React from "react";
  import ModalLayout from "../reuseableUI/modalLayout";
  import { HourglassIcon } from "@/app/utils/svgs/paymentProcessingIcons/hourglassIcon";
  import { SuccessTickIcon } from "@/app/utils/svgs/successTickIcon";
  import PrimaryButton from "../reuseableUI/primaryButton";
  import { PaymentFailedIcon } from "@/app/utils/svgs/paymentProcessingIcons/paymentFailedIcon";
  import { PaymentProcessingState } from "@/graphql/types/checkout";

  const CheckoutProcessingModal = ({
    isModalOpen,
    onClose,
    isProcessingPayment,
  }: {
    isModalOpen: boolean;
    onClose: () => void;
    isProcessingPayment: PaymentProcessingState;
  }) => {
    const renderContent = () => {
      if (isProcessingPayment.paymentProcessingLoading) {
        return (
          <div className="space-y-5 flex flex-col items-center w-full text-center">
            <div className="bg-[var(--color-secondary-200)] p-5 rounded-full w-fit [&>svg]:size-10 [&>svg]:text-[var(--color-secondary-600)] [&>svg]:animate-pulse mx-auto">
              {HourglassIcon}
            </div>
            <div className="space-y-2">
              <p className="text-[var(--color-secondary-800)] font-semibold text-xl font-secondary">
                PROCESSING PAYMENT
              </p>
              <p className="font-normal text-sm font-secondary">
                Your payment is being processed. This may take a few seconds.
              </p>
            </div>
          </div>
        );
      }
      if (isProcessingPayment.success) {
        return (
          <div className="w-full space-y-10 flex flex-col items-center">
            <div className="space-y-5 flex flex-col items-center w-full text-center">
              <span>{SuccessTickIcon}</span>
              <div className="space-y-2">
                <p className="text-[var(--color-secondary-800)] font-semibold text-xl font-secondary">
                  PAYMENT SUCCESSFUL
                </p>
                <p className="font-normal text-sm font-secondary">
                  Your transaction has been completed successfully. Thank you for
                  your purchase.
                </p>
              </div>
            </div>
            <PrimaryButton
              onClick={onClose}
              content="Back to Home"
              className="w-fit mx-auto !bg-[var(--color-secondary-200)] !text-[var(--color-secondary-800)]"
            />
          </div>
        );
      }
      if (isProcessingPayment.error) {
        return (
          <div className="w-full space-y-10 flex flex-col items-center">
            <div className="space-y-5 flex flex-col items-center w-full text-center">
              <span>{PaymentFailedIcon}</span>
              <div className="space-y-2">
                <p className="text-[var(--color-secondary-800)] font-semibold text-xl font-secondary">
                  Payment Unsuccessful
                </p>
                <p className="font-normal text-sm font-secondary">
                  Something went wrong. Please check your details and try again.
                </p>
              </div>
            </div>
            <PrimaryButton
              onClick={onClose}
              content="Back to Home"
              className="w-fit mx-auto"
            />
          </div>
        );
      }
      return null;
    };
    return (
      <ModalLayout
        removeCrossIcon={isProcessingPayment.paymentProcessingLoading ? true : false}
        removeBgClose={true}
        isModalOpen={isModalOpen}
        onClose={onClose}
        className="px-10 py-16"
      >
        {renderContent()}
      </ModalLayout>
    );
  };

  export default CheckoutProcessingModal;
