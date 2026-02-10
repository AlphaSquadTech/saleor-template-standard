import EmptyState from "@/app/components/reuseableUI/emptyState";
import LoadingUI from "@/app/components/reuseableUI/loadingUI";
import ModalLayout from "@/app/components/reuseableUI/modalLayout";
import StatusTag from "@/app/components/reuseableUI/statusTag";
import {
  ORDER_DETAIL,
  type OrderDetailData,
  type OrderLine,
  type MetadataItem,
} from "@/graphql/queries/orderDetail";
import { useQuery } from "@apollo/client";
import Image from "next/image";
import { useMemo } from "react";

// Types for option set handling
type OptionSetMetadata = {
  name: string;
  label: string;
  type?: string;
  hidden?: boolean;
  deselect?: string;
  required?: boolean;
  base_product_required?: boolean;
};

type OptionItem = {
  lineId: string;
  variantId: string;
  variantName: string;
  optionSetLabel: string;
  price: number;
  currency: string;
};

type CustomInput = {
  key: string;
  value: string;
};

type GroupedOrderItem = {
  id: string;
  name: string;
  variantName: string | null;
  category: string;
  thumbnail: { url: string; alt: string | null } | null;
  quantity: number;
  basePrice: number;
  totalPrice: { gross: { amount: number; currency: string } };
  currency: string;
  options: OptionItem[];
  customInputs: CustomInput[];
};

// Helper to parse option_set metadata from a variant
function parseOptionSetMetadata(
  metadata: MetadataItem[] | null | undefined
): OptionSetMetadata | null {
  if (!metadata) return null;
  const optionMeta = metadata.find((m) => m.key === "option_set");
  if (!optionMeta?.value) return null;
  try {
    return JSON.parse(optionMeta.value) as OptionSetMetadata;
  } catch {
    return null;
  }
}

// Helper to extract custom inputs from line metadata (non-SKU option sets)
function extractCustomInputs(
  lineMetadata: MetadataItem[] | null | undefined
): CustomInput[] {
  if (!lineMetadata || lineMetadata.length === 0) return [];

  // Filter out system metadata keys that aren't custom inputs
  const systemKeys = new Set([
    "__typename",
    "option_set",
    "wsm_availability",
    "wsm_brand",
    "wsm_condition",
    "wsm_cost",
    "wsm_dealer_id",
    "wsm_height",
    "wsm_id",
    "wsm_inventory",
    "wsm_length",
    "wsm_price",
    "wsm_sale_price",
    "wsm_upscode",
    "wsm_width",
  ]);

  return lineMetadata
    .filter((m) => !systemKeys.has(m.key))
    .map((m) => ({ key: m.key, value: m.value }));
}

// Group order lines by product, separating base products from options
function groupOrderLines(lines: OrderLine[]): GroupedOrderItem[] {
  // Build a map of product ID -> lines for that product
  const productMap = new Map<
    string,
    {
      baseLine: OrderLine | null;
      optionLines: Array<{
        line: OrderLine;
        optionMeta: OptionSetMetadata;
      }>;
    }
  >();

  for (const line of lines) {
    const variant = line.variant;
    if (!variant) {
      // Line has no variant info - treat as standalone item
      const standaloneId = `standalone-${line.id}`;
      productMap.set(standaloneId, { baseLine: line, optionLines: [] });
      continue;
    }

    const productId = variant.product.id;
    const optionMeta = parseOptionSetMetadata(variant.metadata);

    if (!productMap.has(productId)) {
      productMap.set(productId, { baseLine: null, optionLines: [] });
    }

    const entry = productMap.get(productId)!;

    if (optionMeta) {
      // This is an option variant (SKU-based option set)
      entry.optionLines.push({ line, optionMeta });
    } else {
      // This is a base product variant
      entry.baseLine = line;
    }
  }

  // Convert the map into grouped items
  const groupedItems: GroupedOrderItem[] = [];

  for (const [, entry] of productMap) {
    const { baseLine, optionLines } = entry;

    // Determine the display line (prefer base, fall back to first option)
    const displayLine = baseLine ?? optionLines[0]?.line;
    if (!displayLine) continue;

    const variant = displayLine.variant;
    const productName = displayLine.productName ?? variant?.product.name ?? "Unknown Product";
    const variantName = displayLine.variantName;
    const category = variant?.product.category?.name ?? "Uncategorized";
    const thumbnail = displayLine.thumbnail;

    // Calculate base price (0 if no base line)
    let basePrice = 0;
    if (baseLine) {
      basePrice = baseLine.totalPrice.gross.amount;
    }

    // Build SKU-based options array
    const options: OptionItem[] = optionLines.map(({ line, optionMeta }) => ({
      lineId: line.id,
      variantId: line.variant?.id ?? "",
      variantName: line.variant?.name ?? line.variantName ?? "",
      optionSetLabel: optionMeta.label || optionMeta.name,
      price: line.totalPrice.gross.amount,
      currency: line.totalPrice.gross.currency,
    }));

    // Extract non-SKU custom inputs from line metadata
    const customInputs = extractCustomInputs(displayLine.metadata);

    // Calculate combined total price
    const combinedAmount = basePrice + options.reduce((sum, opt) => sum + opt.price, 0);
    const currency = displayLine.totalPrice.gross.currency || options[0]?.currency || "USD";

    groupedItems.push({
      id: displayLine.id,
      name: productName,
      variantName,
      category,
      thumbnail,
      quantity: displayLine.quantity,
      basePrice,
      totalPrice: {
        gross: { amount: combinedAmount, currency },
      },
      currency,
      options,
      customInputs,
    });
  }

  return groupedItems;
}

const OrderDetailsModal = ({
  orderId,
  isModalOpen,
  onClose,
}: {
  orderId: string;
  isModalOpen: boolean;
  onClose: () => void;
}) => {
  const { data, loading, error } = useQuery<OrderDetailData>(ORDER_DETAIL, {
    variables: { token: orderId },
    skip: !orderId,
  });
  const order = data?.orderByToken || null;

  // Group order lines by product with options
  const groupedLines = useMemo(() => {
    if (!order?.lines) return [];
    return groupOrderLines(order.lines);
  }, [order?.lines]);

  return (
    <ModalLayout isModalOpen={isModalOpen} onClose={onClose}>
      <div>
        {loading ? (
          <LoadingUI className="h-[30vh]" />
        ) : error ? (
          <EmptyState text="Unable to load order details." className="h-[30vh]" />
        ) : !order ? (
          <EmptyState text="Order not found." className="h-[30vh]" />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-5 pb-4">
              <div className="flex items-center gap-2">
                <p className="font-semibold font-secondary text-[var(--color-secondary-800)] ">
                  ORDER DETAILS
                </p>
                <StatusTag label={order.statusDisplay || order.status} />
              </div>
              <div className="flex items-center gap-10 uppercase text-[var(--color-secondary-600)] font-normal text-sm font-secondary">
                <div className="flex items-center gap-1">
                  <p>Order Number</p>
                  <p className="text-[var(--color-secondary-800)] font-semibold">
                    {order.number ?? order.id}
                  </p>
                </div>
                <div className="flex items-center  gap-1">
                  <p>Placed on</p>
                  <p className="text-[var(--color-secondary-800)] font-semibold">
                    {new Date(order.created).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-y border-[var(--color-secondary-200)] py-4">
              {groupedLines.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start border-b border-gray-100 pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                    {item.thumbnail?.url ? (
                      <Image
                        src={item.thumbnail.url}
                        alt={item.thumbnail.alt || item.name}
                        className="object-contain w-full h-full"
                        width={150}
                        height={150}
                      />
                    ) : null}
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="font-medium text-xs md:text-base text-[var(--color-secondary-800)]">
                      {item.name}
                    </h3>
                    {/* Display SKU-based options */}
                    {item.options.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {item.options.map((option) => (
                          <div
                            key={option.lineId}
                            className="text-xs text-[var(--color-secondary-600)] flex items-center gap-1"
                          >
                            <span className="text-[var(--color-primary-600)]">+</span>
                            <span className="font-medium">{option.optionSetLabel}:</span>
                            <span>{option.variantName}</span>
                            {option.price > 0 && (
                              <span className="text-[var(--color-primary-600)]">
                                (+{new Intl.NumberFormat(undefined, {
                                  style: "currency",
                                  currency: option.currency,
                                }).format(option.price)})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Display non-SKU custom inputs */}
                    {item.customInputs.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {item.customInputs.map((input, idx) => (
                          <div
                            key={`${input.key}-${idx}`}
                            className="text-xs text-[var(--color-secondary-600)] flex items-center gap-1"
                          >
                            <span className="font-medium">{input.key}:</span>
                            <span>{input.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-gray-600 text-xs md:text-sm mt-1">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <div className="font-semibold pl-4 lg:pl-0 whitespace-nowrap">
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: item.totalPrice.gross.currency,
                    }).format(item.totalPrice.gross.amount)}
                  </div>
                </div>
              ))}
            </div>
            {order.shippingAddress && (
              <div className="border-b pb-4 border-[var(--color-secondary-200)]">
                <h2 className="text-xl font-secondary text-[var(--color-secondary-800)] uppercase font-semibold mb-4">Shipping Address</h2>
                <div className='flex items-center gap-2 text-medium text-xl font-secondary text-[var(--color-secondary-800)]'>
                  {order.shippingAddress?.streetAddress1}
                  {order.shippingAddress?.streetAddress2
                    ? `, ${order.shippingAddress?.streetAddress2}`
                    : ""}
                  {order.shippingAddress?.city},{" "}
                  {order.shippingAddress?.countryArea}{" "}

                </div>
                <p className='text-medium text-lg font-secondary text-[var(--color-secondary-500)]'>{order.shippingAddress?.phone}</p>

              </div>
            )}
            {
              order.billingAddress && (
                <div className="border-b pb-4 border-[var(--color-secondary-200)]">
                  <h2 className="text-xl font-secondary text-[var(--color-secondary-800)] uppercase font-semibold mb-4">Billing Address</h2>
                  <p className="text-gray-600">
                    {order.billingAddress?.firstName} {order.billingAddress?.lastName}
                    <br />
                    {order.billingAddress?.streetAddress1}
                    {order.billingAddress?.streetAddress2
                      ? `, ${order.billingAddress?.streetAddress2}`
                      : ""}
                    <br />
                    {order.billingAddress?.city}, {order.billingAddress?.countryArea}{" "}
                    {order.billingAddress?.postalCode}
                  </p>
                </div>
              )}
            {
              order.shippingMethodName && (
                <div className="border-b pb-4 border-[var(--color-secondary-200)]">
                  <h2 className="text-xl font-secondary text-[var(--color-secondary-800)] uppercase font-semibold mb-4">DELIVERY METHOD</h2>
                  <p className="text-gray-600">
                    {order.shippingMethodName}
                  </p>
                </div>
              )}
            <div>
              <h2 className="text-xl uppercase font-secondary font-semibold mb-4">
                Summary
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: order.subtotal.gross.currency,
                    }).format(order.subtotal.gross.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: order.shippingPrice.gross.currency,
                    }).format(order.shippingPrice.gross.amount)}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-4 flex justify-between font-medium text-xl text-[var(--color-secondary-600)]">
                  <span>Total</span>
                  <span className="text-[var(--color-primary-600)] font-semibold">
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: order.total.gross.currency,
                    }).format(order.total.gross.amount)}
                  </span>
                </div>
              </div>
            </div>


          </div>
        )}
      </div>
    </ModalLayout>
  );
};

export default OrderDetailsModal;
