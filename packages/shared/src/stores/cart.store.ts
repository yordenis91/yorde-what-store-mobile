import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { asyncJsonStorage } from '../storage/async-json-storage'

/** Mirrors `yorde-what-store-client/src/store/cart.store.ts` field-for-field so checkout payloads match on both clients. */
export interface CartItem {
  productId: string
  variantId?: string
  name: string
  variantName?: string
  unitPrice: number
  quantity: number
  imageUrl?: string
  /** Units in stock when the store tracks inventory; absent means no limit (same as the web client). */
  maxQuantity?: number
}

interface CartState {
  tenantSlug: string | null
  items: CartItem[]
  couponCode: string | null
  setTenantSlug: (slug: string | null) => void
  addItem: (item: CartItem) => void
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void
  removeItem: (productId: string, variantId?: string) => void
  setCoupon: (code: string | null) => void
  clear: () => void
}

function sameLine(a: CartItem, productId: string, variantId?: string) {
  return a.productId === productId && a.variantId === variantId
}

/** Caps a line at its stock. The api re-checks stock on order, but the cart shouldn't offer what can't be bought. */
function capToStock(quantity: number, maxQuantity: number | undefined) {
  return maxQuantity !== undefined ? Math.min(quantity, Math.max(maxQuantity, 0)) : quantity
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      tenantSlug: null,
      items: [],
      couponCode: null,
      setTenantSlug: (slug) => {
        if (get().tenantSlug !== slug) {
          set({ tenantSlug: slug, items: [], couponCode: null })
        }
      },
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => sameLine(i, item.productId, item.variantId))
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, item.productId, item.variantId)
                  ? // The incoming item carries the freshest stock figure.
                    { ...i, maxQuantity: item.maxQuantity, quantity: capToStock(i.quantity + item.quantity, item.maxQuantity) }
                  : i,
              ),
            }
          }
          const quantity = capToStock(item.quantity, item.maxQuantity)
          return quantity > 0 ? { items: [...state.items, { ...item, quantity }] } : {}
        }),
      updateQuantity: (productId, variantId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => !sameLine(i, productId, variantId))
              : state.items.map((i) =>
                  sameLine(i, productId, variantId) ? { ...i, quantity: capToStock(quantity, i.maxQuantity) } : i,
                ),
        })),
      removeItem: (productId, variantId) =>
        set((state) => ({ items: state.items.filter((i) => !sameLine(i, productId, variantId)) })),
      setCoupon: (couponCode) => set({ couponCode }),
      clear: () => set({ items: [], couponCode: null }),
    }),
    {
      name: 'yws-cart',
      storage: createJSONStorage(() => asyncJsonStorage),
    },
  ),
)
