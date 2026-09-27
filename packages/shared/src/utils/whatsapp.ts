/**
 * Matches `buildWhatsappUrl` in
 * `yorde-what-store-api/src/modules/orders/fulfillment/message-renderer.ts`.
 * The message itself is already rendered server-side (`order.fulfillmentMessage`,
 * from the tenant's own template) — this only builds the `wa.me` deep link,
 * never re-renders the template client-side.
 */
export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  const digitsOnly = phoneNumber.replace(/[^\d]/g, '')
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`
}
