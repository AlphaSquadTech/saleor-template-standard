"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  CHECKOUT_CREATE,
  CHECKOUT_LINES_ADD,
  CHECKOUT_LINES_DELETE,
  CHECKOUT_LINES_UPDATE,
} from "../graphql/mutations/checkoutCreate";

// ---- Local helper types (avoid global redeclare conflicts) ----
type NarrowWindowForApollo = {
  __APOLLO_CLIENT__?: {
    clearStore?: () => Promise<void>;
  };
};

type IDBWithDatabases = IDBFactory & {
  databases?: () => Promise<Array<{ name?: string | null }>>;
};

// ----- Types -----
export interface CartItemOption {
  variantId: string;
  name: string;
  price: number;
  optionSetName: string;
  optionSetLabel: string;
}

export interface CartItem {
  key: string; // Unique identifier combining variant ID + options + custom inputs
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  sku?: string;
  category?: string;
  // Option sets - selected variant options consolidated into this item
  selectedOptions?: CartItemOption[];
  // Non-SKU options - custom inputs like text, date, datetime
  customInputs?: Record<string, string>;
  // Skip adding base product to checkout (when base_product_required is false)
  skipBaseProduct?: boolean;
}

// Input type for addToCart - key is optional because the store generates it
export type CartItemInput = Omit<CartItem, 'key'> & { key?: string };
export interface ShippingInfo {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}
export interface User {
  name: string;
  email?: string;
  id?: string;
}
export type YMMYear = { id: number; name: string };

export interface GlobalState {
  isLoggedIn: boolean;
  user: User | null;
  hydrated: boolean;
  guestEmail: string;
  guestShippingInfo: ShippingInfo;
  cartItems: CartItem[];
  totalItems: number;
  totalAmount: number;
  checkoutId?: string | null;
  checkoutToken?: string | null;
  selectedShippingMethodId?: string | null;
  syncingCart: boolean;
  isYMMActive: boolean;
  ymmYears: YMMYear[];
  ymmYearsLoaded: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  initAuthFromToken: () => void;
  setHydrated: (v: boolean) => void;
  setGuestEmail: (email: string) => void;
  setGuestShippingInfo: (info: Partial<ShippingInfo>) => void;
  addToCart: (itemToAdd: CartItemInput) => Promise<void>;
  removeFromCart: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  setCheckoutId: (id: string | null) => void;
  setCheckoutToken: (token: string | null) => void;
  setSelectedShippingMethodId: (id: string | null) => void;
  syncCartWithSaleor: () => Promise<void>;
  loadCartFromSaleor: () => Promise<void>;
  setSyncingCart: (syncing: boolean) => void;
  setIsYMMActive: (active: boolean) => void;
  checkYMMStatus: () => Promise<void>;
  loadYMMYears: () => Promise<void>;
  storeCheckoutInUserMetadata: (
    checkoutId: string,
    checkoutToken?: string
  ) => Promise<void>;
  loadCheckoutFromUserMetadata: () => Promise<string | null>;
  finalizeCheckoutCleanup: () => Promise<void>;
  syncCartQuantityWithSaleor: (
    cartItem: CartItem,
    newQuantity: number,
    oldQuantity: number
  ) => Promise<void>;
  syncCartRemovalWithSaleor: (cartItem: CartItem) => Promise<void>;
}

// ----- Helpers -----
const calculateTotals = (cartItems: CartItem[]) => {
  const totalItems = cartItems.reduce((t, i) => t + i.quantity, 0);
  // Calculate total using the discounted unit prices + selected options prices
  const totalAmount = cartItems.reduce((t, i) => {
    let itemTotal = i.price;
    // Add prices from selected options if present
    if (i.selectedOptions?.length) {
      itemTotal += i.selectedOptions.reduce((sum, opt) => sum + opt.price, 0);
    }
    return t + itemTotal * i.quantity;
  }, 0);
  return { totalItems, totalAmount };
};

/**
 * Generate a unique key for a cart item that includes the base variant ID,
 * selected option variant IDs, and custom inputs. This allows the same base
 * product with different option selections to exist as separate cart items.
 */
const generateCartItemKey = (
  variantId: string,
  selectedOptions?: CartItemOption[],
  customInputs?: Record<string, string>
): string => {
  const optionsKey = selectedOptions
    ?.map((opt) => opt.variantId)
    .sort()
    .join("|") || "";
  const inputsKey = customInputs
    ? Object.entries(customInputs)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join("|")
    : "";
  return `${variantId}::${optionsKey}::${inputsKey}`;
};

/**
 * Parse option_set metadata from a variant's metadata array.
 * Returns the parsed option set info if present, null otherwise.
 */
const parseOptionSetMetadata = (
  metadata: Array<{ key: string; value: string }> | null | undefined
): { name: string; label: string } | null => {
  if (!metadata) return null;
  const optionMeta = metadata.find((m) => m.key === "option_set");
  if (!optionMeta?.value) return null;
  try {
    return JSON.parse(optionMeta.value);
  } catch {
    return null;
  }
};

async function clearAllAuthStorage() {
  if (typeof window === "undefined") return;

  try {
    // localStorage keys we care about
    const authKeys = [
      "token",
      "refreshToken",
      "wsm-global-store",
      "user",
      "auth",
      "session",
      "apollo-cache-persist",
      "apollo-cache",
    ];
    for (const k of authKeys) {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    }

    // sessionStorage
    try {
      sessionStorage.clear();
    } catch {
      /* ignore */
    }

    // IndexedDB (guard for Safari / older browsers)
    try {
      const idb = window.indexedDB as IDBWithDatabases;
      if (typeof idb?.databases === "function") {
        const databases = await idb.databases();
        await Promise.all(
          databases
            .map((db) => db?.name)
            .filter((name): name is string => Boolean(name))
            .map(
              (name) =>
                new Promise<void>((resolve) => {
                  const req = idb.deleteDatabase(name);
                  req.onsuccess = () => resolve();
                  req.onerror = () => resolve(); // swallow
                })
            )
        );
      }
    } catch {
      /* ignore */
    }

    // Clear cookies via API route
    try {
      await fetch("/api/auth/clear", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        redirect: "manual",
      });
    } catch (e) {
      /* ignore */
      console.log(e);
    }

    // Apollo cache (use narrow window type to avoid global redeclare conflicts)
    try {
      const w = window as unknown as NarrowWindowForApollo;
      await w.__APOLLO_CLIENT__?.clearStore?.();
    } catch {
      /* ignore */
    }

    // Service worker caches
    try {
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
    } catch {
      /* ignore */
    }
  } catch {
    // swallow – we still want to redirect
  }
}

// ----- Store -----
export const useGlobalStore = create<GlobalState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      user: null,
      hydrated: false,
      guestEmail: "",
      guestShippingInfo: {
        firstName: "",
        lastName: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
        phone: "",
      },
      cartItems: [],
      totalItems: 0,
      totalAmount: 0,
      checkoutId: null,
      checkoutToken: null,
      selectedShippingMethodId: null,
      syncingCart: false,
      isYMMActive: false,
      ymmYears: [],
      ymmYearsLoaded: false,

      login: (user) => {
        set({ isLoggedIn: true, user });
        // Load cart from Saleor after login
        setTimeout(() => {
          useGlobalStore.getState().loadCartFromSaleor().catch(console.error);
        }, 100);
      },

      logout: async () => {
        const currentState = useGlobalStore.getState();

        // Store the checkout info before logout so it can be restored on login
        const checkoutId = currentState.checkoutId;
        const checkoutToken = currentState.checkoutToken;

        // reset state immediately to avoid UI races
        set({
          isLoggedIn: false,
          user: null,
          cartItems: [],
          totalItems: 0,
          totalAmount: 0,
          // Clear checkout info completely on logout to prevent race conditions
          checkoutId: null,
          checkoutToken: null,
          selectedShippingMethodId: null, // Clear shipping selection on logout
          guestEmail: "",
          guestShippingInfo: {
            firstName: "",
            lastName: "",
            address: "",
            city: "",
            state: "",
            zipCode: "",
            country: "",
            phone: "",
          },
        });

        await clearAllAuthStorage();

        // Only restore checkout info if user was in middle of checkout process
        const currentPath = window.location.pathname;
        const isInCheckout =
          currentPath.includes("/checkout") || currentPath.includes("/cart");

        if (checkoutId && isInCheckout) {
          try {
            localStorage.setItem("checkoutId", checkoutId);
            if (checkoutToken) {
              localStorage.setItem("checkoutToken", checkoutToken);
            }
          } catch {}
        } else {
          // Clear checkout data completely if not in checkout flow
          try {
            localStorage.removeItem("checkoutId");
            localStorage.removeItem("checkoutToken");
            localStorage.removeItem("selectedShippingMethodId");
          } catch {}
        }

        // single hard redirect – no extra reloads
        if (typeof window !== "undefined") {
          window.location.replace("/");
        }
      },

      initAuthFromToken: () => {
        if (typeof window === "undefined") return;
        try {
          const token = localStorage.getItem("token");
          const isLoggedIn = !!token;
          set({ isLoggedIn });

          // Load cart from Saleor if logged in
          if (isLoggedIn) {
            setTimeout(() => {
              useGlobalStore
                .getState()
                .loadCartFromSaleor()
                .catch(console.error);
            }, 500); // Delay to ensure everything is initialized
          }
        } catch {
          set({ isLoggedIn: false, user: null });
        }
      },

      setHydrated: (v) => set({ hydrated: v }),
      setGuestEmail: (email) => set({ guestEmail: email }),
      setGuestShippingInfo: (info) =>
        set((state) => ({
          guestShippingInfo: { ...state.guestShippingInfo, ...info },
        })),

      addToCart: async (itemToAdd) => {
        const state = useGlobalStore.getState();
        const tieredPriceToggle = false;
        if (!process.env.NEXT_PUBLIC_API_URL) {
          return;
        }
        try {
          if (tieredPriceToggle) {
            // Use existing REST API endpoint
            const response = await fetch(
              "https://productivity-lexington-statute-grows.trycloudflare.com/api/add-to-cart",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Saleor-Domain": process.env.NEXT_PUBLIC_API_URL,
                },
                body: JSON.stringify({
                  variantId: itemToAdd.id,
                  quantity: itemToAdd.quantity,
                  checkoutId: state.checkoutId || null,
                }),
              }
            );

            if (response.ok) {
              const data = await response.json();
              const checkout = data.checkout;

              if (checkout) {
                // Update checkout info
                set({
                  checkoutId: checkout.id,
                  checkoutToken: checkout.token,
                });

                // Store in localStorage
                try {
                  localStorage.setItem("checkoutId", checkout.id);
                  if (checkout.token) {
                    localStorage.setItem("checkoutToken", checkout.token);
                  }
                } catch {}

                // Also store in user metadata for cross-device persistence
                if (state.isLoggedIn) {
                  state
                    .storeCheckoutInUserMetadata(checkout.id, checkout.token)
                    .catch(console.error);
                }
              }

              // Only add to local state after API success
              // Use key-based deduplication to allow same base product with different options
              set((state) => {
                const itemKey = generateCartItemKey(
                  itemToAdd.id,
                  itemToAdd.selectedOptions,
                  itemToAdd.customInputs
                );
                const itemWithKey = { ...itemToAdd, key: itemKey };
                const existing = state.cartItems.find((i) => i.key === itemKey);
                const cartItems = existing
                  ? state.cartItems.map((i) =>
                      i.key === itemKey
                        ? { ...i, quantity: i.quantity + itemToAdd.quantity }
                        : i
                    )
                  : [...state.cartItems, itemWithKey];
                const { totalItems, totalAmount } = calculateTotals(cartItems);
                return { cartItems, totalItems, totalAmount };
              });
            } else {
              throw new Error("Failed to add item to cart via REST API");
            }
          } else {
            // Use GraphQL add to cart functionality
            const token = localStorage.getItem("token");

            let checkoutId = state.checkoutId;

            // Build lines for all variants (base product + selected options)
            const lines: Array<{ variantId: string; quantity: number }> = [];

            // Add base product only if skipBaseProduct is not true
            if (!itemToAdd.skipBaseProduct) {
              lines.push({ variantId: itemToAdd.id, quantity: itemToAdd.quantity });
            }

            // Add option variant lines if present
            if (itemToAdd.selectedOptions?.length) {
              for (const option of itemToAdd.selectedOptions) {
                lines.push({
                  variantId: option.variantId,
                  quantity: itemToAdd.quantity,
                });
              }
            }

            // Create checkout if it doesn't exist
            if (!checkoutId) {
              const createResponse = await fetch(
                process.env.NEXT_PUBLIC_API_URL || "/api/graphql",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(token && { Authorization: `Bearer ${token}` }),
                  },
                  body: JSON.stringify({
                    query: CHECKOUT_CREATE,
                    variables: {
                      input: {
                        channel: "default-channel",
                        lines,
                      },
                    },
                  }),
                }
              );

              if (createResponse.ok) {
                const createData = await createResponse.json();
                const checkout = createData?.data?.checkoutCreate?.checkout;
                const errors = createData?.data?.checkoutCreate?.errors;

                if (errors?.length > 0) {
                  throw new Error(
                    `GraphQL checkout creation errors: ${errors
                      .map((e: { message: string }) => e.message)
                      .join(", ")}`
                  );
                }

                if (checkout) {
                  checkoutId = checkout.id;

                  // Update checkout info
                  set({
                    checkoutId: checkout.id,
                    checkoutToken: checkout.token,
                  });

                  // Store in localStorage
                  try {
                    localStorage.setItem("checkoutId", checkout.id);
                    if (checkout.token) {
                      localStorage.setItem("checkoutToken", checkout.token);
                    }
                  } catch {}

                  // Store in user metadata for cross-device persistence
                  state
                    .storeCheckoutInUserMetadata(checkout.id, checkout.token)
                    .catch(console.error);
                }
              } else {
                throw new Error("Failed to create checkout via GraphQL");
              }
            } else {
              // Add to existing checkout
              const addResponse = await fetch(
                process.env.NEXT_PUBLIC_API_URL || "/api/graphql",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(token && { Authorization: `Bearer ${token}` }),
                  },
                  body: JSON.stringify({
                    query: CHECKOUT_LINES_ADD,
                    variables: {
                      id: checkoutId,
                      lines,
                    },
                  }),
                }
              );

              if (addResponse.ok) {
                const addData = await addResponse.json();
                const checkout = addData?.data?.checkoutLinesAdd?.checkout;
                const errors = addData?.data?.checkoutLinesAdd?.errors;

                if (errors?.length > 0) {
                  throw new Error(
                    `GraphQL add to cart errors: ${errors
                      .map((e: { message: string }) => e.message)
                      .join(", ")}`
                  );
                }

                if (checkout) {
                  // Update checkout info
                  set({
                    checkoutId: checkout.id,
                    checkoutToken: checkout.token,
                  });

                  // Store in localStorage
                  try {
                    localStorage.setItem("checkoutId", checkout.id);
                    if (checkout.token) {
                      localStorage.setItem("checkoutToken", checkout.token);
                    }
                  } catch {}

                  // Store in user metadata for cross-device persistence
                  state
                    .storeCheckoutInUserMetadata(checkout.id, checkout.token)
                    .catch(console.error);
                }
              } else {
                throw new Error("Failed to add item to checkout via GraphQL");
              }
            }

            // Add to local state after successful GraphQL operation
            // Store as a single consolidated item (with options embedded)
            // Use key-based deduplication to allow same base product with different options
            set((state) => {
              const itemKey = generateCartItemKey(
                itemToAdd.id,
                itemToAdd.selectedOptions,
                itemToAdd.customInputs
              );
              const itemWithKey = { ...itemToAdd, key: itemKey };
              const existing = state.cartItems.find((i) => i.key === itemKey);
              const cartItems = existing
                ? state.cartItems.map((i) =>
                    i.key === itemKey
                      ? { ...i, quantity: i.quantity + itemToAdd.quantity }
                      : i
                  )
                : [...state.cartItems, itemWithKey];
              const { totalItems, totalAmount } = calculateTotals(cartItems);
              return { cartItems, totalItems, totalAmount };
            });
          }
        } catch (error) {
          console.error(error);
          // Re-throw the error so the UI can handle it
          throw error;
        }
      },

      removeFromCart: (key) => {
        // Find the item first so we can sync its removal properly
        const currentState = useGlobalStore.getState();
        const itemToRemove = currentState.cartItems.find((i) => i.key === key);

        // Sync with Saleor FIRST (before clearing local state)
        if (currentState.checkoutId && itemToRemove) {
          currentState.syncCartRemovalWithSaleor(itemToRemove).catch(console.error);
        }

        // Then update local state using key-based filtering
        set((state) => {
          const cartItems = state.cartItems.filter((i) => i.key !== key);
          const { totalItems, totalAmount } = calculateTotals(cartItems);

          // If cart becomes empty, clear checkout info
          if (cartItems.length === 0) {
            try {
              localStorage.removeItem("checkoutId");
              localStorage.removeItem("checkoutToken");
            } catch {}
            return {
              cartItems,
              totalItems,
              totalAmount,
              checkoutId: null,
              checkoutToken: null,
            };
          }

          return { cartItems, totalItems, totalAmount };
        });
      },

      updateQuantity: (key, quantity) => {
        const prevState = useGlobalStore.getState();
        const oldItem = prevState.cartItems.find((item) => item.key === key);
        const oldQuantity = oldItem?.quantity || 0;

        set((state) => {
          const cartItems = state.cartItems
            .map((item) =>
              item.key === key
                ? { ...item, quantity: Math.max(0, quantity) }
                : item
            )
            .filter((item) => item.quantity > 0);
          const { totalItems, totalAmount } = calculateTotals(cartItems);

          // If cart becomes empty, clear checkout info
          if (cartItems.length === 0) {
            console.log(
              "[Store] Cart is now empty after quantity update, clearing checkout info"
            );
            try {
              localStorage.removeItem("checkoutId");
              localStorage.removeItem("checkoutToken");
            } catch {}
            return {
              cartItems,
              totalItems,
              totalAmount,
              checkoutId: null,
              checkoutToken: null,
            };
          }

          return { cartItems, totalItems, totalAmount };
        });

        // Sync with Saleor if there's a checkout and quantity actually changed
        const currentState = useGlobalStore.getState();
        if (currentState.checkoutId && oldItem && oldQuantity !== quantity) {
          if (quantity === 0) {
            // Item was removed
            currentState.syncCartRemovalWithSaleor(oldItem).catch(console.error);
          } else {
            // Quantity was updated
            currentState
              .syncCartQuantityWithSaleor(oldItem, quantity, oldQuantity)
              .catch(console.error);
          }
        }
      },

      clearCart: () => {
        // Clear cart and checkout info
        try {
          localStorage.removeItem("checkoutId");
          localStorage.removeItem("checkoutToken");
        } catch {}
        set({
          cartItems: [],
          totalItems: 0,
          totalAmount: 0,
          checkoutId: null,
          checkoutToken: null,
        });
      },
      setCheckoutId: (id) => set({ checkoutId: id }),
      setCheckoutToken: (token) => set({ checkoutToken: token }),
      setSelectedShippingMethodId: (id) =>
        set({ selectedShippingMethodId: id }),
      setSyncingCart: (syncing) => set({ syncingCart: syncing }),
      setIsYMMActive: (active) => set({ isYMMActive: active }),

      // Check YMM API status
      checkYMMStatus: async () => {
        if (typeof window === "undefined") return;

        try {
          const partsLogicUrl = process.env.NEXT_PUBLIC_PARTSLOGIC_URL;
          if (!partsLogicUrl) {
            set({ isYMMActive: false });
            return;
          }

          const response = await fetch(`${partsLogicUrl}/api/ping`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            cache: "no-store",
          });

          if (response.ok) {
            const data = await response.json();
            const isActive = data.message === "pong";
            set({ isYMMActive: isActive });
            console.log("YMM API Status:", isActive ? "Active" : "Inactive");

            // If YMM is active, load years data
            if (isActive) {
              const state = useGlobalStore.getState();
            }
          } else {
            set({ isYMMActive: false });
            console.log("YMM API Status: Inactive (failed to fetch)");
          }
        } catch (error) {
          set({ isYMMActive: false });
          console.error("Failed to check YMM status:", error);
        }
      },

      // Load YMM years (called only once)
      loadYMMYears: async () => {
        if (typeof window === "undefined") return;
        const state = useGlobalStore.getState();
        // if (state.ymmYearsLoaded) return; // Prevent multiple calls

        try {
          const partsLogicUrl = process.env.NEXT_PUBLIC_PARTSLOGIC_URL;
          if (!partsLogicUrl) return;

          const response = await fetch(
            `${partsLogicUrl}/api/fitment-search/root-types`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              cache: "no-store",
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data) {
              set({ ymmYears: data.data, ymmYearsLoaded: true });
              console.log("YMM Years loaded:", data.data.length);
            }
          }
        } catch (error) {
          console.error("Failed to load YMM years:", error);
        }
      },

      // Load cart from Saleor checkout when user logs in
      loadCartFromSaleor: async () => {
        if (typeof window === "undefined") return;

        const state = useGlobalStore.getState();
        if (!state.isLoggedIn) return;

        try {
          state.setSyncingCart(true);

          const token = localStorage.getItem("token");
          if (!token) return;

          // For logged-in users, get checkout ID from user metadata (cross-device)
          const checkoutId = await state.loadCheckoutFromUserMetadata();

          if (!checkoutId) {
            return;
          }

          const response = await fetch(
            process.env.NEXT_PUBLIC_API_URL || "/api/graphql",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
              },
              body: JSON.stringify({
                query: `
                query GetCheckoutDetails($id: ID!) {
                  checkout(id: $id) {
                    id
                    token
                    totalPrice { gross { amount currency } }
                    subtotalPrice { gross { amount currency } }
                    lines {
                      id
                      quantity
                      totalPrice { gross { amount currency } }
                      metadata {
                        key
                        value
                      }
                      variant {
                        id
                        name
                        sku
                        metadata {
                          key
                          value
                        }
                        product {
                          id
                          name
                          thumbnail { url }
                          category { name }
                          pricing {
                            discount { gross { amount currency } }
                          }
                        }
                        pricing {
                          price { gross { amount currency } }
                        }
                      }
                    }
                  }
                }
              `,
                variables: { id: checkoutId },
              }),
            }
          );

          if (!response.ok) throw new Error("Failed to fetch checkout");

          const data = await response.json();
          const checkout = data?.data?.checkout;

          if (checkout && checkout.lines?.length > 0) {
            // Type for checkout line from GraphQL
            type CheckoutLine = {
              id: string;
              quantity: number;
              totalPrice: { gross: { amount: number; currency: string } };
              metadata?: { key: string; value: string }[] | null;
              variant: {
                id: string;
                name: string;
                sku?: string | null;
                metadata?: { key: string; value: string }[] | null;
                product: {
                  id: string;
                  name: string;
                  thumbnail?: { url: string } | null;
                  category?: { name: string } | null;
                  pricing?: {
                    discount?: {
                      gross: { amount: number; currency: string };
                    } | null;
                  } | null;
                };
                pricing?: {
                  price?: {
                    gross: { amount: number; currency: string };
                  } | null;
                } | null;
              };
            };

            // Group lines by product ID, separating base products from option variants
            const productMap = new Map<
              string,
              {
                baseLine: CheckoutLine | null;
                optionLines: Array<{
                  line: CheckoutLine;
                  optionMeta: { name: string; label: string };
                }>;
              }
            >();

            for (const line of checkout.lines as CheckoutLine[]) {
              const productId = line.variant.product.id;
              const optionMeta = parseOptionSetMetadata(line.variant.metadata);

              if (!productMap.has(productId)) {
                productMap.set(productId, { baseLine: null, optionLines: [] });
              }

              const entry = productMap.get(productId)!;

              if (optionMeta) {
                // This is an option variant (has option_set metadata)
                entry.optionLines.push({ line, optionMeta });
              } else {
                // This is a base product variant
                entry.baseLine = line;
              }
            }

            // Convert the grouped map into CartItems
            // Handle case where same product is added multiple times with different option selections
            const cartItems: CartItem[] = [];

            for (const [, entry] of productMap) {
              const { baseLine, optionLines } = entry;

              // Determine the display line (prefer base, fall back to first option)
              const displayLine = baseLine ?? optionLines[0]?.line;
              if (!displayLine) continue;

              // If no option lines, create a single cart item for just the base product
              if (optionLines.length === 0) {
                const qty = Math.max(1, displayLine.quantity);
                const baseLineTotal = baseLine?.totalPrice?.gross?.amount ?? 0;
                const basePrice = baseLineTotal / qty;

                const customInputs = displayLine.metadata?.reduce(
                  (acc, item) => {
                    if (item.key && item.value) {
                      acc[item.key] = item.value;
                    }
                    return acc;
                  },
                  {} as Record<string, string>
                );
                const finalCustomInputs =
                  customInputs && Object.keys(customInputs).length > 0
                    ? customInputs
                    : undefined;

                const itemKey = generateCartItemKey(
                  displayLine.variant.id,
                  undefined,
                  finalCustomInputs
                );

                cartItems.push({
                  key: itemKey,
                  id: displayLine.variant.id,
                  name: displayLine.variant.product.name,
                  price: basePrice,
                  image: displayLine.variant.product.thumbnail?.url || "",
                  quantity: qty,
                  sku: displayLine.variant.sku || undefined,
                  category: displayLine.variant.product.category?.name || undefined,
                  customInputs: finalCustomInputs,
                });
                continue;
              }

              // Group option lines by their option set name to detect multiple selections
              const optionsBySetName = new Map<
                string,
                Array<{ line: CheckoutLine; optionMeta: { name: string; label: string } }>
              >();
              for (const opt of optionLines) {
                const setName = opt.optionMeta.name;
                if (!optionsBySetName.has(setName)) {
                  optionsBySetName.set(setName, []);
                }
                optionsBySetName.get(setName)!.push(opt);
              }

              // The number of cart items = max count of options in any single option set
              // (Multiple options from same set = multiple cart items with different selections)
              const numCartItems = Math.max(
                ...Array.from(optionsBySetName.values()).map((arr) => arr.length)
              );

              // Calculate base unit price
              const baseQty = baseLine?.quantity ?? 0;
              const baseLineTotal = baseLine?.totalPrice?.gross?.amount ?? 0;
              const baseUnitPrice = baseQty > 0 ? baseLineTotal / baseQty : 0;
              const skipBaseProduct = !baseLine;

              // For each cart item, pair options by quantity (options with same qty likely belong together)
              // Sort each option set's lines by quantity to pair them correctly
              for (const opts of optionsBySetName.values()) {
                opts.sort((a, b) => a.line.quantity - b.line.quantity);
              }

              for (let i = 0; i < numCartItems; i++) {
                // Collect one option from each set for this cart item (the i-th one if it exists)
                const selectedOptions: CartItemOption[] = [];
                const optionQuantities: number[] = [];

                for (const [, opts] of optionsBySetName) {
                  if (i < opts.length) {
                    const { line, optionMeta } = opts[i];
                    const optQty = Math.max(1, line.quantity);
                    const optLineTotal = line.totalPrice?.gross?.amount ?? 0;

                    optionQuantities.push(optQty);

                    selectedOptions.push({
                      variantId: line.variant.id,
                      name: line.variant.name,
                      price: optLineTotal / optQty,
                      optionSetName: optionMeta.name,
                      optionSetLabel: optionMeta.label,
                    });
                  }
                }

                // Use the first option's quantity (all options in same cart item should have same qty)
                // Only fallback to 1 if no options found (shouldn't happen in this branch)
                const cartItemQty = optionQuantities.length > 0
                  ? optionQuantities[0]
                  : 1;

                const customInputs = displayLine.metadata?.reduce(
                  (acc, item) => {
                    if (item.key && item.value) {
                      acc[item.key] = item.value;
                    }
                    return acc;
                  },
                  {} as Record<string, string>
                );
                const finalCustomInputs =
                  customInputs && Object.keys(customInputs).length > 0
                    ? customInputs
                    : undefined;

                const itemKey = generateCartItemKey(
                  displayLine.variant.id,
                  selectedOptions.length > 0 ? selectedOptions : undefined,
                  finalCustomInputs
                );

                cartItems.push({
                  key: itemKey,
                  id: displayLine.variant.id,
                  name: displayLine.variant.product.name,
                  price: baseUnitPrice,
                  image: displayLine.variant.product.thumbnail?.url || "",
                  quantity: cartItemQty,
                  sku: displayLine.variant.sku || undefined,
                  category: displayLine.variant.product.category?.name || undefined,
                  selectedOptions:
                    selectedOptions.length > 0 ? selectedOptions : undefined,
                  customInputs: finalCustomInputs,
                  skipBaseProduct,
                });
              }
            }

            const { totalItems, totalAmount } = calculateTotals(cartItems);

            set({
              cartItems,
              totalItems,
              totalAmount,
              checkoutId: checkout.id,
              checkoutToken: checkout.token,
            });

            // Store in localStorage
            try {
              localStorage.setItem("checkoutId", checkout.id);
              if (checkout.token) {
                localStorage.setItem("checkoutToken", checkout.token);
              }
            } catch {}
          } else {
            console.log("No items found in checkout or checkout is empty");
          }
        } catch (error) {
          console.error("Failed to load cart from Saleor:", error);
          // If the checkout is not found or invalid, clear the stored checkout ID
          if (error instanceof Error && error.message.includes("not found")) {
            try {
              localStorage.removeItem("checkoutId");
              localStorage.removeItem("checkoutToken");
              set({ checkoutId: null, checkoutToken: null });
            } catch {}
          }
        } finally {
          state.setSyncingCart(false);
        }
      },

      // Sync local cart with backend
      syncCartWithSaleor: async () => {
        if (typeof window === "undefined") return;

        const state = useGlobalStore.getState();
        if (state.cartItems.length === 0) return;

        try {
          state.setSyncingCart(true);

          const token = localStorage.getItem("token");
          if (!token) return;

          const lastItem = state.cartItems[state.cartItems.length - 1];
          if (!lastItem) return;

          let checkoutId = state.checkoutId;

          // Create checkout if it doesn't exist
          if (!checkoutId) {
            const createResponse = await fetch(
              process.env.NEXT_PUBLIC_API_URL || "/api/graphql",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(token && { Authorization: `Bearer ${token}` }),
                },
                body: JSON.stringify({
                  query: CHECKOUT_CREATE,
                  variables: {
                    input: {
                      channel: "default-channel",
                      lines: [
                        {
                          variantId: lastItem.id,
                          quantity: lastItem.quantity,
                        },
                      ],
                    },
                  },
                }),
              }
            );

            if (createResponse.ok) {
              const createData = await createResponse.json();
              const checkout = createData?.data?.checkoutCreate?.checkout;
              const errors = createData?.data?.checkoutCreate?.errors;

              if (errors?.length > 0) {
                throw new Error(
                  `GraphQL checkout creation errors: ${errors
                    .map((e: { message: string }) => e.message)
                    .join(", ")}`
                );
              }

              if (checkout) {
                checkoutId = checkout.id;

                // Update checkout info
                set({
                  checkoutId: checkout.id,
                  checkoutToken: checkout.token,
                });

                // Store in localStorage
                try {
                  localStorage.setItem("checkoutId", checkout.id);
                  if (checkout.token) {
                    localStorage.setItem("checkoutToken", checkout.token);
                  }
                } catch {}

                // Store in user metadata for cross-device persistence
                if (state.isLoggedIn) {
                  state
                    .storeCheckoutInUserMetadata(checkout.id, checkout.token)
                    .catch(console.error);
                }

                console.log(
                  "Synced item to checkout via GraphQL:",
                  lastItem.name
                );
              }
            } else {
              throw new Error("Failed to create checkout via GraphQL");
            }
          } else {
            // Add to existing checkout using GraphQL
            const addResponse = await fetch(
              process.env.NEXT_PUBLIC_API_URL || "/api/graphql",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(token && { Authorization: `Bearer ${token}` }),
                },
                body: JSON.stringify({
                  query: CHECKOUT_LINES_ADD,
                  variables: {
                    id: checkoutId,
                    lines: [
                      {
                        variantId: lastItem.id,
                        quantity: lastItem.quantity,
                      },
                    ],
                  },
                }),
              }
            );

            if (addResponse.ok) {
              const addData = await addResponse.json();
              const checkout = addData?.data?.checkoutLinesAdd?.checkout;
              const errors = addData?.data?.checkoutLinesAdd?.errors;

              if (errors?.length > 0) {
                throw new Error(
                  `GraphQL add to cart errors: ${errors
                    .map((e: { message: string }) => e.message)
                    .join(", ")}`
                );
              }

              if (checkout) {
                // Update checkout info
                set({
                  checkoutId: checkout.id,
                  checkoutToken: checkout.token,
                });

                // Store in localStorage
                try {
                  localStorage.setItem("checkoutId", checkout.id);
                  if (checkout.token) {
                    localStorage.setItem("checkoutToken", checkout.token);
                  }
                } catch {}

                // Store in user metadata for cross-device persistence
                if (state.isLoggedIn) {
                  state
                    .storeCheckoutInUserMetadata(checkout.id, checkout.token)
                    .catch(console.error);
                }

                console.log(
                  "Synced item to existing checkout via GraphQL:",
                  lastItem.name
                );
              }
            } else {
              throw new Error("Failed to add item to checkout via GraphQL");
            }
          }
        } catch (error) {
          console.error("Failed to sync cart with GraphQL:", error);
        } finally {
          state.setSyncingCart(false);
        }
      },

      // Store checkout ID in user's metadata for cross-device persistence
      storeCheckoutInUserMetadata: async (
        checkoutId: string,
        checkoutToken?: string
      ) => {
        if (typeof window === "undefined") return;

        const state = useGlobalStore.getState();
        if (!state.isLoggedIn) return;

        try {
          const token = localStorage.getItem("token");
          if (!token) return;

          const response = await fetch(
            process.env.NEXT_PUBLIC_API_URL || "/api/graphql",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
              },
              body: JSON.stringify({
                query: `
                mutation AccountUpdate($input: AccountInput!) {
                  accountUpdate(input: $input) {
                    user {
                      id
                      metadata {
                        key
                        value
                      }
                    }
                    errors {
                      field
                      message
                    }
                  }
                }
              `,
                variables: {
                  input: {
                    metadata: [
                      {
                        key: "activeCheckoutId",
                        value: checkoutId,
                      },
                      ...(checkoutToken
                        ? [
                            {
                              key: "activeCheckoutToken",
                              value: checkoutToken,
                            },
                          ]
                        : []),
                    ],
                  },
                },
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            const errors = data?.data?.accountUpdate?.errors;

            if (errors?.length > 0) {
              console.error(
                "Failed to store checkout in user metadata:",
                errors
              );
            } else {
              console.log("Checkout ID stored in user metadata");
            }
          }
        } catch (error) {
          console.error("Failed to store checkout in user metadata:", error);
        }
      },

      // Load checkout ID from user's metadata
      loadCheckoutFromUserMetadata: async (): Promise<string | null> => {
        if (typeof window === "undefined") return null;

        const state = useGlobalStore.getState();
        if (!state.isLoggedIn) return null;

        try {
          const token = localStorage.getItem("token");
          if (!token) return null;

          const response = await fetch(
            process.env.NEXT_PUBLIC_API_URL || "/api/graphql",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
              },
              body: JSON.stringify({
                query: `
                query GetUserWithCheckout {
                  me {
                    id
                    metadata {
                      key
                      value
                    }
                  }
                }
              `,
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            const metadata = data?.data?.me?.metadata || [];

            const checkoutIdMetadata = metadata.find(
              (item: { key: string; value: string }) =>
                item.key === "activeCheckoutId"
            );
            const checkoutTokenMetadata = metadata.find(
              (item: { key: string; value: string }) =>
                item.key === "activeCheckoutToken"
            );

            if (checkoutIdMetadata?.value) {
              console.log(
                "Found checkout ID in user metadata:",
                checkoutIdMetadata.value
              );

              // Store in localStorage as fallback
              localStorage.setItem("checkoutId", checkoutIdMetadata.value);
              if (checkoutTokenMetadata?.value) {
                localStorage.setItem(
                  "checkoutToken",
                  checkoutTokenMetadata.value
                );
              }

              return checkoutIdMetadata.value;
            }
          }
        } catch (error) {
          console.error("Failed to load checkout from user metadata:", error);
        }

        return null;
      },

      // ✅ NEW: blow away all local + server metadata after successful order
      finalizeCheckoutCleanup: async () => {
        const state = useGlobalStore.getState();

        // 1) Clear cart in store
        state.clearCart();

        // 2) Clear checkout ids and shipping method in store
        set({
          checkoutId: null,
          checkoutToken: null,
          selectedShippingMethodId: null,
        });

        // 3) Clear guest data only if not logged in (for fresh start on next order)
        if (!state.isLoggedIn) {
          set({
            guestEmail: "",
            guestShippingInfo: {
              firstName: "",
              lastName: "",
              address: "",
              city: "",
              state: "",
              zipCode: "",
              country: "",
              phone: "",
            },
          });
        }

        // Always clear shipping method selection (never persist across orders)
        console.log("Clearing shipping method selection for fresh start");

        // 4) Clear localStorage copies
        try {
          localStorage.removeItem("checkoutId");
          localStorage.removeItem("checkoutToken");
          localStorage.removeItem("selectedShippingMethodId");
          localStorage.removeItem("pendingCheckoutId");
          localStorage.removeItem("pendingTransactionId");
        } catch {}

        // 5) Clear sessionStorage copies
        try {
          sessionStorage.removeItem("checkoutId");
          sessionStorage.removeItem("transactionId");
        } catch {}

        // 6) Clear server-side metadata so old checkout can't rehydrate
        try {
          const token = localStorage.getItem("token");
          if (token) {
            await fetch(process.env.NEXT_PUBLIC_API_URL || "/api/graphql", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
              },
              body: JSON.stringify({
                query: `
                  mutation AccountUpdate($input: AccountInput!) {
                    accountUpdate(input: $input) {
                      user { id }
                      errors { field message }
                    }
                  }
                `,
                variables: {
                  input: {
                    metadata: [
                      { key: "activeCheckoutId", value: "" },
                      { key: "activeCheckoutToken", value: "" },
                    ],
                  },
                },
              }),
            });
          }
        } catch (e) {
          console.warn("[checkout cleanup] failed to clear user metadata", e);
        }
      },

      // Sync cart quantity changes with Saleor
      // Now accepts a CartItem to properly sync all variant IDs (base + options)
      syncCartQuantityWithSaleor: async (
        cartItem: CartItem,
        newQuantity: number,
        oldQuantity: number
      ) => {
        if (typeof window === "undefined") return;

        const state = useGlobalStore.getState();
        if (!state.checkoutId) return;

        try {
          const token = localStorage.getItem("token");

          // If quantity is 0, we need to remove the line entirely
          if (newQuantity === 0) {
            await state.syncCartRemovalWithSaleor(cartItem);
            return;
          }

          // Build lines for all variants (base product + selected options)
          const lines: Array<{ variantId: string; quantity: number }> = [];

          // Add base product only if not skipBaseProduct
          if (!cartItem.skipBaseProduct) {
            lines.push({ variantId: cartItem.id, quantity: newQuantity });
          }

          // Add option variant lines if present
          if (cartItem.selectedOptions?.length) {
            for (const option of cartItem.selectedOptions) {
              lines.push({
                variantId: option.variantId,
                quantity: newQuantity,
              });
            }
          }

          const response = await fetch(
            process.env.NEXT_PUBLIC_API_URL || "/api/graphql",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
              },
              body: JSON.stringify({
                query: CHECKOUT_LINES_UPDATE,
                variables: {
                  id: state.checkoutId,
                  lines,
                },
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            const errors = data?.data?.checkoutLinesUpdate?.errors;

            if (errors?.length > 0) {
              console.error("Checkout quantity update errors:", errors);
            } else {
              console.log(
                `Updated quantity for cart item ${cartItem.key}: ${oldQuantity} → ${newQuantity}`
              );
            }
          } else {
            console.error("Failed to update quantity in Saleor checkout");
          }
        } catch (error) {
          console.error("Failed to sync quantity with Saleor:", error);
        }
      },

      // Sync cart item removal with Saleor
      // Now accepts a CartItem to properly remove all variant IDs (base + options)
      syncCartRemovalWithSaleor: async (cartItem: CartItem) => {
        if (typeof window === "undefined") return;

        const state = useGlobalStore.getState();
        if (!state.checkoutId) return;

        try {
          const token = localStorage.getItem("token");

          // Collect all variant IDs to remove (base product + selected options)
          const variantIdsToRemove: string[] = [];

          // Add base product only if not skipBaseProduct
          if (!cartItem.skipBaseProduct) {
            variantIdsToRemove.push(cartItem.id);
          }

          // Add option variant IDs if present
          if (cartItem.selectedOptions?.length) {
            for (const option of cartItem.selectedOptions) {
              variantIdsToRemove.push(option.variantId);
            }
          }

          if (variantIdsToRemove.length === 0) {
            console.log("No variants to remove from Saleor");
            return;
          }

          // Step 1: Get the checkout lines to find the correct line IDs
          const getCheckoutResponse = await fetch(
            process.env.NEXT_PUBLIC_API_URL || "/api/graphql",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
              },
              body: JSON.stringify({
                query: `
                query GetCheckoutLines($id: ID!) {
                  checkout(id: $id) {
                    id
                    lines {
                      id
                      variant { id }
                    }
                  }
                }
              `,
                variables: {
                  id: state.checkoutId,
                },
              }),
            }
          );

          if (!getCheckoutResponse.ok) {
            throw new Error("Failed to fetch checkout lines");
          }

          const checkoutData = await getCheckoutResponse.json();
          const checkout = checkoutData?.data?.checkout;

          if (!checkout?.lines) {
            console.error("No checkout lines found");
            return;
          }

          // Step 2: Find line IDs for all variants we want to remove
          const lineIdsToRemove: string[] = [];
          for (const variantId of variantIdsToRemove) {
            const lineToRemove = checkout.lines.find(
              (line: { id: string; variant: { id: string } }) =>
                line.variant.id === variantId
            );
            if (lineToRemove) {
              lineIdsToRemove.push(lineToRemove.id);
            } else {
              console.warn(`No checkout line found for variant ${variantId}`);
            }
          }

          if (lineIdsToRemove.length === 0) {
            console.error("No checkout lines found to remove");
            return;
          }

          // Step 3: Remove all lines using the checkout line IDs
          const deleteResponse = await fetch(
            process.env.NEXT_PUBLIC_API_URL || "/api/graphql",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
              },
              body: JSON.stringify({
                query: CHECKOUT_LINES_DELETE,
                variables: {
                  id: state.checkoutId,
                  linesIds: lineIdsToRemove,
                },
              }),
            }
          );

          if (deleteResponse.ok) {
            const data = await deleteResponse.json();
            const errors = data?.data?.checkoutLinesDelete?.errors;

            if (errors?.length > 0) {
              console.error("Checkout line removal errors:", errors);
            } else {
              console.log(
                `Removed ${lineIdsToRemove.length} checkout lines for cart item ${cartItem.key}`
              );
            }
          } else {
            console.error("Failed to remove checkout lines from Saleor");
          }
        } catch (error) {
          console.error("Failed to sync removal with Saleor:", error);
        }
      },
    }),
    {
      name: "wsm-global-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export { generateCartItemKey };
export default useGlobalStore;
