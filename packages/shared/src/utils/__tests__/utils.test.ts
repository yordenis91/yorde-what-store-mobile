import { formatMoney } from '../format'
import { storeSlugSchema } from '../validation'
import { buildWhatsAppUrl } from '../whatsapp'

describe('storeSlugSchema', () => {
  it.each([
    ['my-store', 'my-store'],
    ['  My-Store  ', 'my-store'],
    ['ywstore://store/my-store', 'my-store'],
    ['https://yorde.app/store/my-store', 'my-store'],
    ['https://yorde.app/store/my-store/', 'my-store'],
    ['https://yorde.app/store/my-store/product/p1?ref=qr', 'my-store'],
    ['https://my-store.yorde.app', 'my-store'],
    ['https://My-Store.yorde.app/', 'my-store'],
    ['https://my-store.yorde.app:5173/product/p1', 'my-store'],
    ['my-store.tiendas.example.com', 'my-store'],
  ])('reads %j as the slug %j', (input, slug) => {
    expect(storeSlugSchema.parse(input)).toBe(slug)
  })

  it.each([
    ['empty', ''],
    ['whitespace only', '   '],
    ['the platform apex', 'https://yorde.app'],
    ['a reserved subdomain', 'https://www.yorde.app'],
    ['a slug with invalid characters', 'my store!'],
  ])('rejects %s', (_label, input) => {
    expect(storeSlugSchema.safeParse(input).success).toBe(false)
  })
})

describe('formatMoney', () => {
  // The api stores 'pre' (default) or 'post' — see its Prisma schema.
  const before = { currencySymbol: '$', currencySymbolPosition: 'pre' }
  const after = { currencySymbol: '€', currencySymbolPosition: 'post' }

  it('places the symbol where the tenant configured it', () => {
    expect(formatMoney('12.5', before)).toBe('$12.50')
    expect(formatMoney('12.5', after)).toBe('12.50€')
  })

  it('accepts numbers as well as decimal strings', () => {
    expect(formatMoney(3, before)).toBe('$3.00')
  })

  it('shows the amount without a symbol while the tenant is still loading', () => {
    expect(formatMoney('12.5', undefined)).toBe('12.50')
  })

  it('shows zero instead of NaN for an unparseable amount', () => {
    expect(formatMoney('not-a-number', before)).toBe('$0.00')
  })
})

describe('buildWhatsAppUrl', () => {
  it('keeps only the digits of the phone number and encodes the message', () => {
    expect(buildWhatsAppUrl('+53 (5) 123-4567', 'Hola & adiós')).toBe('https://wa.me/5351234567?text=Hola%20%26%20adi%C3%B3s')
  })
})
