"use client";

import Breadcrumb from "@/app/components/reuseableUI/breadcrumb";
import CommonButton from "@/app/components/reuseableUI/commonButton";
import PrimaryButton from "@/app/components/reuseableUI/primaryButton";
import Toast from "@/app/components/reuseableUI/Toast";
import EditorRenderer from "@/app/components/richText/EditorRenderer";
import { MinusIcon } from "@/app/utils/svgs/minusIcon";
import { PlusIcon } from "@/app/utils/svgs/plusIcon";
import { ProductInquiryIcon } from "@/app/utils/svgs/productInquiryIcon";
import { SpinnerIcon } from "@/app/utils/svgs/spinnerIcon";
import { CHECKOUT_CREATE } from "@/graphql/mutations/checkoutCreate";
import {
  FIND_PRODUCT_BY_OLD_SLUG,
  type FindProductByOldSlugData,
  type FindProductByOldSlugVars,
} from "@/graphql/queries/findProductByOldSlug";
import {
  AncillaryPage,
  fetchPageBySlug,
} from "@/graphql/queries/getPageBySlug";
import {
  ME_ADDRESSES_QUERY,
  type MeAddressesData,
} from "@/graphql/queries/meAddresses";
import {
  PRODUCT_DETAILS_BY_ID,
  type ProductDetailsByIdData,
  type ProductDetailsByIdVars,
  type ProductVariant,
} from "@/graphql/queries/productDetailsById";
import {
  UPDATE_CHECKOUT_LINE_METADATA,
  type MetadataInput,
} from "@/graphql/mutations/checkoutLineMetadataUpdate";
import { generateBreadcrumbSchema, generateProductSchema } from "@/lib/schema";
import { useGlobalStore, type CartItemOption } from "@/store/useGlobalStore";
import { useQuery } from "@apollo/client";
import Image from "next/image";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppConfiguration } from "../../components/providers/ServerAppConfigurationProvider";
import {
  gtmAddToCart,
  gtmViewItem,
  Product,
} from "../../utils/googleTagManager";
import ItemInquiryModal from "./components/itemInquiryModal";
import { SwiperArrowIconLeft } from "@/app/utils/svgs/swiperArrowIconLeft";
import { SwiperArrowIconRight } from "@/app/utils/svgs/swiperArrowIconRight";
import { shopApi, type PLOptionSet } from "@/lib/api/shop";
/* ---------------- helpers (local) ---------------- */
type AddressInputTS = {
  firstName: string;
  lastName: string;
  streetAddress1: string;
  city: string;
  postalCode: string;
  country: string;
  countryArea?: string;
  phone?: string;
};

type CheckoutLineInputTS = { variantId: string; quantity: number };

function resolveEndpoint() {
  const raw = process.env.NEXT_PUBLIC_API_URL || "/api/graphql";
  const lower = raw.trim().toLowerCase();
  return /\/graphql\/?$/.test(lower)
    ? raw.trim()
    : raw.replace(/\/+$/, "") + "/graphql";
}

async function createCheckout(input: {
  channel: string;
  email: string;
  lines: CheckoutLineInputTS[];
  shippingAddress?: AddressInputTS;
  billingAddress?: AddressInputTS;
}) {
  const res = await fetch(resolveEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: CHECKOUT_CREATE, variables: { input } }),
  });
  if (!res.ok) throw new Error("Failed to create checkout");
  const json = await res.json();
  const errs = json?.data?.checkoutCreate?.errors;
  if (Array.isArray(errs) && errs.length)
    throw new Error(errs[0]?.message || "Checkout creation error");
  const id: string | undefined = json?.data?.checkoutCreate?.checkout?.id;
  const token: string | undefined = json?.data?.checkoutCreate?.checkout?.token;
  if (!id) throw new Error("No checkout id returned");
  return { checkoutId: id, checkoutToken: token };
}

function clearStoredCheckout() {
  try {
    localStorage.removeItem("checkoutId");
    localStorage.removeItem("checkoutToken");
  } catch {}
}
/* ------------------------------------------------ */

type EditorBlock =
  | { id: string; type: "paragraph"; data: { text: string } }
  | { id: string; type: "header"; data: { text: string; level?: number } }
  | {
      id: string;
      type: "list";
      data: { items: string[]; style?: "ordered" | "unordered" };
    }
  | {
      id: string;
      type: "quote";
      data: {
        text: string;
        caption?: string;
        alignment?: "left" | "center" | "right";
      };
    };

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [pdpContent, setPDPContent] = useState<AncillaryPage | null>(null);
  // The URL param contains the normalized slug (with single dashes)
  // We need to pass the original Saleor slug for the API query
  // Since we can't perfectly reconstruct it, we just use the normalized version
  // and rely on Saleor's flexible slug matching
  const slug = params?.id ? decodeURIComponent(params.id as string) : "";

  const channel = process.env.NEXT_PUBLIC_SALEOR_CHANNEL || "default-channel";
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const {
    addToCart,
    isLoggedIn,
    user,
    guestEmail,
    guestShippingInfo,
    setCheckoutId,
    setCheckoutToken,
  } = useGlobalStore();

  const { getGoogleTagManagerConfig } = useAppConfiguration();
  const gtmConfig = getGoogleTagManagerConfig();

  const { data, loading, error } = useQuery<
    ProductDetailsByIdData,
    ProductDetailsByIdVars
  >(PRODUCT_DETAILS_BY_ID, {
    variables: { slug, channel },
    skip: !slug,
    fetchPolicy: "cache-first", // Use cache-first for better performance
    nextFetchPolicy: "cache-first", // Maintain cache-first on refetch
  });

  // Query to find product by old slug if the main query returns no product
  const shouldSkipOldSlugQuery = !slug || loading || !!data?.product;

  const {
    data: oldSlugData,
    loading: oldSlugLoading,
    fetchMore,
  } = useQuery<FindProductByOldSlugData, FindProductByOldSlugVars>(
    FIND_PRODUCT_BY_OLD_SLUG,
    {
      variables: { channel, first: 100 }, // Changed from 250 to 100 to match API limit
      skip: shouldSkipOldSlugQuery, // Only run if main query completed and found no product
      fetchPolicy: "cache-first", // Use cache-first for better performance
      nextFetchPolicy: "cache-first", // Maintain cache-first on refetch
    }
  );
  useEffect(() => {
    const fetchPageContent = async () => {
      if (
        product?.metadata.find((item) => item?.key === "availability")
          ?.value === "Please Call" ||
        product?.metadata.find((item) => item?.key === "availability")
          ?.value === "Available"
      )
        return;
      try {
        const pdpContentRenderer = await fetchPageBySlug(
          "call-for-availability"
        );
        setPDPContent(pdpContentRenderer);
      } catch (error) {
        console.error("Error fetching page content:", error);
      }
    };

    fetchPageContent();
  }, []);

  // State for tracking pagination
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [allProductsChecked, setAllProductsChecked] = useState(false);

  // Find product with matching old_slug or redirects in metadata (client-side filtering)
  const productWithOldSlug = useMemo(() => {
    if (!oldSlugData?.products?.edges || !slug) {
      return null;
    }

    const foundProduct =
      oldSlugData.products.edges.find((edge) => {
        // Check for "old_slug" metadata key
        const oldSlugMeta = edge.node.metadata?.find(
          (meta) => meta.key === "old_slug" && meta.value === slug
        );

        if (oldSlugMeta) {
          return true;
        }

        // Check for "redirects" metadata key (which can contain JSON array or comma-separated string)
        const redirectsMeta = edge.node.metadata?.find(
          (meta) => meta.key === "redirects"
        );

        if (redirectsMeta) {
          try {
            let redirects: string[] = [];
            let redirectsValue = redirectsMeta.value.trim();

            // Try to parse as JSON array first
            if (redirectsValue.startsWith("[")) {
              try {
                // Fix common JSON formatting issues
                redirectsValue = redirectsValue.replace(/\[([^"[])/g, '["$1'); // Add missing opening quote after [
                redirectsValue = redirectsValue.replace(/([^"\]])\]/g, '$1"]'); // Add missing closing quote before ]

                redirects = JSON.parse(redirectsValue);
              } catch (jsonError) {
                // If JSON parse fails, try comma-separated format
                redirects = redirectsValue
                  .replace(/^\[|\]$/g, "") // Remove [ and ]
                  .split(",")
                  .map((s) => s.trim().replace(/^["']|["']$/g, "")); // Remove quotes and trim
              }
            } else {
              // Handle comma-separated string format (no brackets)
              redirects = redirectsValue
                .split(",")
                .map((s) => s.trim().replace(/^["']|["']$/g, "")); // Remove quotes and trim
            }

            // Check if current slug matches any redirect
            const hasMatch =
              Array.isArray(redirects) &&
              redirects.some((redirect) => redirect === slug);

            if (hasMatch) {
              return true;
            }
          } catch (parseError) {
            // Silent fail - continue to next product
          }
        }

        return false;
      })?.node || null;

    return foundProduct;
  }, [oldSlugData, slug]);

  // Auto-fetch more products if not found in current batch and more pages exist
  useEffect(() => {
    const shouldFetchMore =
      !loading &&
      !data?.product &&
      !oldSlugLoading &&
      !productWithOldSlug &&
      !isFetchingMore &&
      !allProductsChecked &&
      oldSlugData?.products?.pageInfo?.hasNextPage &&
      oldSlugData?.products?.pageInfo?.endCursor;

    if (shouldFetchMore && fetchMore) {
      setIsFetchingMore(true);

      fetchMore({
        variables: {
          after: oldSlugData.products.pageInfo.endCursor,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          setIsFetchingMore(false);

          if (!fetchMoreResult) {
            setAllProductsChecked(true);
            return prev;
          }

          // Check if there are no more pages
          if (!fetchMoreResult.products.pageInfo.hasNextPage) {
            setAllProductsChecked(true);
          }

          // Merge the results
          return {
            products: {
              ...fetchMoreResult.products,
              edges: [
                ...prev.products.edges,
                ...fetchMoreResult.products.edges,
              ],
            },
          };
        },
      }).catch((error) => {
        setIsFetchingMore(false);
        setAllProductsChecked(true);
      });
    }
  }, [
    loading,
    data?.product,
    oldSlugLoading,
    productWithOldSlug,
    isFetchingMore,
    allProductsChecked,
    oldSlugData,
    fetchMore,
  ]);

  // Prefill addresses for logged-in users (optional, non-blocking)
  const { data: meData } = useQuery<MeAddressesData>(ME_ADDRESSES_QUERY, {
    skip: !isLoggedIn,
  });

  const accountShipping = useMemo(() => {
    const me = meData?.me;
    if (!me || !me.addresses?.length) return null;
    const defId = me.defaultShippingAddress?.id;
    return (
      (defId ? me.addresses.find((a) => a.id === defId) : me.addresses[0]) ||
      null
    );
  }, [meData]);

  const accountBilling = useMemo(() => {
    const me = meData?.me;
    if (!me || !me.addresses?.length) return null;
    const defId = me.defaultBillingAddress?.id;
    return (
      (defId
        ? me.addresses.find((a) => a.id === defId)
        : accountShipping || me.addresses[0]) || null
    );
  }, [meData, accountShipping]);

  const product = data?.product ?? null;
  const [isComingFromRedirect, setIsComingFromRedirect] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("productRedirecting") === "true";
    }
    return false;
  });

  useEffect(() => {
    if (product && isComingFromRedirect) {
      sessionStorage.removeItem("productRedirecting");
      setIsComingFromRedirect(false);
    }
  }, [product, isComingFromRedirect]);

  // Handle redirect if old slug is found
  useEffect(() => {
    if (!loading && !data?.product && !oldSlugLoading && productWithOldSlug) {
      const newSlug = productWithOldSlug.slug;

      sessionStorage.setItem("productRedirecting", "true");

      // Redirect to the new slug, preserving any query parameters
      const currentParams = searchParams.toString();
      const newUrl = `/product/${newSlug}${
        currentParams ? `?${currentParams}` : ""
      }`;

      router.replace(newUrl);
    }
  }, [
    loading,
    data?.product,
    oldSlugLoading,
    productWithOldSlug,
    router,
    searchParams,
    slug,
  ]);
  const images = product?.media ?? [];
  const firstImageUrl = images[0]?.url ?? "";

  // Track product view when product data is loaded
  useEffect(() => {
    if (product && !loading) {
      const productData: Product = {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category?.name || "Products",
        price: product.pricing?.priceRange?.start?.gross?.amount || 0,
        currency: product.pricing?.priceRange?.start?.gross?.currency || "USD",
        item_brand: product.category?.name || undefined,
      };

      gtmViewItem(
        [productData],
        productData.currency,
        productData.price,
        gtmConfig?.container_id
      );
    }
  }, [product, loading]);
  const [selectedImage, setSelectedImage] = useState<string>(firstImageUrl);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null
  );
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdding, setIsAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Option Sets State
  const [plOptionSets, setPlOptionSets] = useState<PLOptionSet[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionSetSelections, setOptionSetSelections] = useState<
    Record<string, string[]>
  >({});
  const [nonSkuInputs, setNonSkuInputs] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Fetch option sets from PL API
  useEffect(() => {
    if (!product?.id) return;
    setOptionsLoading(true);
    shopApi
      .getProductOptionSets(product.id)
      .then((res) => setPlOptionSets(res.data ?? []))
      .catch(() => setPlOptionSets([]))
      .finally(() => setOptionsLoading(false));
  }, [product?.id]);

  // Variant-scoped option sets (enum / multi-enum) — have `variants` array
  const variantOptionSets = useMemo(
    () =>
      plOptionSets.filter(
        (os) => os.type === "enum" || os.type === "multi-enum",
      ),
    [plOptionSets],
  );

  // Product-scoped option sets (text / date / date-time / image) — no `variants`
  const productOptionSets = useMemo(
    () =>
      plOptionSets.filter(
        (os) =>
          os.type === "text" ||
          os.type === "date" ||
          os.type === "date-time" ||
          os.type === "image",
      ),
    [plOptionSets],
  );

  // Set of variant IDs that belong to option sets
  const optionSetVariantIds = useMemo(() => {
    const ids = new Set<string>();
    for (const os of variantOptionSets) {
      for (const v of os.variants ?? []) {
        ids.add(v.product_variant_id);
      }
    }
    return ids;
  }, [variantOptionSets]);

  // Get variants that are NOT part of any option set (for regular variant selection)
  const regularVariants = useMemo(
    () =>
      product?.variants?.filter((v) => !optionSetVariantIds.has(v.id)) ?? [],
    [product?.variants, optionSetVariantIds],
  );

  // Get the base variant (not part of any option set) for default selection
  const baseVariant = useMemo(() => {
    if (!product?.variants?.length) return null;
    return (
      product.variants.find((v) => !optionSetVariantIds.has(v.id)) ??
      product.variants[0]
    );
  }, [product?.variants, optionSetVariantIds]);

  // Validation function
  const validateOptionsAndInputs = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    // Validate required variant-scoped option sets
    for (const os of variantOptionSets) {
      if (os.required) {
        const selections = optionSetSelections[String(os.id)] || [];
        if (selections.length === 0) {
          errors[`optionSet_${os.id}`] = `${os.label} is required`;
        }
      }
    }

    // Validate required product-scoped option sets
    for (const os of productOptionSets) {
      if (os.required) {
        const value = nonSkuInputs[String(os.id)] || "";
        if (!value.trim()) {
          errors[`nonSku_${os.id}`] = `${os.label} is required`;
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [variantOptionSets, productOptionSets, optionSetSelections, nonSkuInputs]);

  // Handle option set selection
  const handleOptionSetChange = useCallback(
    (optionSetId: string, variantId: string, isMulti: boolean) => {
      setOptionSetSelections((prev) => {
        if (isMulti) {
          const current = prev[optionSetId] || [];
          if (current.includes(variantId)) {
            return {
              ...prev,
              [optionSetId]: current.filter((id) => id !== variantId),
            };
          } else {
            return {
              ...prev,
              [optionSetId]: [...current, variantId],
            };
          }
        } else {
          if (variantId === "") {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [optionSetId]: _removed, ...rest } = prev;
            return rest;
          }
          return {
            ...prev,
            [optionSetId]: [variantId],
          };
        }
      });
      // Clear validation error for this option set
      setValidationErrors((prev) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [`optionSet_${optionSetId}`]: _removed, ...rest } = prev;
        return rest;
      });
    },
    []
  );

  // Handle non-SKU input change
  const handleNonSkuInputChange = useCallback(
    (optionSetId: string, value: string) => {
      setNonSkuInputs((prev) => ({
        ...prev,
        [optionSetId]: value,
      }));
      // Clear validation error for this input
      setValidationErrors((prev) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [`nonSku_${optionSetId}`]: _removed, ...rest } = prev;
        return rest;
      });
    },
    []
  );

  // Function to update URL with SKU param
  const updateURL = useCallback(
    (
      sku: string | null,
      optionSelections: Record<string, string[]>,
      customInputs: Record<string, string>
    ) => {
      const params = new URLSearchParams();

      // Set SKU param
      if (sku) {
        params.set("sku", sku.replace(/\s+/g, "-"));
      }

      // Option set params disabled — only default variant SKU tracked in URL
      // for (const [optionSetId, variantIds] of Object.entries(optionSelections)) {
      //   if (variantIds.length === 0) continue;
      //   params.set(`os_${optionSetId}`, variantIds.join(","));
      // }

      // Custom input params disabled
      // for (const [optionSetId, value] of Object.entries(customInputs)) {
      //   if (value) {
      //     params.set(`ci_${optionSetId}`, value);
      //   }
      // }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router]
  );

  // Toast with unmount cleanup
  const [toast, setToast] = useState<{
    message: string;
    subParagraph?: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback(
    (
      message: string,
      subParagraph?: string,
      type: "success" | "error" | "info" = "info"
    ) => {
      setToast({ message, subParagraph, type });
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 2500);
    },
    []
  );
  const raw = product?.description || "";
  const lineHeight = 28; // px
  const maxLines = 10;
  const maxHeight = lineHeight * maxLines;
  const [showFull, setShowFull] = useState(false);
  const [isOverflow, setIsOverflow] = useState(false);
  const descriptionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (descriptionRef.current) {
      const height = descriptionRef.current.scrollHeight;
      if (height > maxHeight) {
        setIsOverflow(true);
      }
    }
  }, [raw]);

  const toggleShow = () => setShowFull(!showFull);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  // Keep selected image in sync with first loaded image (simpler, no useMemo)
  useEffect(() => {
    if (firstImageUrl) setSelectedImage(firstImageUrl);
  }, [firstImageUrl]);

  // Initialize variant selection from URL or default to first variant
  useEffect(() => {
    if (!product?.variants?.length || isInitialized) return;

    const skuFromURL = searchParams.get("sku");

    if (skuFromURL) {
      // Convert URL-friendly SKU back to original format (replace hyphens with spaces)
      const originalSKU = skuFromURL.replace(/-/g, " ");

      // Try to find variant by SKU from URL (check both formats for compatibility)
      const variantFromURL = product.variants.find(
        (v) => v.sku === originalSKU || v.sku === skuFromURL
      );

      if (variantFromURL) {
        setSelectedVariantId(variantFromURL.id);
      } else if (baseVariant?.id) {
        setSelectedVariantId(baseVariant.id);
      }
    } else if (baseVariant?.id) {
      // Default to base variant (without option_set metadata) if no SKU in URL
      setSelectedVariantId(baseVariant.id);
    }

    // Restore option set selections from URL
    if (variantOptionSets.length > 0) {
      const restoredSelections: Record<string, string[]> = {};
      for (const os of variantOptionSets) {
        const paramValue = searchParams.get(`os_${os.id}`);
        if (!paramValue) continue;
        const variantIds = paramValue.split(",").filter(Boolean);
        if (variantIds.length > 0) {
          restoredSelections[String(os.id)] = variantIds;
        }
      }
      if (Object.keys(restoredSelections).length > 0) {
        setOptionSetSelections(restoredSelections);
      }
    }

    // Restore non-SKU custom inputs from URL
    if (productOptionSets.length > 0) {
      const restoredInputs: Record<string, string> = {};
      for (const os of productOptionSets) {
        const paramValue = searchParams.get(`ci_${os.id}`);
        if (paramValue) {
          restoredInputs[String(os.id)] = paramValue;
        }
      }
      if (Object.keys(restoredInputs).length > 0) {
        setNonSkuInputs(restoredInputs);
      }
    }

    setIsInitialized(true);
  }, [product?.variants, searchParams, isInitialized, baseVariant, variantOptionSets, productOptionSets]);

  const selectedVariant = useMemo(() => {
    if (!product?.variants?.length) return null;
    return (
      product.variants.find((v) => v.id === (selectedVariantId ?? "")) ??
      baseVariant ??
      product.variants[0]
    );
  }, [product, selectedVariantId, baseVariant]);

  // Update URL with default variant SKU when initialized
  useEffect(() => {
    if (isInitialized) {
      updateURL(product?.defaultVariant?.sku ?? null, optionSetSelections, nonSkuInputs);
    }
  }, [isInitialized, product?.defaultVariant?.sku, optionSetSelections, nonSkuInputs, updateURL]);

  // ---------- PRICING (defaultVariant as base, then option set variants update it) ----------
  const defaultVariantPrice = product?.defaultVariant?.pricing?.price?.gross ?? null;
  const defaultVariantOriginal = product?.defaultVariant?.pricing?.priceUndiscounted?.gross ?? null;

  // Base price comes from defaultVariant, fallback to selected variant or product price range
  const rawCurrentPrice =
    defaultVariantPrice?.amount ??
    selectedVariant?.pricing?.price?.gross?.amount ??
    product?.pricing?.priceRange?.start?.gross?.amount ??
    0;

  const currency =
    defaultVariantPrice?.currency ??
    defaultVariantOriginal?.currency ??
    product?.pricing?.priceRange?.start?.gross?.currency ??
    "USD";

  // Calculate original price correctly: discounted price + discount amount
  const discountAmount = product?.pricing?.discount?.gross?.amount ?? 0;
  const rawOriginalPrice =
    discountAmount > 0
      ? rawCurrentPrice + discountAmount
      : defaultVariantOriginal?.amount ??
        selectedVariant?.pricing?.priceUndiscounted?.gross?.amount ??
        product?.pricing?.priceRange?.stop?.gross?.amount ??
        null;

  const currentPrice = rawCurrentPrice;
  const originalPrice = rawOriginalPrice;

  const hasDiscount =
    discountAmount > 0 ||
    (typeof originalPrice === "number" && originalPrice > currentPrice);
  const compareAt = hasDiscount ? originalPrice : null;

  // Memoized formatter
  const moneyFmt = useMemo(
    () => new Intl.NumberFormat(undefined, { style: "currency", currency }),
    [currency]
  );

  // Calculate total price including selected option set variants
  const optionSetsTotalPrice = useMemo(() => {
    let total = 0;
    for (const os of variantOptionSets) {
      const selectedIds = optionSetSelections[String(os.id)] || [];
      for (const variantId of selectedIds) {
        const saleorVariant = product?.variants?.find((v) => v.id === variantId);
        if (saleorVariant) {
          total += saleorVariant.pricing?.price?.gross?.amount ?? 0;
        }
      }
    }
    return total;
  }, [variantOptionSets, optionSetSelections, product?.variants]);

  // Check if any selected option set variant has base_variant_required=false
  const shouldIncludeDefaultVariant = useMemo(() => {
    for (const os of variantOptionSets) {
      const selectedIds = optionSetSelections[String(os.id)] || [];
      for (const variantId of selectedIds) {
        const plVariant = os.variants?.find(
          (v) => v.product_variant_id === variantId,
        );
        if (plVariant?.base_variant_required === false) {
          return false;
        }
      }
    }
    return true;
  }, [variantOptionSets, optionSetSelections]);

  // Display price: default variant price + selected option prices (conditional on base_variant_required)
  const displayPrice =
    (shouldIncludeDefaultVariant ? currentPrice : 0) + optionSetsTotalPrice;
  const displayCompareAt =
    compareAt !== null && shouldIncludeDefaultVariant
      ? compareAt + optionSetsTotalPrice
      : null;

  // Stock validation for default variant and selected option set variants
  const { isOutOfStock, outOfStockMessage } = useMemo(() => {
    // Check default variant stock if it's included
    if (shouldIncludeDefaultVariant && product?.defaultVariant) {
      const qty = product.defaultVariant.quantityAvailable;
      if (typeof qty === "number" && qty <= 0) {
        return {
          isOutOfStock: true,
          outOfStockMessage: `${product.name} is out of stock`,
        };
      }
    }

    // Check selected option set variants stock
    for (const os of variantOptionSets) {
      const selectedIds = optionSetSelections[String(os.id)] || [];
      for (const variantId of selectedIds) {
        const saleorVariant = product?.variants?.find(
          (v) => v.id === variantId,
        );
        if (saleorVariant) {
          const qty = saleorVariant.quantityAvailable;
          if (typeof qty === "number" && qty <= 0) {
            return {
              isOutOfStock: true,
              outOfStockMessage: `${saleorVariant.name} is out of stock`,
            };
          }
        }
      }
    }

    return { isOutOfStock: false, outOfStockMessage: "" };
  }, [
    shouldIncludeDefaultVariant,
    product?.defaultVariant,
    product?.variants,
    product?.name,
    variantOptionSets,
    optionSetSelections,
  ]);
  // --------------------------------------------

  // Effect to update schema.org structured data when variant changes
  useEffect(() => {
    if (!product || !selectedVariant) return;

    const productSchema = generateProductSchema({
      id: product.id,
      name: product.name,
      description: product.description || "",
      image: images.map((img) => img.url),
      price: currentPrice,
      currency: currency,
      availability:
        selectedVariant.quantityAvailable &&
        selectedVariant.quantityAvailable > 0
          ? "InStock"
          : "OutOfStock",
      sku: selectedVariant.sku || product.id,
      brand: product.category?.name,
      rating: undefined,
      reviewCount: undefined,
    });

    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Products", url: "/products/all" },
      { name: product.name, url: `/product/${slug}` },
    ]);

    // Remove existing schema scripts
    const existingSchemas = document.querySelectorAll(
      "script[data-schema-type]"
    );
    existingSchemas.forEach((script) => script.remove());

    // Add updated product schema
    const productScript = document.createElement("script");
    productScript.type = "application/ld+json";
    productScript.setAttribute("data-schema-type", "product");
    productScript.textContent = JSON.stringify(productSchema);
    document.head.appendChild(productScript);

    // Add breadcrumb schema
    const breadcrumbScript = document.createElement("script");
    breadcrumbScript.type = "application/ld+json";
    breadcrumbScript.setAttribute("data-schema-type", "breadcrumb");
    breadcrumbScript.textContent = JSON.stringify(breadcrumbSchema);
    document.head.appendChild(breadcrumbScript);

    // Cleanup on unmount
    return () => {
      const schemas = document.querySelectorAll("script[data-schema-type]");
      schemas.forEach((script) => script.remove());
    };
  }, [product, selectedVariant, currentPrice, currency, images, slug]);

  // Helper to read attribute value by slug from selected variant
  const getAttrVal = useCallback(
    (slug: string) => {
      const attr = selectedVariant?.attributes?.find(
        (a) => a.attribute?.slug === slug
      );
      return attr?.values?.[0]?.name ?? null;
    },
    [selectedVariant]
  );
  const lengthVal = getAttrVal("length_in") || getAttrVal("length");
  const heightVal = getAttrVal("height_in") || getAttrVal("height");
  const widthVal = getAttrVal("width_in") || getAttrVal("width");

  // Cap quantity by available stock when present
  const maxQty = selectedVariant?.quantityAvailable ?? undefined;
  const decQty = () => setQuantity((q) => Math.max(1, q - 1));
  const incQty = () => setQuantity((q) => Math.min(q + 1));

  const onQtyInput = (val: string) => {
    const n = Number.parseInt(val, 10);
    const safe = Number.isFinite(n) ? Math.max(1, n) : 1;
    setQuantity(maxQty ? Math.min(safe, maxQty) : safe);
  };
  // Helper to update checkout line metadata for non-SKU options
  const updateCheckoutLineMetadata = useCallback(
    async (checkoutLineId: string, metadata: MetadataInput[]) => {
      if (!metadata.length) return;

      try {
        const token = localStorage.getItem("token");
        const res = await fetch(resolveEndpoint(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            query: UPDATE_CHECKOUT_LINE_METADATA,
            variables: {
              id: checkoutLineId,
              input: metadata,
            },
          }),
        });

        if (!res.ok) {
          console.error("Failed to update checkout line metadata");
        }
      } catch (err) {
        console.error("Error updating checkout line metadata:", err);
      }
    },
    []
  );

  const handleAddToCart = async () => {
    if (!product) return;

    // Stock validation
    if (isOutOfStock) {
      showToast("Out of Stock", outOfStockMessage, "error");
      return;
    }

    // Validate option sets and non-SKU inputs
    if (!validateOptionsAndInputs()) {
      showToast(
        "Required fields missing",
        "Please fill in all required fields before adding to cart.",
        "error"
      );
      return;
    }

    try {
      setIsAdding(true);

      // Collect all selected option set variants as CartItemOptions
      const selectedOptions: CartItemOption[] = [];

      for (const os of variantOptionSets) {
        const selections = optionSetSelections[String(os.id)] || [];
        for (const variantId of selections) {
          const plVariant = os.variants?.find((v) => v.product_variant_id === variantId);
          const saleorVariant = product?.variants?.find((v) => v.id === variantId);

          selectedOptions.push({
            variantId,
            name: plVariant?.product_variant_name ?? saleorVariant?.name ?? "",
            price: saleorVariant?.pricing?.price?.gross?.amount ?? 0,
            optionSetName: os.name,
            optionSetLabel: os.label,
          });
        }
      }

      // Create a single consolidated cart item
      const cartItem = {
        id: shouldIncludeDefaultVariant
          ? (product?.defaultVariant?.id ?? baseVariant?.id ?? selectedVariant?.id ?? product.id)
          : (selectedVariant?.id ?? product.id),
        name: product.name,
        price: shouldIncludeDefaultVariant ? currentPrice : 0,
        image: images[0]?.url ?? "",
        category: product?.category?.name ?? "N/A",
        quantity,
        selectedOptions: selectedOptions.length > 0 ? selectedOptions : undefined,
        customInputs: Object.keys(nonSkuInputs).length > 0 ? nonSkuInputs : undefined,
        skipBaseProduct: !shouldIncludeDefaultVariant,
      };

      // Add consolidated item to cart (store handles adding all variants to Saleor)
      await addToCart(cartItem);

      // If there are product-scoped options, update checkout line metadata
      if (productOptionSets.length > 0 && Object.keys(nonSkuInputs).length > 0) {
        const state = useGlobalStore.getState();
        const checkoutId = state.checkoutId;

        if (checkoutId) {
          try {
            const token = localStorage.getItem("token");
            const checkoutRes = await fetch(resolveEndpoint(), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
              },
              body: JSON.stringify({
                query: `
                  query GetCheckoutLines($id: ID!) {
                    checkout(id: $id) {
                      lines {
                        id
                        variant { id }
                      }
                    }
                  }
                `,
                variables: { id: checkoutId },
              }),
            });

            if (checkoutRes.ok) {
              const checkoutData = await checkoutRes.json();
              const lines = checkoutData?.data?.checkout?.lines || [];

              // Find the line for the base product
              const targetLine = lines.find(
                (line: { id: string; variant: { id: string } }) =>
                  line.variant.id === cartItem.id
              );

              if (targetLine) {
                const metadata: MetadataInput[] = Object.entries(nonSkuInputs)
                  .filter(([, value]) => value.trim())
                  .map(([osId, value]) => {
                    const os = productOptionSets.find((o) => String(o.id) === osId);
                    return { key: os?.name ?? osId, value };
                  });

                await updateCheckoutLineMetadata(targetLine.id, metadata);
              }
            }
          } catch (err) {
            console.error("Error updating checkout line metadata:", err);
          }
        }
      }

      // Track add to cart event in GTM
      const productData: Product = {
        item_id: selectedVariant?.id ?? product.id,
        item_name: product.name,
        item_category: product?.category?.name || "Products",
        price: displayPrice,
        quantity: quantity,
        currency: "USD",
        item_brand: product?.category?.name || undefined,
      };

      gtmAddToCart(
        [productData],
        "USD",
        displayPrice * quantity,
        gtmConfig?.container_id
      );

      showToast(
        "ITEM ADDED TO CART",
        "Your item has been added. You can continue shopping or proceed to checkout.",
        "success"
      );
    } catch {
      showToast("Failed to add to cart", "Please try again later.", "error");
    } finally {
      setTimeout(() => setIsAdding(false), 400);
    }
  };

  // Build Address from account node
  const buildAddressFromAccount = useCallback(
    (
      acc?: {
        firstName?: string | null;
        lastName?: string | null;
        streetAddress1?: string | null;
        city?: string | null;
        postalCode?: string | null;
        country?: { code?: string | null } | null;
        countryArea?: string | null;
        phone?: string | null;
        companyName?: string | null;
      } | null
    ): AddressInputTS | undefined => {
      if (!acc) return undefined;
      return {
        firstName: acc.firstName || "Guest",
        lastName: acc.lastName || "User",
        streetAddress1: acc.streetAddress1 || "N/A",
        city: acc.city || "Karachi",
        postalCode: acc.postalCode || "00000",
        country: acc.country?.code || "US",
        countryArea: acc.countryArea || undefined,
        phone: acc.phone || undefined,
      };
    },
    []
  );

  // BUY NOW (add to cart first, then create checkout and redirect)
  const handleBuyNow = useCallback(async () => {
    if (!product) {
      showToast(
        "Product not found",
        "Please try again later.",
        "error"
      );
      return;
    }

    // Stock validation
    if (isOutOfStock) {
      showToast("Out of Stock", outOfStockMessage, "error");
      return;
    }

    // Validate option sets and non-SKU inputs
    if (!validateOptionsAndInputs()) {
      showToast(
        "Required fields missing",
        "Please fill in all required fields before buying.",
        "error"
      );
      return;
    }

    // Collect all selected option set variants as CartItemOptions
    const selectedOptions: CartItemOption[] = [];

    for (const os of variantOptionSets) {
      const selections = optionSetSelections[String(os.id)] || [];
      for (const variantId of selections) {
        const plVariant = os.variants?.find((v) => v.product_variant_id === variantId);
        const saleorVariant = product?.variants?.find((v) => v.id === variantId);

        selectedOptions.push({
          variantId,
          name: plVariant?.product_variant_name ?? saleorVariant?.name ?? "",
          price: saleorVariant?.pricing?.price?.gross?.amount ?? 0,
          optionSetName: os.name,
          optionSetLabel: os.label,
        });
      }
    }

    if (!selectedVariant?.id) {
      showToast(
        "Please select a variant",
        "Please select a variant before buying.",
        "error"
      );
      return;
    }

    if (quantity < 1) {
      showToast(
        "Quantity must be at least 1",
        "Please enter a quantity of at least 1.",
        "error"
      );
      return;
    }

    try {
      setBuying(true);

      // Use defaultVariant as the base for cart, falling back to baseVariant or selectedVariant
      const baseVariantIdForCart = shouldIncludeDefaultVariant
        ? (product.defaultVariant?.id ?? baseVariant?.id ?? selectedVariant?.id ?? product.id)
        : (selectedVariant?.id ?? product.id);

      // Create consolidated cart item (conditional on base_variant_required)
      const cartItem = {
        id: baseVariantIdForCart,
        name: product.name,
        price: shouldIncludeDefaultVariant ? currentPrice : 0,
        image: images[0]?.url ?? "",
        category: product?.category?.name ?? "N/A",
        quantity,
        selectedOptions: selectedOptions.length > 0 ? selectedOptions : undefined,
        customInputs: Object.keys(nonSkuInputs).length > 0 ? nonSkuInputs : undefined,
        skipBaseProduct: !shouldIncludeDefaultVariant,
      };

      // Add consolidated item to cart
      await addToCart(cartItem);

      // Clear any stale checkout in store + localStorage
      clearStoredCheckout();
      try {
        useGlobalStore.getState().setCheckoutId(null);
        const setTok = useGlobalStore.getState().setCheckoutToken as
          | ((v: string | null) => void)
          | undefined;
        setTok?.(null);
      } catch {}

      // Build lines for checkout: default variant + only the selected option variants
      const lines: CheckoutLineInputTS[] = [];
      if (shouldIncludeDefaultVariant) {
        lines.push({ variantId: baseVariantIdForCart, quantity });
      }
      for (const opt of selectedOptions) {
        lines.push({ variantId: opt.variantId, quantity });
      }

      // Email
      const email =
        (isLoggedIn
          ? user?.email || meData?.me?.email || ""
          : guestEmail || "guest@example.com") || "guest@example.com";

      // Create checkout without addresses to avoid validation errors
      const { checkoutId, checkoutToken } = await createCheckout({
        channel,
        email,
        lines,
      });

      // If there are product-scoped options, update checkout line metadata
      if (productOptionSets.length > 0 && Object.keys(nonSkuInputs).length > 0) {
        try {
          const token = localStorage.getItem("token");
          const checkoutRes = await fetch(resolveEndpoint(), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify({
              query: `
                query GetCheckoutLines($id: ID!) {
                  checkout(id: $id) {
                    lines {
                      id
                      variant { id }
                    }
                  }
                }
              `,
              variables: { id: checkoutId },
            }),
          });

          if (checkoutRes.ok) {
            const checkoutData = await checkoutRes.json();
            const checkoutLines = checkoutData?.data?.checkout?.lines || [];

            const targetLine = checkoutLines.find(
              (line: { id: string; variant: { id: string } }) =>
                line.variant.id === baseVariantIdForCart
            );

            if (targetLine) {
              const metadata: MetadataInput[] = Object.entries(nonSkuInputs)
                .filter(([, value]) => value.trim())
                .map(([osId, value]) => {
                  const os = productOptionSets.find((o) => String(o.id) === osId);
                  return { key: os?.name ?? osId, value };
                });

              await updateCheckoutLineMetadata(targetLine.id, metadata);
            }
          }
        } catch (err) {
          console.error("Error updating checkout line metadata:", err);
        }
      }

      // Persist in store + localStorage
      setCheckoutId(checkoutId);
      if (checkoutToken) setCheckoutToken(checkoutToken);
      try {
        localStorage.setItem("checkoutId", checkoutId);
        if (checkoutToken) localStorage.setItem("checkoutToken", checkoutToken);
      } catch {}

      // Go
      router.push(`/checkout?checkoutId=${encodeURIComponent(checkoutId)}`);
    } catch (e) {
      console.error("[BuyNow] error:", e);
      showToast(
        e instanceof Error ? e.message : "Unable to start checkout",
        "error"
      );
    } finally {
      setBuying(false);
    }
  }, [
    product,
    selectedVariant,
    quantity,
    addToCart,
    currentPrice,
    images,
    isLoggedIn,
    user?.email,
    meData?.me?.email,
    guestEmail,
    guestShippingInfo,
    accountShipping,
    accountBilling,
    buildAddressFromAccount,
    channel,
    setCheckoutId,
    setCheckoutToken,
    router,
    showToast,
    validateOptionsAndInputs,
    variantOptionSets,
    optionSetSelections,
    productOptionSets,
    nonSkuInputs,
    updateCheckoutLineMetadata,
    isOutOfStock,
    outOfStockMessage,
    shouldIncludeDefaultVariant,
  ]);
  const productBreadcrumbItems = [
    { text: "HOME", link: "/" },
    { text: "PRODUCT", link: "/products/all" },
    { text: product?.name ?? "" },
  ];

  const baseText =
    "text-[var(--color-secondary-800)] font-secondary -tracking-[0.045px]";
  type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

  // NOTE: Assumes product.description (Editor.js JSON) is already sanitized server-side.
  const renderBlock = (b: EditorBlock) => {
    switch (b.type) {
      case "quote": {
        const align =
          b.data.alignment === "center"
            ? "text-center"
            : b.data.alignment === "right"
            ? "text-right"
            : "text-left";
        return (
          <figure key={b.id} className={`not-prose ${align}`}>
            <blockquote
              className="border-l-4 pl-4 py-2 italic bg-[var(--color-secondary-200)]  text-[var(--color-secondary-800)]"
              dangerouslySetInnerHTML={{ __html: b.data.text || "" }}
            />
            {b.data.caption && (
              <figcaption
                className="mt-1 text-sm text-[var(--color-secondary-600)]"
                dangerouslySetInnerHTML={{ __html: b.data.caption }}
              />
            )}
          </figure>
        );
      }
      case "header": {
        const level = Math.min(Math.max(b.data.level ?? 1, 1), 6);
        const Tag = `h${level}` as HeadingTag;
        return (
          <Tag
            key={b.id}
            className={`${baseText} ${
              level === 1 ? "text-2xl font-semibold" : ""
            }`}
            dangerouslySetInnerHTML={{ __html: b.data.text || "" }}
          />
        );
      }
      case "list": {
        const ordered = (b.data.style || "unordered") === "ordered";
        const ListTag = (ordered ? "ol" : "ul") as "ol" | "ul";
        return (
          <ListTag
            key={b.id}
            className={`${baseText} pl-5 space-y-3 ${
              ordered ? "list-decimal" : "list-disc"
            } marker:text-[var(--color-primary-600)] text-sm lg:text-lg`}
          >
            {b.data.items.map((it, i) => (
              <li
                key={`${b.id}-${i}`}
                dangerouslySetInnerHTML={{ __html: it }}
              />
            ))}
          </ListTag>
        );
      }
      case "paragraph":
      default: {
        const html = (b.data.text || "").replace(/\n/g, "<br/>");

        if (html.includes("<dt>") && html.includes("<dd>")) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");

          const allDts = Array.from(doc.querySelectorAll("dt"));
          const allDds = Array.from(doc.querySelectorAll("dd"));

          const pairs: Array<{ term: string; description: string }> = [];

          allDts.forEach((dt, i) => {
            const term = dt.textContent?.trim() || "";
            const description = allDds[i]?.textContent?.trim() || "";

            if (term) {
              pairs.push({ term, description });
            }
          });

          const categoryHideDiv = doc.querySelector(".category-hide");
          let remainingText = "";

          if (categoryHideDiv) {
            const bodyContent = doc.body.textContent || "";
            const categoryShowDiv = doc.querySelector(".category-show");

            if (categoryShowDiv) {
              const clone = doc.body.cloneNode(true) as HTMLElement;
              const showDivClone = clone.querySelector(".category-show");
              if (showDivClone) {
                showDivClone.remove();
              }
              remainingText = clone.textContent?.trim() || "";
            }
          } else {
            const dlElement = doc.querySelector("dl");
            if (dlElement) {
              const parent = dlElement.parentElement;
              if (parent) {
                let nextSibling = parent.nextSibling;
                const textParts: string[] = [];

                while (nextSibling) {
                  if (nextSibling.nodeType === Node.TEXT_NODE) {
                    const text = nextSibling.textContent?.trim();
                    if (text) textParts.push(text);
                  } else if (nextSibling.nodeType === Node.ELEMENT_NODE) {
                    const text = (nextSibling as Element).textContent?.trim();
                    if (text) textParts.push(text);
                  }
                  nextSibling = nextSibling.nextSibling;
                }

                remainingText = textParts.join(" ");
              }
            }
          }

          if (pairs.length > 0) {
            return (
              <div key={b.id}>
                <div className="w-full my-4">
                  <table className="w-full border-collapse border border-[var(--color-secondary-300)]">
                    <tbody>
                      {pairs.map((item, i) => (
                        <tr
                          key={i}
                          className="border-b border-[var(--color-secondary-200)] hover:bg-[var(--color-secondary-50)] transition-colors"
                        >
                          <td
                            className={`px-3 py-2 font-semibold ${baseText} text-sm lg:text-base bg-gray-200 w-1/3 align-top border-r border-[var(--color-secondary-200)]`}
                          >
                            {item.term}
                          </td>
                          <td
                            className={`px-3 py-2 ${baseText} text-sm lg:text-base align-top`}
                          >
                            {item.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {remainingText && (
                  <div className={`${baseText} text-sm lg:text-base mt-4`}>
                    {remainingText}
                  </div>
                )}
              </div>
            );
          }
        }
        return (
          <div
            key={b.id}
            className={`${baseText} text-sm lg:text-base`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
    }
  };

  const renderDescription = () => {
    try {
      const parsed = JSON.parse(raw) as { blocks?: EditorBlock[] };
      if (parsed?.blocks?.length) {
        return (
          <div className="relative pb-12">
            <div
              ref={descriptionRef}
              className={`space-y-2 [&_ul]:pl-5 [&_ol]:pl-5 [&_ul]:list-disc [&_ol]:list-decimal [&_li]:marker:text-[var(--color-primary-600)] [&_a]:underline [&_a]:text-[var(--color-primary-600)] hover:[&_a]:text-yellow-400 overflow-hidden transition-all duration-300
                      ${!showFull ? "line-clamp-[10]" : ""}`}
              style={{ maxHeight: showFull ? "none" : `${maxHeight}px` }}
            >
              {parsed.blocks.map(renderBlock)}
            </div>

            {isOverflow && (
              <CommonButton
                onClick={toggleShow}
                className={`absolute bottom-0 px-0 ${
                  showFull ? "mt-0" : "mt-4"
                } underline text-sm md:text-base hover:underline-offset-4 hover:text-[var(--color-primary)]`}
              >
                {showFull ? "View Less" : "View More"}
              </CommonButton>
            )}
          </div>
        );
      }
    } catch {
      // Fallback to plain text
      return <p className={`${baseText} text-lg`}>{raw}</p>;
    }
  };
  const btnSecondary =
    "border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold  transition-colors";

  // Show loading during initial load, old slug search, and while fetching more
  // But don't show loading skeleton if we're coming from a redirect (to avoid double loading glitch)
  const isLoading =
    (loading || oldSlugLoading || isFetchingMore) && !isComingFromRedirect;

  const hasAnyDimension =
    parseFloat(lengthVal || "0") > 0 ||
    parseFloat(widthVal || "0") > 0 ||
    parseFloat(heightVal || "0") > 0 ||
    (selectedVariant?.weight?.value ?? 0) > 0;

  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setMousePosition({ x, y });
  };

  const handleMouseEnter = () => setIsZoomed(true);
  const handleMouseLeave = () => {
    setIsZoomed(false);
    setMousePosition({ x: 50, y: 50 });
  };

  const scrollToSelectedThumbnail = useCallback(
    (imageUrl: string) => {
      if (!thumbnailContainerRef.current) return;

      const container = thumbnailContainerRef.current;
      const selectedIndex = images.findIndex((img) => img.url === imageUrl);

      if (selectedIndex === -1) return;

      const thumbnailWidth = 80;
      const scrollPosition = selectedIndex * (thumbnailWidth + 8);

      container.scrollTo({
        left: scrollPosition - container.clientWidth / 2 + thumbnailWidth / 2,
        behavior: "smooth",
      });
    },
    [images]
  );

  useEffect(() => {
    if (selectedImage) {
      scrollToSelectedThumbnail(selectedImage);
    }
  }, [selectedImage, scrollToSelectedThumbnail]);

  return (
    <>
      <div className="lg:container lg:mx-auto px-4 py-12 md:px-6 md:py-16 lg:px-4 lg:py-24">
        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <div className="relative w-full aspect-square bg-gray-100  overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-pulse w-3/4 h-3/4 bg-gray-200 " />
                </div>
              </div>
              <div className="flex gap-2 mt-2 md:mt-5">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="size-20 md:size-24 bg-gray-200 rounded animate-pulse"
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="space-y-3">
                <div className="h-8 bg-gray-200 rounded w-2/3 animate-pulse" />
                <div className="h-5 bg-gray-200 rounded w-1/3 animate-pulse" />
                <div className="h-24 bg-gray-100 rounded animate-pulse" />
                <div className="h-10 bg-gray-200 rounded w-1/2 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {error && <div className="text-red-600">Failed to load product.</div>}
        {!isLoading &&
          !product &&
          !productWithOldSlug &&
          !error &&
          !isComingFromRedirect && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold text-[var(--color-secondary-800)] mb-2">
                Product Not Found
              </h2>
              <p className="text-[var(--color-secondary-600)] mb-6">
                The product you&apos;re looking for doesn&apos;t exist or has
                been removed.
              </p>
              <CommonButton
                onClick={() => router.push("/products/all")}
                variant="primary"
                className="mx-auto"
              >
                Browse All Products
              </CommonButton>
            </div>
          )}

        {product && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[40%_1fr] gap-8 lg:gap-12">
            {/* Image Gallery */}
            <div>
              <Breadcrumb items={productBreadcrumbItems} />
              <div className="lg:sticky lg:top-36 lg:self-start mt-5">
                <div
                  className="relative w-full aspect-square bg-[#F7F7F7] border border-[var(--color-secondary-200)] overflow-hidden cursor-zoom-in"
                  onMouseMove={handleMouseMove}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  {hasDiscount && (
                    <span className="absolute top-3 right-3 z-10 inline-flex items-center bg-[var(--color-primary-600)] px-3 py-1 text-base uppercase text-white font-secondary -tracking-[0.04px]">
                      Sale
                    </span>
                  )}
                  {selectedImage ? (
                    <Image
                      src={selectedImage}
                      alt={product.name || "Product image"}
                      fill
                      className="object-contain transition-transform duration-200 ease-out"
                      style={{
                        transform: isZoomed ? "scale(2.5)" : "scale(1)",
                        transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`,
                      }}
                    />
                  ) : (
                    <Image
                      src={"/no-image-avail-large.png"}
                      alt={"no-image-avail-large"}
                      fill
                      quality={90}
                      sizes="100vw"
                      className="object-contain transition-transform duration-200 ease-out"
                      style={{
                        transform: isZoomed ? "scale(2.5)" : "scale(1)",
                        transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`,
                      }}
                    />
                  )}
                </div>

                {images.length > 0 && (
                  <div className="relative flex items-center justify-between gap-2 mt-3">
                    {/* Previous Arrow */}
                    <button
                      type="button"
                      className="cursor-pointer size-fit"
                      onClick={() => {
                        const currentIndex = images.findIndex(
                          (img) => img.url === selectedImage
                        );
                        const prevIndex =
                          currentIndex > 0
                            ? currentIndex - 1
                            : images.length - 1;
                        setSelectedImage(images[prevIndex].url);
                      }}
                      disabled={images.length <= 1}
                    >
                      <span
                        style={{
                          color: "var(--color-secondary-800)",
                        }}
                        className="size-8 md:size-10 block p-2 rounded-full bg-[var(--color-secondary-200)] disabled:opacity-50 hover:bg-[var(--color-secondary-300)]"
                      >
                        {SwiperArrowIconLeft}
                      </span>
                    </button>

                    {/* Thumbnails */}
                    <div
                      ref={thumbnailContainerRef}
                      className="flex gap-2 overflow-auto hideScrollbar scroll-smooth"
                    >
                      {images.map((img) => {
                        const isActive = selectedImage === img.url;
                        return (
                          <button
                            key={img.id}
                            type="button"
                            className={`relative size-16 md:size-20 flex-shrink-0 lg:size-24 bg-[#F7F7F7] border cursor-pointer overflow-hidden transition-all duration-200 ${
                              isActive
                                ? "border-[var(--color-primary-600)] border-2 opacity-100 scale-105"
                                : "opacity-50 border-[var(--color-secondary-200)] hover:opacity-75"
                            }`}
                            aria-pressed={isActive}
                            onClick={() => setSelectedImage(img.url)}
                          >
                            <Image
                              src={img.url}
                              alt={img.alt || "thumb"}
                              fill
                              className="object-contain"
                            />
                          </button>
                        );
                      })}
                    </div>

                    {/* Next Arrow */}
                    <button
                      type="button"
                      className="cursor-pointer size-fit"
                      onClick={() => {
                        const currentIndex = images.findIndex(
                          (img) => img.url === selectedImage
                        );
                        const nextIndex =
                          currentIndex < images.length - 1
                            ? currentIndex + 1
                            : 0;
                        setSelectedImage(images[nextIndex].url);
                      }}
                      disabled={images.length <= 1}
                    >
                      <span
                        style={{
                          color: "var(--color-secondary-800)",
                        }}
                        className="size-8 md:size-10 block p-2 rounded-full bg-[var(--color-secondary-200)] disabled:opacity-50 hover:bg-[var(--color-secondary-300)]"
                      >
                        {SwiperArrowIconRight}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Product Info */}
            <div>
              {/* Brand/Collection */}
              {/* {!!product.collections?.length && (
              <div className="font-secondary text-xl -tracking-[0.05px] text-yellow-400 font-bold flex gap-1">
                <span className="text-[var(--color-secondary-600)] font-normal">
                  BRAND
                </span>
                {product.collections.map((c) => c.name).join(", ")}
              </div>
            )} */}
              <h1 className="text-xl lg:text-3xl font-primary uppercase -tracking-[0.09px] mb-2">
                {product.name}
              </h1>

              {/* Meta: SKU and stock */}
              {selectedVariant && (
                <div className="text-xl flex items-center gap-3 font-secondary -tracking-[0.045px] text-[var(--color-secondary-600)] mb-4">
                  <span>
                    SKU:{" "}
                    <span className="font-semibold text-[var(--color-secondary-800)]">
                      {product?.defaultVariant?.sku ?? "N/A"}
                    </span>
                  </span>
                  {isOutOfStock && (
                    <p className="text-sm lg:text-base font-medium bg-red-100 px-2 py-[2px] text-red-700">
                      This item is currently out of stock.
                    </p>
                  )}
                </div>
              )}

              {product?.metadata.find((item) => item?.key === "availability")
                ?.value === "Please Call" && (
                <div className="border border-[var(--color-secondary-600)] px-4 mt-8 bg-[var(--color-secondary-200)] [&>div>p:nth-child(1)]:text-xl [&>div>p:nth-child(1)]:text-[var(--color-primary-500)] [&>div>p:nth-child(1)]:font-semibold">
                  <EditorRenderer content={pdpContent?.content ?? null} />
                </div>
              )}
              {/* Price */}
              {product?.metadata.find((item) => item?.key === "availability")
                ?.value === "Limited Supply" && (
                <p className="font-semibold bg-[var(--color-secondary-100)] px-2 py-[2px] text-[var(--color-secondary-50)] mt-4 w-fit">
                  LIMITED SUPPLY
                </p>
              )}
              {product?.metadata.find((item) => item?.key === "availability")
                ?.value !== "Please Call" && (
                <div className="my-5 flex items-center gap-2 font-secondary">
                  {currentPrice === 0 ? (
                    <div className="w-full border border-[var(--color-secondary-600)] px-4 mt-8 bg-[var(--color-secondary-200)] [&>div>p:nth-child(1)]:text-xl [&>div>p:nth-child(1)]:text-[var(--color-primary-500)] [&>div>p:nth-child(1)]:font-semibold">
                      <EditorRenderer content={pdpContent?.content ?? null} />
                    </div>
                  ) : (
                    <span className="text-3xl text-yellow-400 font-semibold -tracking-[0.075px]">
                      {moneyFmt.format(displayPrice)}
                    </span>
                  )}
                  {displayCompareAt !== null && (
                    <span className="text-lg text-[var(--color-secondary-400)] line-through font-medium -tracking-[0.045px]">
                      {moneyFmt.format(displayCompareAt)}
                    </span>
                  )}
                </div>
              )}

              {/* Product Message from Metadata */}
              {(() => {
                const productMessage = product?.metadata?.find(
                  (item) => item.key === "product_message"
                )?.value;

                const shippingIsActive =
                  product?.metadata
                    ?.find((item) => item.key === "shipping_isactive")
                    ?.value?.toLowerCase() === "true";

                // Only show the product message if shipping_isactive is true
                if (productMessage && shippingIsActive) {
                  return (
                    <div className="my-5 p-4 bg-[var(--color-secondary-100)] border-l-4 border-[var(--color-primary-600)] rounded-r">
                      <p className="text-sm lg:text-base text-[var(--color-secondary-800)] font-secondary -tracking-[0.045px]">
                        {productMessage}
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Variant Selection / Option Sets / Add to Cart — wait for PL option sets API */}
              {optionsLoading ? (
                <div className="flex items-center gap-3 py-6">
                  <div className="size-5 border-t-2 border-[var(--color-secondary-400)] rounded-full animate-spin" />
                  <span className="text-sm text-[var(--color-secondary-500)] font-secondary">Loading options…</span>
                </div>
              ) : (
              <>
              {/* Regular Variants (not part of option sets) */}
              {product?.metadata.find((item) => item?.key === "availability")
                ?.value !== "Please Call" && (
                <>
                  {regularVariants.length > 1 && (
                    <div className="mb-10">
                      <label className="block font-secondary text-lg font-semibold text-[var(--color-secondary-800)] uppercase mb-4 -tracking-[0.045px]">
                        Variant
                      </label>
                      <div
                        className="grid grid-cols-1 md:grid-cols-2 gap-3"
                        role="radiogroup"
                        aria-label="Variants"
                      >
                        {regularVariants.map((v) => {
                          const selected =
                            (selectedVariant?.id ?? regularVariants[0]?.id) ===
                            v.id;
                          return (
                            <div
                              key={v.id}
                              role="radio"
                              aria-checked={selected}
                              onClick={() => setSelectedVariantId(v.id)}
                              className={`border flex justify-between font-secondary w-full items-center px-4 py-5 cursor-pointer transition-colors ${
                                selected
                                  ? "border-[var(--color-primary-100)] bg-[var(--color-primary-50)] text-yellow-400"
                                  : "border-[var(--color-secondary-200)] hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center gap-3 text-sm md:text-base">
                                <input
                                  type="radio"
                                  name="variant"
                                  className="accent-[var(--color-primary-600)]"
                                  checked={selected}
                                  onChange={() => setSelectedVariantId(v.id)}
                                />
                                <p
                                  title={v.name}
                                  className="font-medium -tracking-[0.04px]"
                                >
                                  {v.name}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Option Sets (Variant-scoped from PL API) */}
              {product?.metadata.find((item) => item?.key === "availability")
                ?.value !== "Please Call" &&
                variantOptionSets.length > 0 && (
                  <div className="mb-10 space-y-6">
                    {variantOptionSets.map((os) => {
                      const osKey = String(os.id);
                      const selectedIds = optionSetSelections[osKey] || [];
                      const isMulti = os.type === "multi-enum";
                      const errorKey = `optionSet_${os.id}`;
                      const hasError = !!validationErrors[errorKey];

                      return (
                        <div key={os.id}>
                          <label className="block font-secondary text-lg font-semibold text-[var(--color-secondary-800)] uppercase mb-4 -tracking-[0.045px]">
                            {os.label}
                            {os.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </label>

                          {isMulti ? (
                            // Multi-select checkboxes
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {os.variants?.map((plVariant) => {
                                const isSelected = selectedIds.includes(
                                  plVariant.product_variant_id
                                );
                                const saleorVariant = product?.variants?.find(
                                  (v) => v.id === plVariant.product_variant_id
                                );
                                const price =
                                  saleorVariant?.pricing?.price?.gross?.amount ?? 0;
                                return (
                                  <div
                                    key={plVariant.product_variant_id}
                                    onClick={() =>
                                      handleOptionSetChange(
                                        osKey,
                                        plVariant.product_variant_id,
                                        true
                                      )
                                    }
                                    className={`border flex justify-between font-secondary w-full items-center px-4 py-5 cursor-pointer transition-colors ${
                                      isSelected
                                        ? "border-[var(--color-primary-100)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                                        : "border-[var(--color-secondary-200)] hover:bg-gray-50"
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 text-sm md:text-base">
                                      <input
                                        type="checkbox"
                                        className="accent-[var(--color-primary-600)]"
                                        checked={isSelected}
                                        onChange={() =>
                                          handleOptionSetChange(
                                            osKey,
                                            plVariant.product_variant_id,
                                            true
                                          )
                                        }
                                      />
                                      <p
                                        title={plVariant.product_variant_name}
                                        className="font-medium -tracking-[0.04px]"
                                      >
                                        {plVariant.product_variant_name}
                                      </p>
                                    </div>
                                    {price > 0 && (
                                      <span className="text-sm text-[var(--color-secondary-600)]">
                                        +{moneyFmt.format(price)}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            // Single-select dropdown
                            <select
                              className={`w-full border px-4 py-3 font-secondary text-sm md:text-base -tracking-[0.04px] bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-600)] ${
                                hasError
                                  ? "border-red-500"
                                  : "border-[var(--color-secondary-200)]"
                              }`}
                              value={selectedIds[0] || ""}
                              onChange={(e) =>
                                handleOptionSetChange(
                                  osKey,
                                  e.target.value,
                                  false
                                )
                              }
                            >
                              <option value="">
                                {`Select ${os.label}`}
                              </option>
                              {os.variants?.map((plVariant) => {
                                const saleorVariant = product?.variants?.find(
                                  (v) => v.id === plVariant.product_variant_id
                                );
                                const price =
                                  saleorVariant?.pricing?.price?.gross?.amount ?? 0;
                                return (
                                  <option key={plVariant.product_variant_id} value={plVariant.product_variant_id}>
                                    {plVariant.product_variant_name}
                                    {price > 0
                                      ? ` (+${moneyFmt.format(price)})`
                                      : ""}
                                  </option>
                                );
                              })}
                            </select>
                          )}

                          {hasError && (
                            <p className="text-red-500 text-sm mt-1">
                              {validationErrors[errorKey]}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              {/* Product-Scoped Options (text, date, date-time inputs from PL API) */}
              {product?.metadata.find((item) => item?.key === "availability")
                ?.value !== "Please Call" &&
                productOptionSets.length > 0 && (
                  <div className="mb-10 space-y-6">
                    {productOptionSets.map((os) => {
                      const osKey = String(os.id);
                      const errorKey = `nonSku_${os.id}`;
                      const hasError = !!validationErrors[errorKey];
                      const value = nonSkuInputs[osKey] || "";

                      return (
                        <div key={os.id}>
                          <label className="block font-secondary text-lg font-semibold text-[var(--color-secondary-800)] uppercase mb-4 -tracking-[0.045px]">
                            {os.label}
                            {os.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </label>

                          {os.type === "text" && (
                            <input
                              type="text"
                              className={`w-full border px-4 py-3 font-secondary text-sm md:text-base -tracking-[0.04px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-600)] ${
                                hasError
                                  ? "border-red-500"
                                  : "border-[var(--color-secondary-200)]"
                              }`}
                              value={value}
                              onChange={(e) =>
                                handleNonSkuInputChange(
                                  osKey,
                                  e.target.value
                                )
                              }
                              placeholder={`Enter ${os.label.toLowerCase()}`}
                            />
                          )}

                          {os.type === "date" && (
                            <input
                              type="date"
                              className={`w-full border px-4 py-3 font-secondary text-sm md:text-base -tracking-[0.04px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-600)] ${
                                hasError
                                  ? "border-red-500"
                                  : "border-[var(--color-secondary-200)]"
                              }`}
                              value={value}
                              onChange={(e) =>
                                handleNonSkuInputChange(
                                  osKey,
                                  e.target.value
                                )
                              }
                            />
                          )}

                          {os.type === "date-time" && (
                            <input
                              type="datetime-local"
                              className={`w-full border px-4 py-3 font-secondary text-sm md:text-base -tracking-[0.04px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-600)] ${
                                hasError
                                  ? "border-red-500"
                                  : "border-[var(--color-secondary-200)]"
                              }`}
                              value={value}
                              onChange={(e) =>
                                handleNonSkuInputChange(
                                  osKey,
                                  e.target.value
                                )
                              }
                            />
                          )}

                          {hasError && (
                            <p className="text-red-500 text-sm mt-1">
                              {validationErrors[errorKey]}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              {/* Add to Cart + Buy Now */}
              {product?.metadata.find((item) => item?.key === "availability")
                ?.value !== "Please Call" && (
                <div className="space-y-3">
                  <div
                    className={`flex items-center group border border-[var(--color-secondary-200)]  w-full ${
                      currentPrice === 0 ? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className={`${btnSecondary} px-2 py-3 !border-0 hover:!bg-[var(--color-secondary-200)] transition-all ease-in-out duration-300 h-full cursor-pointer w-full flex items-center justify-center`}
                      onClick={decQty}
                    >
                      <span className="size-4 block">{MinusIcon}</span>
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={maxQty ?? undefined}
                      value={quantity}
                      inputMode="numeric"
                      className="text-center outline-none border-x border-[var(--color-secondary-200)] w-full select-none"
                      onChange={(e) => onQtyInput(e.target.value)}
                    />
                    <button
                      type="button"
                      className={`${btnSecondary} px-2 py-3 !border-0 w-full cursor-pointer hover:!bg-[var(--color-secondary-200)] transition-all ease-in-out duration-300 flex items-center justify-center`}
                      onClick={incQty}
                    >
                      <span className="size-4 block">{PlusIcon}</span>
                    </button>
                  </div>

                  <CommonButton
                    className="w-full"
                    onClick={handleAddToCart}
                    disabled={!product || isAdding || displayPrice === 0 || isOutOfStock}
                    variant="secondary"
                  >
                    {isAdding ? (
                      <span className="flex size-6 items-center text-black justify-center w-full">
                        {SpinnerIcon}
                      </span>
                    ) : (
                      "Add to Cart"
                    )}
                  </CommonButton>

                  <PrimaryButton
                    content={buying ? "Processing..." : "Buy Now"}
                    className="w-full text-base font-semibold leading-[24px] tracking-[-0.04px] py-3 px-4"
                    onClick={handleBuyNow}
                    disabled={
                      buying ||
                      isOutOfStock ||
                      displayPrice === 0 ||
                      // Disable if no regular variant AND no option set selections
                      (!selectedVariant &&
                        Object.keys(optionSetSelections).length === 0)
                    }
                  />
                </div>
              )}
              {/* <div
                onClick={() => setShowInquiryModal(true)}
                className="mt-4 flex items-center gap-1 cursor-pointer hover:text-[var(--color-primary-500)] transition-all ease-in-out duration-300"
              >
                {ProductInquiryIcon} <p>Item Inquiry</p>{" "}
              </div> */}
              </>
              )}

              {/* Extra details (Dimensions/Weight) */}
              {hasAnyDimension && (
                <div className="mt-10">
                  <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-[var(--color-secondary-800)] font-secondary uppercase -tracking-[0.06px] mb-4">
                    Product Dimensions
                  </h3>
                  <ul className="text-sm lg:text-lg -tracking-[0.045px] font-semibold font-secondary text-[var(--color-secondary-800)] list-disc marker:text-[var(--color-primary-600)] pl-5 space-y-3">
                    {lengthVal === "0" ||
                    parseFloat(lengthVal || "") == 0 ? null : (
                      <li>
                        Length:{" "}
                        <span className="font-normal">{lengthVal} Inches</span>
                      </li>
                    )}
                    {widthVal === "0" ||
                    parseFloat(widthVal || "") == 0 ? null : (
                      <li>
                        Width:{" "}
                        <span className="font-normal">{widthVal} Inches</span>
                      </li>
                    )}
                    {heightVal === "0" ||
                    parseFloat(heightVal || "") == 0 ? null : (
                      <li>
                        Height:{" "}
                        <span className="font-normal">{heightVal} Inches</span>
                      </li>
                    )}
                    {selectedVariant?.weight?.value === 0 ? null : (
                      <li>
                        Weight:{" "}
                        <span className="font-normal">
                          {selectedVariant?.weight?.value}
                          {selectedVariant?.weight?.unit}
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Description */}
              <div className="mt-8">
                <h3 className="text-base lg:text-lg font-semibold text-[var(--color-secondary-800)] font-secondary uppercase -tracking-[0.06px] mb-2">
                  Product Description
                </h3>
                <div className="text-sm lg:text-base leading-relaxed">
                  {renderDescription()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div
            className="fixed top-4 right-4 z-50 space-y-3 animate-[slidein_.25s_ease-out]"
            aria-live="polite"
          >
            <Toast
              message={toast.message}
              type={toast.type}
              subParagraph={toast.subParagraph}
              duration={2500}
              onClose={() => setToast(null)}
            />
            <style jsx>{`
              @keyframes slidein {
                from {
                  opacity: 0;
                  transform: translateY(-6px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
            `}</style>
          </div>
        )}
      </div>
      {/* <ItemInquiryModal
        isModalOpen={showInquiryModal}
        onClose={() => setShowInquiryModal(false)}
      /> */}
    </>
  );
}
