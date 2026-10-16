import { isPaidCardOrder, needsOwnerToSet, terminalStatusMessage } from '../order-permissions'

const paidStripe = { paymentStatus: 'PAID', fulfillmentMethod: 'STRIPE' } as const
const unpaidStripe = { paymentStatus: 'PENDING', fulfillmentMethod: 'STRIPE' } as const
const paidZelle = { paymentStatus: 'PAID', fulfillmentMethod: 'ZELLE' } as const

describe('order permissions', () => {
  it('treats only a paid Stripe/MercadoPago order as a paid card order', () => {
    expect(isPaidCardOrder(paidStripe)).toBe(true)
    expect(isPaidCardOrder({ paymentStatus: 'PAID', fulfillmentMethod: 'MERCADOPAGO' })).toBe(true)
    expect(isPaidCardOrder(unpaidStripe)).toBe(false)
    expect(isPaidCardOrder(paidZelle)).toBe(false)
  })

  it('reserves refunds, and cancelling a paid card order, for the owner', () => {
    expect(needsOwnerToSet('REFUNDED', unpaidStripe)).toBe(true)
    expect(needsOwnerToSet('CANCELLED', paidStripe)).toBe(true)
  })

  it('lets a collaborator cancel an order that moved no money, and make ordinary changes', () => {
    expect(needsOwnerToSet('CANCELLED', unpaidStripe)).toBe(false)
    expect(needsOwnerToSet('CANCELLED', paidZelle)).toBe(false)
    expect(needsOwnerToSet('PROCESSING', paidStripe)).toBe(false)
  })

  it('warns that cancelling a paid card order refunds it, and says nothing for an ordinary change', () => {
    expect(terminalStatusMessage('CANCELLED', paidStripe)).toMatch(/reembolsará/)
    expect(terminalStatusMessage('CANCELLED', unpaidStripe)).not.toMatch(/reembols/)
    expect(terminalStatusMessage('REFUNDED', paidStripe)).toMatch(/reembolsado/)
    expect(terminalStatusMessage('PROCESSING', paidStripe)).toBeUndefined()
  })
})
