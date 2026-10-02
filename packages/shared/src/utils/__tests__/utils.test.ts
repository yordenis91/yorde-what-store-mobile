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
  ])('reads %j as the slug %j', (input, slug) => {
    expect(storeSlugSchema.parse(input)).toBe(slug)
  })

  it('rejects an empty input', () => {
    expect(storeSlugSchema.safeParse('').success).toBe(false)
  })
})

describe('formatMoney', () => {
  const before = { currencySymbol: '$', currencySymbolPosition: 'before' }
  const after = { currencySymbol: '€', currencySymbolPosition: 'after' }

  it('places the symbol where the tenant configured it', () => {
    expect(formatMoney('12.5', before)).toBe('$12.50')
    expect(formatMoney('12.5', after)).toBe('12.50€')
  })

  it('accepts numbers as well as decimal strings', () => {
    expect(formatMoney(3, before)).toBe('$3.00')
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
