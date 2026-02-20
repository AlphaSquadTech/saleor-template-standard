"use client";

import { useEffect, useState } from "react";
import { useGlobalStore } from "@/store/useGlobalStore";
import { vaultApi } from "@/lib/trpc-client";
import type { SavedPaymentMethod } from "@/types/global";
import CommonButton from "@/app/components/reuseableUI/commonButton";
import EmptyState from "@/app/components/reuseableUI/emptyState";
import LoadingUI from "@/app/components/reuseableUI/loadingUI";
import { PlusIcon } from "@/app/utils/svgs/plusIcon";
import AddCardModal from "./components/addCardModal";
import SavedCardItem from "./components/savedCardItem";
import PrimaryButton from "@/app/components/reuseableUI/primaryButton";

export default function PaymentMethodsPage() {
  const { isLoggedIn } = useGlobalStore();
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refetchPaymentMethods, setRefetchPaymentMethods] = useState(false);

  // Load saved payment methods
  // Note: User is authenticated via JWT token - no need to pass user ID
  const loadSavedMethods = async () => {
    if (!isLoggedIn) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await vaultApi.listSavedPaymentMethods();
      setSavedMethods(response.savedPaymentMethods);
    } catch (err) {
      console.error("Error loading saved payment methods:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load payment methods",
      );
    } finally {
      setIsLoading(false);
      setRefetchPaymentMethods(false);
    }
  };

  // Load on mount
  useEffect(() => {
    loadSavedMethods();
  }, [isLoggedIn]);

  // Handle successful card addition
  const handleCardAdded = async () => {
    setTimeout(() => {
      loadSavedMethods();
    }, 5000);
    setIsModalOpen(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-secondary-600)]">
          Please log in to manage your payment methods.
        </p>
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between w-full mb-6">
          <h2 className="text-lg lg:text-xl text-[var(--color-secondary-800)] font-secondary font-semibold">
            MY PAYMENT METHODS
          </h2>
          <div
            className="uppercase cursor-pointer flex items-center gap-2"
            onClick={() => setIsModalOpen(true)}
          >
            <span className="size-5 text-[var(--color-primary-600)]">
              {PlusIcon}
            </span>
            <CommonButton
              variant="tertiary"
              content="Add New Card"
              className="p-0 text-sm lg:text-base"
            />
          </div>
        </div>

        {refetchPaymentMethods || isLoading ? (
          <LoadingUI />
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <PrimaryButton
              content="Try Again"
              onClick={loadSavedMethods}
              className="min-w-[200px] capitalize font-medium"
            />
          </div>
        ) : savedMethods.length === 0 ? (
          <EmptyState text="No saved payment methods" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedMethods.map((method) => (
              <SavedCardItem key={method.id} method={method} />
            ))}
          </div>
        )}
      </div>

      <AddCardModal
        isModalOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCardAdded}
        setRefetchPaymentMethods={setRefetchPaymentMethods}
        refetchPaymentMethods={refetchPaymentMethods}
      />
    </>
  );
}
