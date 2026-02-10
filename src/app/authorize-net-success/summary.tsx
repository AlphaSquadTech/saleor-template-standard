"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import CommonButton from "../components/reuseableUI/commonButton";
import EmptyState from "../components/reuseableUI/emptyState";
import LoadingUI from "../components/reuseableUI/loadingUI";
import { ArrowIcon } from "../utils/svgs/arrowIcon";
import { SuccessTickIcon } from "../utils/svgs/cart/successTickIcon";
import { useGlobalStore } from "@/store/useGlobalStore";
import Image from "next/image";

interface OrderDetails {
  id: string;
  number: string;
  status: string;
  total: {
    gross: {
      amount: number;
      currency: string;
    };
  };
  subtotal?: {
    gross: {
      amount: number;
      currency: string;
    };
  } | null;
  shippingPrice?: {
    gross: {
      amount: number;
      currency: string;
    };
  } | null;
  userEmail: string;
  created: string;
  lines: Array<{
    id: string;
    productName: string;
    variantName: string;
    quantity: number;
    unitPrice: {
      gross: {
        amount: number;
        currency: string;
      };
    };
    totalPrice: {
      gross: {
        amount: number;
        currency: string;
      };
    };
    thumbnail: {
      url: string;
      alt: string;
    };
    variant: {
      product: {
        category: {
          name: string;
        };
      };
    };
  }>;
  shippingAddress?: {
    firstName: string;
    lastName: string;
    streetAddress1: string;
    city: string;
    postalCode: string;
    country: {
      code: string;
    };
  };
  billingAddress?: {
    firstName: string;
    lastName: string;
    streetAddress1: string;
    city: string;
    postalCode: string;
    country: {
      code: string;
    };
  };
}

function formatDateTime(ts: string | Date) {
  const d = ts instanceof Date ? ts : new Date(ts);
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const HH = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${MM}-${dd} ${HH}:${mm}`;
}

export default function AuthorizeNetSummary() {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const { finalizeCheckoutCleanup } = useGlobalStore();

  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  useEffect(() => {
    const loadOrderDetails = async () => {
      try {
        if (!orderId) {
          throw new Error("Missing order ID in URL parameters");
        }


        // Query order details from Saleor
        const response = await fetch(
          process.env.NEXT_PUBLIC_API_URL || "/api/graphql",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: `
              query GetOrder($id: ID!) {
                order(id: $id) {
                  id
                  number
                  status
                  total {
                    gross {
                      amount
                      currency
                    }
                  }
                  subtotal {
                    gross {
                      amount
                      currency
                    }
                  }
                  shippingPrice {
                    gross {
                      amount
                      currency
                    }
                  }
                  userEmail
                  created
                  lines {
                    id
                    productName
                    variantName
                    quantity
                    unitPrice {
                      gross {
                        amount
                        currency
                      }
                    }
                    totalPrice {
                      gross {
                        amount
                        currency
                      }
                    }
                    thumbnail(size: 200) {
                      url
                      alt
                    }
                    variant {
                      product {
                        category {
                          name
                        }
                      }
                    }
                  }
                  shippingAddress {
                    firstName
                    lastName
                    streetAddress1
                    city
                    postalCode
                    country {
                      code
                    }
                  }
                  billingAddress {
                    firstName
                    lastName
                    streetAddress1
                    city
                    postalCode
                    country {
                      code
                    }
                  }
                }
              }
            `,
              variables: {
                id: orderId,
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch order details: ${response.status}`);
        }

        const data = await response.json();

        if (data.errors) {
          throw new Error(`GraphQL error: ${data.errors[0].message}`);
        }

        if (!data.data.order) {
          throw new Error("Order not found");
        }

        setOrderDetails(data.data.order);

        // Clean up the checkout state
        finalizeCheckoutCleanup();

        setLoading(false);
      } catch (error) {
        console.error("Error loading order details:", error);
        setErrorMsg(
          error instanceof Error
            ? error.message
            : "Failed to load order details"
        );
        setLoading(false);
      }
    };

    loadOrderDetails();
  }, [orderId, finalizeCheckoutCleanup]);

  const handleContinueShopping = () => {
    router.push("/products/all");
  };

  const handleViewOrders = () => {
    // Add cache busting parameter to force fresh data load
    router.push(`/account/orders?t=${Date.now()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingUI />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyState
          icon={<div className="text-red-500 text-6xl">⚠️</div>}
          text="Payment Confirmation Error"
          textParagraph={errorMsg}
          buttonLabel="Continue Shopping"
          onClick={handleContinueShopping}
        />
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyState
          icon={<div className="text-gray-500 text-6xl">📄</div>}
          text="No Order Details Found"
          textParagraph="Order details could not be retrieved."
          buttonLabel="Continue Shopping"
          onClick={handleContinueShopping}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-24 grid grid-cols-3 gap-14">
      <div className="col-span-2 border-r border-[var(--color-secondary-200)] pr-14">
        <div className="flex items-center w-full justify-between pb-8">
          <div className="flex items-center gap-2">
            <span className="[&>svg]:size-10">{SuccessTickIcon}</span>
            <div className="space-y-1">
              <p className="uppercase font-medium text-xl font-secondary text-[var(--color-secondary-800)]">
                THANK YOU,{" "}
                {orderDetails.shippingAddress
                  ? orderDetails.shippingAddress.firstName
                  : orderDetails.billingAddress?.firstName || "Customer"}
                !
              </p>
              <p className="font-normal text-sm font-secondary text-[var(--color-secondary-600)]">
                YOUR ORDER HAS BEEN CONFIRMED.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 cursor-pointer">
            <CommonButton
              onClick={handleContinueShopping}
              className="p-0"
              content="CONTINUE SHOPPING"
              variant="tertiary"
            />
            <span className="size-5 text-[var(--color-primary-600)]">
              {ArrowIcon}
            </span>
          </div>
        </div>

        <div className="p-10 border border-[var(--color-secondary-200)]">
          <div className="grid gap-3">
            <div className="space-y-5">
              <p className="text-xl font-semibold leading-7 tracking-[-0.05px] text-[var(--color-secondary-800)]">
                ORDER DETAILS
              </p>
              <div className="flex flex-col items-start gap-3 uppercase text-[var(--color-secondary-600)] font-normal text-sm font-secondary">
                <div className="flex items-center gap-1">
                  <p className=" text-sm font-normal leading-5 tracking-[-0.035px] text-[var(--color-secondary-600)]">
                    Order Number
                  </p>
                  <p className="text-[var(--color-secondary-800)] text-sm font-semibold leading-5 tracking-[-0.035px]">
                    {orderDetails.number}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <p className=" text-sm font-normal leading-5 tracking-[-0.035px] text-[var(--color-secondary-600)]">
                    Placed on
                  </p>
                  <p className="text-[var(--color-secondary-800)] text-sm font-semibold leading-5 tracking-[-0.035px]">
                    {formatDateTime(orderDetails.created)}
                  </p>
                </div>
              </div>
            </div>

            <hr className="border border-[var(--color-secondary-200)]" />

            <div className="flex flex-col gap-2">
              {orderDetails.lines.map((item) => (
                <div
                  className="flex items-center justify-between gap-5"
                  key={item.id}
                >
                  <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden">
                    {item.thumbnail?.url ? (
                      <Image
                        src={item.thumbnail.url}
                        alt={item.thumbnail.alt || item.productName}
                        className="object-contain w-full h-full"
                        width={80}
                        height={80}
                      />
                    ) : (
                      <div className="bg-gray-100 flex items-center justify-center w-full h-full">
                        <span className="text-sm text-gray-500">No Image</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-normal leading-5 tracking-[-0.035px]">
                      {item.variant?.product?.category?.name || "Product"}
                    </span>
                    <span className="font-medium text-xl leading-7 tracking[-0.05px]">
                      {item.productName} x
                    </span>
                    <span>
                      <span
                        style={{ color: "var(--color-secondary-600)" }}
                        className="text-sm font-normal leading-5 tracking-[-0.035px] mt-3"
                      >
                        QTY
                      </span>{" "}
                      <span className="text-sm font-semibold leading-5 tracking-[-0.035px] uppercase">
                        {item.quantity}
                      </span>
                    </span>
                  </div>
                  <span className="text-xl font-semibold leading-7 tracking-[-0.05px]">
                    {item.totalPrice.gross.amount.toFixed(2)}
                    {item.totalPrice.gross.currency}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <hr className="my-4 border border-[var(--color-secondary-200)]" />

          <div>
            <h2 className="text-xl not-italic font-semibold leading-7 tracking-[-0.05px] text-[var(--color-secondary-800)] uppercase  mb-4">
              Shipping Address
            </h2>
            <p className="flex items-center gap-2 text-xl not-italic font-medium leading-7 tracking-[-0.05px] font-secondary text-[var(--color-secondary-800)]">
              <span>{orderDetails.shippingAddress?.streetAddress1}</span>
              <span>
                {orderDetails.shippingAddress?.city},{" "}
                {orderDetails.shippingAddress?.postalCode}
              </span>
              <span>{orderDetails.shippingAddress?.country.code}</span>
            </p>
          </div>

          <hr className="my-4 border border-[var(--color-secondary-200)]" />
          <div>
            <h2 className="text-xl font-secondary text-[var(--color-secondary-800)] uppercase font-semibold mb-4">
              Billing Address
            </h2>
            <p className="flex items-center gap-2 text-medium text-xl font-secondary text-[var(--color-secondary-800)]">
              <span>{orderDetails.billingAddress?.streetAddress1}</span>
              <span>
                {orderDetails.billingAddress?.city},{" "}
                {orderDetails.billingAddress?.postalCode}
              </span>
              <span>{orderDetails.billingAddress?.country.code}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="col-span-1 flex flex-col">
        <h2 className="font-medium font-secondary text-base text-[var(--color-secondary-800)] text-start pb-3 uppercase">
          Summary
        </h2>

        <div className="w-full text-normal text-[var(--color-secondary-600)] text-base">
          <div className="flex justify-between mb-2">
            <span>Sub-Total</span>
            <span className="font-medium">
              {orderDetails.subtotal?.gross
                ? `${orderDetails.subtotal.gross.amount.toFixed(2)} ${
                    orderDetails.subtotal.gross.currency
                  }`
                : `${orderDetails.total.gross.amount.toFixed(2)} ${
                    orderDetails.total.gross.currency
                  }`}
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Tax</span>
            <span className="font-medium">N/A</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Shipping Cost</span>
            <span className="font-medium">
              {orderDetails.shippingPrice?.gross
                ? `${orderDetails.shippingPrice.gross.amount.toFixed(2)} ${
                    orderDetails.shippingPrice.gross.currency
                  }`
                : `0.00 ${orderDetails.total.gross.currency}`}
            </span>
          </div>
          <div className="border-t border-gray-200 pt-4 flex justify-between text-xl text-[var(--color-secondary-600)] font-medium ">
            <span>TOTAL</span>
            <span className="font-semibold text-[var(--color-secondary-800)]">
              {orderDetails.total.gross.amount.toFixed(2)}{" "}
              {orderDetails.total.gross.currency}
            </span>
          </div>
        </div>

        <div className="mt-8">
          <CommonButton
            onClick={handleViewOrders}
            variant="primary"
            className="w-full mb-4"
          >
            VIEW MY ORDERS
          </CommonButton>
        </div>
      </div>
    </div>
  );
}
