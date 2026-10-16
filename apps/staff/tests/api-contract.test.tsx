import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { staffApi } from '../src/lib/api'
import { renderScreen, signInAs, tenantFixture } from './helpers'
import ChannelsScreen from '../app/store-settings/channels'
import PaymentsScreen from '../app/store-settings/payments'

jest.mock('../src/lib/api', () => ({
  staffApi: {
    tenants: {
      current: jest.fn(),
      update: jest.fn(),
      listPaymentSettings: jest.fn(),
      storefront: jest.fn(),
      upsertPaymentSetting: jest.fn(),
    },
    plans: { entitlements: jest.fn() },
    auth: { logout: jest.fn() },
    devices: { unregister: jest.fn() },
  },
  mediaUrl: (path: string) => path,
}))

const api = staffApi as unknown as {
  tenants: Record<'current' | 'update' | 'listPaymentSettings' | 'storefront' | 'upsertPaymentSetting', jest.Mock>
  plans: { entitlements: jest.Mock }
}

const telegramOn = (overrides = {}) =>
  tenantFixture({ telegramEnabled: true, telegramChatId: 'chat-1', telegramBotTokenSet: true, ...overrides })

beforeEach(() => {
  jest.clearAllMocks()
  api.tenants.current.mockResolvedValue(telegramOn())
  api.tenants.update.mockImplementation((changes: object) => Promise.resolve(telegramOn(changes)))
  api.tenants.listPaymentSettings.mockResolvedValue([])
  api.tenants.storefront.mockResolvedValue(tenantFixture())
  api.tenants.upsertPaymentSetting.mockResolvedValue({})
  api.plans.entitlements.mockResolvedValue({
    fulfillmentMethods: ['WHATSAPP', 'TELEGRAM', 'STRIPE', 'MERCADOPAGO', 'ZELLE'],
  })
})

describe('el token del bot de Telegram es de solo escritura', () => {
  it('no manda el token (borraría el guardado) cuando solo cambió otra cosa', async () => {
    signInAs('OWNER')
    renderScreen(ChannelsScreen)

    const chat = await screen.findByDisplayValue('chat-1')
    fireEvent.changeText(chat, 'chat-2')
    fireEvent.press(screen.getByText('Guardar cambios'))

    await waitFor(() => expect(api.tenants.update).toHaveBeenCalledTimes(1))
    const sent = api.tenants.update.mock.calls[0][0] as Record<string, unknown>
    expect(sent).not.toHaveProperty('telegramBotToken')
    expect(sent.telegramChatId).toBe('chat-2')
  })

  it('con Telegram apagado tampoco lo manda: antes llegaba como null', async () => {
    api.tenants.current.mockResolvedValue(telegramOn({ telegramEnabled: false }))
    signInAs('OWNER')
    renderScreen(ChannelsScreen)

    fireEvent.press(await screen.findByText('Guardar cambios'))

    await waitFor(() => expect(api.tenants.update).toHaveBeenCalledTimes(1))
    expect(api.tenants.update.mock.calls[0][0]).not.toHaveProperty('telegramBotToken')
  })

  it('reemplaza el token cuando se escribe uno nuevo', async () => {
    signInAs('OWNER')
    renderScreen(ChannelsScreen)

    const token = await screen.findByPlaceholderText('••••••••')
    expect(token.props.value).toBe('')
    fireEvent.changeText(token, '  123:nuevo ')
    fireEvent.press(screen.getByText('Guardar cambios'))

    await waitFor(() => expect(api.tenants.update).toHaveBeenCalledTimes(1))
    expect(api.tenants.update.mock.calls[0][0]).toMatchObject({ telegramBotToken: '123:nuevo' })
  })

  it('no deja activar Telegram sin token guardado ni escrito', async () => {
    api.tenants.current.mockResolvedValue(telegramOn({ telegramBotTokenSet: false }))
    signInAs('OWNER')
    renderScreen(ChannelsScreen)

    fireEvent.press(await screen.findByText('Guardar cambios'))

    expect(await screen.findByText('Ingresá el token del bot de Telegram')).toBeTruthy()
    expect(api.tenants.update).not.toHaveBeenCalled()
  })
})

describe('MercadoPago no tiene credenciales por tienda', () => {
  it('ofrece solo el interruptor y guarda sin credenciales', async () => {
    signInAs('OWNER')
    renderScreen(PaymentsScreen)

    expect(await screen.findByText('Guardar MercadoPago')).toBeTruthy()
    expect(screen.queryByText('Access token')).toBeNull()
    fireEvent.press(screen.getByText('Guardar MercadoPago'))

    await waitFor(() => expect(api.tenants.upsertPaymentSetting).toHaveBeenCalledTimes(1))
    expect(api.tenants.upsertPaymentSetting.mock.calls[0][0]).toEqual({ provider: 'MERCADOPAGO', isEnabled: false })
  })
})
