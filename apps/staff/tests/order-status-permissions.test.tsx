import { Alert } from 'react-native'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import type { Order } from '@yws/shared'
import { staffApi } from '../src/lib/api'
import { renderScreen, signInAs } from './helpers'
import OrderDetailScreen from '../app/(tabs)/orders/[id]'

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  Redirect: () => null,
  useLocalSearchParams: () => ({ id: 'o1' }),
}))
jest.mock('../src/lib/api', () => ({
  staffApi: { orders: { get: jest.fn(), updateStatus: jest.fn() } },
  mediaUrl: (path: string) => path,
  STOREFRONT_URL: 'https://tiendas.test',
}))

const api = staffApi as unknown as { orders: { get: jest.Mock; updateStatus: jest.Mock } }

function order(overrides: Partial<Order>): Order {
  return {
    id: 'o1',
    orderNumber: 'ORD-1',
    customerName: 'Ana',
    customerEmail: null,
    customerPhone: null,
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    fulfillmentMethod: 'STRIPE',
    currency: 'USD',
    subtotal: '10',
    taxTotal: '0',
    discountTotal: '0',
    shippingTotal: '0',
    grandTotal: '10',
    items: [],
    shippingAddress: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  } as Order
}

const chip = (label: string) => screen.getByRole('radio', { name: label })
const isDisabled = (label: string) => chip(label).props.accessibilityState?.disabled === true

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined)
  api.orders.updateStatus.mockResolvedValue({})
})

describe('estado de un pedido pagado con tarjeta', () => {
  beforeEach(() => api.orders.get.mockResolvedValue(order({})))

  it('a un colaborador no le deja devolver dinero (reembolsar, o cancelar un pedido ya pagado)', async () => {
    signInAs('STAFF')
    renderScreen(OrderDetailScreen)

    await screen.findByText('Estado')
    expect(isDisabled('Reembolsado')).toBe(true)
    expect(isDisabled('Cancelado')).toBe(true)
    expect(isDisabled('En preparación')).toBe(false)
    expect(screen.getByText(/solo lo puede hacer el dueño de la tienda/)).toBeTruthy()

    fireEvent.press(chip('Reembolsado'))
    expect(Alert.alert).not.toHaveBeenCalled()
  })

  it('al dueño le deja, y le avisa de que cancelar un pedido pagado con tarjeta lo reembolsa', async () => {
    signInAs('OWNER')
    renderScreen(OrderDetailScreen)

    await screen.findByText('Estado')
    expect(isDisabled('Cancelado')).toBe(false)
    expect(screen.queryByText(/solo lo puede hacer el dueño de la tienda/)).toBeNull()

    fireEvent.press(chip('Cancelado'))
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1))
    expect((Alert.alert as jest.Mock).mock.calls[0][1]).toMatch(/reembolsará a través de la pasarela/)
  })
})

describe('estado de un pedido que no movió dinero', () => {
  beforeEach(() => api.orders.get.mockResolvedValue(order({ paymentStatus: 'PENDING', status: 'PENDING' })))

  it('un colaborador puede cancelarlo, pero no marcarlo como reembolsado', async () => {
    signInAs('STAFF')
    renderScreen(OrderDetailScreen)

    await screen.findByText('Estado')
    expect(isDisabled('Cancelado')).toBe(false)
    expect(isDisabled('Reembolsado')).toBe(true)

    fireEvent.press(chip('Cancelado'))
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1))
    expect((Alert.alert as jest.Mock).mock.calls[0][1]).toMatch(/se liberará su stock/)
    expect((Alert.alert as jest.Mock).mock.calls[0][1]).not.toMatch(/reembolsar/)
  })
})
