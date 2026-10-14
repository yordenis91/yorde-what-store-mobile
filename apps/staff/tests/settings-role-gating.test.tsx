import React from 'react'
import { TextInput } from 'react-native'
import { screen, waitFor } from '@testing-library/react-native'
import { staffApi } from '../src/lib/api'
import { renderScreen, signInAs, tenantFixture } from './helpers'
import GeneralScreen from '../app/store-settings/general'
import AppearanceScreen from '../app/store-settings/appearance'
import SocialScreen from '../app/store-settings/social'
import TrustScreen from '../app/store-settings/trust'
import ChannelsScreen from '../app/store-settings/channels'
import PoliciesScreen from '../app/store-settings/policies'
import EmailScreen from '../app/store-settings/email'
import PaymentsScreen from '../app/store-settings/payments'
import SettingsTab from '../app/(tabs)/settings'

jest.mock('../src/lib/api', () => ({
  staffApi: {
    tenants: { current: jest.fn(), update: jest.fn(), listPaymentSettings: jest.fn(), storefront: jest.fn() },
    plans: { entitlements: jest.fn() },
    auth: { logout: jest.fn() },
    devices: { unregister: jest.fn() },
  },
  mediaUrl: (path: string) => path,
}))

const api = staffApi as unknown as {
  tenants: Record<'current' | 'update' | 'listPaymentSettings' | 'storefront', jest.Mock>
  plans: { entitlements: jest.Mock }
}

const READ_ONLY_NOTICE = /Solo el dueño de la tienda puede cambiar esta configuración/

beforeEach(() => {
  jest.clearAllMocks()
  api.tenants.current.mockResolvedValue(tenantFixture())
  api.tenants.listPaymentSettings.mockResolvedValue([])
  api.tenants.storefront.mockResolvedValue(tenantFixture())
  api.plans.entitlements.mockResolvedValue({
    fulfillmentMethods: ['WHATSAPP', 'TELEGRAM', 'STRIPE', 'MERCADOPAGO', 'ZELLE'],
  })
})

/**
 * The seven sections that go through `PATCH /tenants/current`, which the api only lets an OWNER call
 * (`@Roles('OWNER')`). A collaborator must get the values to read and nothing to submit, instead of a
 * form that fails with a 403 after they filled it in.
 */
const SECTIONS: [string, React.ComponentType, string, number][] = [
  // [name, screen, save button, minimum text inputs the screen shows with every optional block on]
  // `appearance` is logo/banner/theme pickers with no text input, so there only the notice and the
  // missing save button prove the gating.
  ['general', GeneralScreen, 'Guardar cambios', 3],
  ['appearance', AppearanceScreen, 'Guardar cambios', 0],
  ['social', SocialScreen, 'Guardar cambios', 7],
  ['trust', TrustScreen, 'Guardar cambios', 3],
  ['channels', ChannelsScreen, 'Guardar cambios', 4],
  ['policies', PoliciesScreen, 'Guardar cambios', 4],
  ['email', EmailScreen, 'Guardar cambios', 5],
]

describe.each(SECTIONS)('sección %s', (_name, Screen, saveTitle, minInputs) => {
  // WhatsApp, Telegram and SMTP reveal their fields only when switched on: turn them on so the
  // "every input is read-only" check below looks at all of them, not at an empty list.
  beforeEach(() => {
    api.tenants.current.mockResolvedValue(
      tenantFixture({ whatsappEnabled: true, telegramEnabled: true, smtpEnabled: true }),
    )
  })

  it('deja editar y guardar al dueño', async () => {
    signInAs('OWNER')
    renderScreen(Screen)

    expect(await screen.findByText(saveTitle)).toBeTruthy()
    expect(screen.queryByText(READ_ONLY_NOTICE)).toBeNull()
    const inputs = screen.UNSAFE_queryAllByType(TextInput)
    expect(inputs.length).toBeGreaterThanOrEqual(minInputs)
    expect(inputs.every((input) => input.props.editable !== false)).toBe(true)
  })

  it('a un colaborador le muestra los valores, avisa y no ofrece guardar', async () => {
    signInAs('STAFF')
    renderScreen(Screen)

    expect(await screen.findByText(READ_ONLY_NOTICE)).toBeTruthy()
    expect(screen.queryByText(saveTitle)).toBeNull()
    const inputs = screen.UNSAFE_queryAllByType(TextInput)
    expect(inputs.length).toBeGreaterThanOrEqual(minInputs)
    expect(inputs.every((input) => input.props.editable === false)).toBe(true)
    expect(api.tenants.update).not.toHaveBeenCalled()
  })
})

describe('métodos de pago', () => {
  it('al dueño le carga y muestra los tres proveedores', async () => {
    signInAs('OWNER')
    renderScreen(PaymentsScreen)

    expect(await screen.findByText('Guardar Zelle')).toBeTruthy()
    expect(screen.getByText('Stripe')).toBeTruthy()
    expect(screen.getByText('MercadoPago')).toBeTruthy()
    expect(api.tenants.listPaymentSettings).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(READ_ONLY_NOTICE)).toBeNull()
  })

  it('a un colaborador ni se lo muestra ni lo pide: el endpoint es solo del dueño', async () => {
    signInAs('STAFF')
    renderScreen(PaymentsScreen)

    expect(await screen.findByText(READ_ONLY_NOTICE)).toBeTruthy()
    expect(screen.getByText(/solo la puede ver y cambiar el dueño/)).toBeTruthy()
    expect(screen.queryByText('Guardar Zelle')).toBeNull()
    expect(screen.UNSAFE_queryAllByType(TextInput)).toHaveLength(0)
    // Pedirlo sería un 403 seguro, y de paso filtraría que el colaborador intenta leer credenciales.
    await waitFor(() => expect(api.tenants.current).not.toHaveBeenCalled())
    expect(api.tenants.listPaymentSettings).not.toHaveBeenCalled()
    expect(api.tenants.storefront).not.toHaveBeenCalled()
  })
})

describe('pestaña Ajustes', () => {
  it('avisa al colaborador de que la configuración es solo lectura', () => {
    signInAs('STAFF')
    renderScreen(SettingsTab)

    expect(screen.getByText(READ_ONLY_NOTICE)).toBeTruthy()
  })

  it('no avisa al dueño, y le ofrece las ocho secciones', () => {
    signInAs('OWNER')
    renderScreen(SettingsTab)

    expect(screen.queryByText(READ_ONLY_NOTICE)).toBeNull()
    for (const title of [
      'General',
      'Apariencia',
      'Redes sociales',
      'Franja de confianza',
      'Canales de venta',
      'Métodos de pago',
      'Políticas de la tienda',
      'Envío de emails',
    ]) {
      expect(screen.getByText(title)).toBeTruthy()
    }
  })
})
