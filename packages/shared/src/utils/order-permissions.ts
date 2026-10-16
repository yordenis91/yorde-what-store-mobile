import type { Order, OrderStatus } from '../types/api'

type OrderPaymentInfo = Pick<Order, 'paymentStatus' | 'fulfillmentMethod'>

/** A card order that has been paid: cancelling it refunds it through the gateway. */
export function isPaidCardOrder(order: OrderPaymentInfo): boolean {
  return (
    order.paymentStatus === 'PAID' && (order.fulfillmentMethod === 'STRIPE' || order.fulfillmentMethod === 'MERCADOPAGO')
  )
}

/**
 * Whether a collaborator (STAFF) may not move this order to `status`: marking it refunded, or cancelling a
 * paid card order, returns money through the owner's gateway credentials and is OWNER-only on the api.
 */
export function needsOwnerToSet(status: OrderStatus, order: OrderPaymentInfo): boolean {
  return status === 'REFUNDED' || (status === 'CANCELLED' && isPaidCardOrder(order))
}

/** The "this can't be undone" prompt shown before a terminal status is applied; undefined for an ordinary change. */
export function terminalStatusMessage(status: OrderStatus, order: OrderPaymentInfo): string | undefined {
  if (status === 'REFUNDED') {
    return 'El pedido se marcará como reembolsado. Si se pagó con tarjeta, el pago se reembolsa a través de la pasarela. No se puede deshacer.'
  }
  if (status === 'CANCELLED') {
    return isPaidCardOrder(order)
      ? 'El pedido se cancelará, se liberará su stock y el pago con tarjeta se reembolsará a través de la pasarela. No se puede deshacer.'
      : 'El pedido se cancelará y se liberará su stock. No se puede deshacer.'
  }
  return undefined
}
