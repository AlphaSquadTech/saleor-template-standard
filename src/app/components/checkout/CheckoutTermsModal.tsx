"use client";

import React from "react";
import { useQuery } from "@apollo/client";
import ModalLayout from "@/app/components/reuseableUI/modalLayout";
import TermsContentRenderer from "./TermsContentRenderer";
import { SpinnerIcon } from "@/app/utils/svgs/spinnerIcon";
import { 
  GET_CHECKOUT_TERMS_AND_CONDITIONS, 
  type CheckoutTermsAndConditionsResponse 
} from "@/graphql/queries/getCheckoutTermsAndConditions";

interface CheckoutTermsModalProps {
  isModalOpen: boolean;
  onClose: () => void;
}

const CheckoutTermsModal: React.FC<CheckoutTermsModalProps> = ({
  isModalOpen,
  onClose,
}) => {
  const { data, loading, error } = useQuery<CheckoutTermsAndConditionsResponse>(
    GET_CHECKOUT_TERMS_AND_CONDITIONS,
    {
      variables: { slug: "checkout-terms-and-conditions" },
      skip: !isModalOpen,
      fetchPolicy: "cache-first",
    }
  );

  const page = data?.page;

  // Don't render modal if page is not published
  if (page && !page.isPublished) {
    return null;
  }

  return (
    <ModalLayout
      isModalOpen={isModalOpen}
      onClose={onClose}
      heading={page?.title || "Terms and Conditions"}
      className="lg:max-w-4xl max-h-[80vh] overflow-y-auto"
    >
      <div className="mt-6 lg:mt-8 px-2 pb-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-[var(--color-secondary-600)]">
              <div className="size-5">
                {SpinnerIcon}
              </div>
              <span className="text-sm">Loading terms and conditions...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-[var(--color-primary-600)] text-sm">
              Failed to load terms and conditions. Please try again.
            </p>
          </div>
        )}

        {page && !loading && !error && (
          <TermsContentRenderer content={page.content ?? null} />
        )}

        {!page && !loading && !error && (
          <div className="text-center py-12">
            <p className="text-[var(--color-secondary-600)] text-sm">
              Terms and conditions not available.
            </p>
          </div>
        )}
      </div>
    </ModalLayout>
  );
};

export default CheckoutTermsModal;