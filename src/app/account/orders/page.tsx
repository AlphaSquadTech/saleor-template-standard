"use client";

import CommonButton from "@/app/components/reuseableUI/commonButton";
import EmptyState from "@/app/components/reuseableUI/emptyState";
import LoadingUI from "@/app/components/reuseableUI/loadingUI";
import StatusTag from "@/app/components/reuseableUI/statusTag";
import { InfoIcon } from "@/app/utils/svgs/account/orderHistory/InfoIcon";
import { MY_ORDERS, type MyOrdersData } from "@/graphql/queries/myOrders";
import { useQuery } from "@apollo/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import OrderDetailsModal from "./components/orderDetailsModal";
const NoOrdersSection = () => {
  const router = useRouter();
  return (
    <div className="font-secondary space-y-10 h-[50vh] flex flex-col justify-center">
      <div className="text-center">
        <div className="text-black p-3 md:p-5 rounded-full [&>svg]:size-6 md:[&>svg]:size-10 border border-[var(--color-secondary-300)] bg-[var(--color-secondary-200)] w-fit mx-auto mb-5">
          {InfoIcon}
        </div>
        <p className="font-semibold text-base md:text-xl text-[var(--color-secondary-800)] uppercase pb-2">
          You Haven&apos;t Placed Any Orders Yet
        </p>
        <p className="text-xs md:text-sm font-normal text-[var(--color-secondary-600)]">
          Once you make a purchase, your order history will appear here. Start shopping now to track your orders and manage your purchases.
        </p>
      </div>
      <CommonButton
        className="mx-auto text-sm md:text-base py-2.5 md:py-3"
        variant="secondary"
        onClick={() => router.push('/')}
      >
        GO TO HOME
      </CommonButton>
    </div>
  );
}
function OrderHistoryPageContent() {
  const searchParams = useSearchParams();
  const { data, loading, error, refetch } = useQuery<MyOrdersData>(MY_ORDERS, {
    fetchPolicy: "cache-and-network", // Always fetch fresh data from server
    notifyOnNetworkStatusChange: true, // Show loading states during refetch
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Force refetch when coming from success page (has timestamp parameter)
  useEffect(() => {
    const timestamp = searchParams.get('t');
    if (timestamp) {
      // Small delay to ensure component is fully mounted
      setTimeout(() => {
        refetch();
      }, 100);
    }
  }, [searchParams, refetch]);
  const edges = data?.me?.orders?.edges ?? [];
  if (error) {
    console.error("MyOrders query error:", error);
  }
  return (
    <>
      <div>
        <h2 className="text-lg lg:text-xl text-[var(--color-secondary-800)] font-secondary font-semibold">ORDER HISTORY</h2>
        {loading ? (
          <LoadingUI />
        ) : error ? (
          <EmptyState className="h-[50vh]" text="Failed to load orders." />
        ) : edges.length === 0 ? (
          <NoOrdersSection />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead>
                <tr className="[&>th]:py-4 [&>th]:text-left [&>th]:text-sm [&>th]:font-normal [&>th]:text-[var(--color-secondary-400)] [&>th]:uppercase [&>th]:whitespace-nowrap [&>th]:min-w-[152px]">
                  <th>ORDER DETAILS</th>
                  <th>ORDER NUMBER</th>
                  <th>PLACED ON</th>
                  <th>STATUS</th>
                  <th>Action</th>
                </tr >
              </thead >
              <tbody className="divide-y divide-gray-200">
                {edges.map(({ node }) => (
                  <tr key={node.id} className="[&>td]:py-4 [&>td]:text-left [&>td]:text-sm [&>td]:font-normal [&>td]:text-[var(--color-secondary-800)] [&>td]:pr-1">
                    <td>
                      <CommonButton
                        className="p-0 text-sm"
                        variant="tertiary"
                        onClick={() => {
                          setSelectedOrderId(node.token);
                          setIsModalOpen(true);
                        }}
                      >
                        View Details
                      </CommonButton>
                    </td>
                    <td className="whitespace-nowrap text-sm font-medium text-gray-900">#{node.number ?? node.id}</td>
                    <td className="whitespace-nowrap text-sm text-gray-500">{new Date(node.created).toLocaleDateString()}</td>
                    <td className="whitespace-nowrap">
                      <StatusTag label={node.status} className="lg:min-w-36 text-center" />
                    </td>
                    <td>
                      <CommonButton
                        className="p-0 cursor-not-allowed opacity-50 hover:text-normal text-sm lg:text-base"
                        variant="tertiarySecondary"
                      >
                        Request Return
                      </CommonButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table >
          </div >
        )
        }
      </div >
      <div className="relative z-20">
        <OrderDetailsModal
          orderId={selectedOrderId || ""}
          isModalOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    </>
  );
}

export default function OrderHistoryPage() {
  return (
    <Suspense fallback={<LoadingUI />}>
      <OrderHistoryPageContent />
    </Suspense>
  );
}
