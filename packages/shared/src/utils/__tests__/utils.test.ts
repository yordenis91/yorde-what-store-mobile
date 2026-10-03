import { discountPercent, formatMoney } from '../format'
import { createMediaUrlResolver } from '../media'
import { cleanShippingAddress, createStoreSlugSchema, deliveryAddressError, storeSlugSchema } from '../validation'
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

describe('createStoreSlugSchema with a known root domain', () => {
  const schema = createStoreSlugSchema('yws.yordeniscorreoso.com')

  it.each([
    ['https://mi-tienda.yws.yordeniscorreoso.com', 'mi-tienda'],
    ['https://Mi-Tienda.yws.yordeniscorreoso.com/product/p1?ref=qr', 'mi-tienda'],
    ['mi-tienda.yws.yordeniscorreoso.com', 'mi-tienda'],
    ['https://yws.yordeniscorreoso.com/store/mi-tienda', 'mi-tienda'],
    ['mi-tienda', 'mi-tienda'],
    // Off the root domain the generic rule still applies.
    ['https://mi-tienda.otro-dominio.com', 'mi-tienda'],
  ])('reads %j as the slug %j', (input, slug) => {
    expect(schema.parse(input)).toBe(slug)
  })

  it.each([
    // Without the root domain these would be misread as the slugs "yws" and "a".
    ['the platform itself', 'https://yws.yordeniscorreoso.com'],
    ['a nested subdomain', 'https://a.b.yws.yordeniscorreoso.com'],
    ['a reserved subdomain', 'https://www.yws.yordeniscorreoso.com'],
  ])('rejects %s', (_label, input) => {
    expect(schema.safeParse(input).success).toBe(false)
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

describe('createMediaUrlResolver', () => {
  const resolve = createMediaUrlResolver('https://yws.yordeniscorreoso.com/api/v1')

  it('prefixes api-relative upload paths with the api origin', () => {
    expect(resolve('/uploads/t1/a.webp')).toBe('https://yws.yordeniscorreoso.com/uploads/t1/a.webp')
    expect(resolve('uploads/t1/a.webp')).toBe('https://yws.yordeniscorreoso.com/uploads/t1/a.webp')
  })

  it('keeps the port of a local api', () => {
    expect(createMediaUrlResolver('http://192.168.1.50:3000/api/v1')('/uploads/a.jpg')).toBe('http://192.168.1.50:3000/uploads/a.jpg')
  })

  it('leaves absolute and local-file URLs alone', () => {
    expect(resolve('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg')
    expect(resolve('file:///tmp/a.jpg')).toBe('file:///tmp/a.jpg')
  })
})

describe('discountPercent', () => {
  it('rounds the discount when the before price is higher', () => {
    expect(discountPercent('75', '100')).toBe(25)
    expect(discountPercent(9.99, '14.99')).toBe(33)
  })

  it.each([
    ['no before price', '10', null],
    ['a before price that is not higher', '10', '10'],
    ['a before price below the price', '10', '8'],
    ['a zero before price', '0', '0'],
  ])('is null for %s', (_label, price, compareAt) => {
    expect(discountPercent(price, compareAt)).toBeNull()
  })
})

describe('delivery address', () => {
  it('requires a street and a city, like the web checkout', () => {
    expect(deliveryAddressError({})).toBe('Ingresá la calle y el número')
    expect(deliveryAddressError({ line1: ' 12 ', city: 'Miami' })).toBe('Ingresá la calle y el número')
    expect(deliveryAddressError({ line1: 'Calle 8 #123', city: ' ' })).toBe('Ingresá la ciudad')
    expect(deliveryAddressError({ line1: 'Calle 8 #123', city: 'Miami' })).toBeNull()
  })

  it('sends only the fields that were filled in, trimmed', () => {
    expect(cleanShippingAddress({ line1: ' Calle 8 #123 ', line2: '  ', city: 'Miami', notes: '' })).toEqual({
      line1: 'Calle 8 #123',
      city: 'Miami',
    })
  })
})
