import { useCartStore, type CartItem } from '../cart.store'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

const shirt: CartItem = { productId: 'p1', name: 'Shirt', unitPrice: 10, quantity: 1 }
const shirtRed: CartItem = { ...shirt, variantId: 'red', variantName: 'Red' }

beforeEach(() => {
  useCartStore.setState(useCartStore.getInitialState(), true)
})

const items = () => useCartStore.getState().items

describe('useCartStore', () => {
  it('merges repeated adds of the same line into one quantity', () => {
    useCartStore.getState().addItem(shirt)
    useCartStore.getState().addItem({ ...shirt, quantity: 2 })
    expect(items()).toEqual([{ ...shirt, quantity: 3 }])
  })

  it('keeps each variant of a product on its own line', () => {
    useCartStore.getState().addItem(shirt)
    useCartStore.getState().addItem(shirtRed)
    expect(items()).toHaveLength(2)
  })

  it('updates the quantity of only the matching line', () => {
    useCartStore.getState().addItem(shirt)
    useCartStore.getState().addItem(shirtRed)
    useCartStore.getState().updateQuantity('p1', 'red', 5)
    expect(items()).toEqual([shirt, { ...shirtRed, quantity: 5 }])
  })

  it.each([0, -1])('removes the line when its quantity drops to %i', (quantity) => {
    useCartStore.getState().addItem(shirt)
    useCartStore.getState().addItem(shirtRed)
    useCartStore.getState().updateQuantity('p1', undefined, quantity)
    expect(items()).toEqual([shirtRed])
  })

  it('removes a single line', () => {
    useCartStore.getState().addItem(shirt)
    useCartStore.getState().addItem(shirtRed)
    useCartStore.getState().removeItem('p1', 'red')
    expect(items()).toEqual([shirt])
  })

  it('empties the cart and coupon when switching to a different store', () => {
    useCartStore.getState().setTenantSlug('store-a')
    useCartStore.getState().addItem(shirt)
    useCartStore.getState().setCoupon('SAVE10')
    useCartStore.getState().setTenantSlug('store-b')
    expect(useCartStore.getState()).toMatchObject({ tenantSlug: 'store-b', items: [], couponCode: null })
  })

  it('keeps the cart when the same store is set again', () => {
    useCartStore.getState().setTenantSlug('store-a')
    useCartStore.getState().addItem(shirt)
    useCartStore.getState().setTenantSlug('store-a')
    expect(items()).toEqual([shirt])
  })

  it('clears items and coupon but stays on the same store', () => {
    useCartStore.getState().setTenantSlug('store-a')
    useCartStore.getState().addItem(shirt)
    useCartStore.getState().setCoupon('SAVE10')
    useCartStore.getState().clear()
    expect(useCartStore.getState()).toMatchObject({ tenantSlug: 'store-a', items: [], couponCode: null })
  })
})
