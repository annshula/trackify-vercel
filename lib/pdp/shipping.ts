/**
 * Whether the store's shipping note (shop metafield `custom.shipping_cost_note`)
 * says shipping is free. "Calculated at checkout" must not count, so the free
 * delivery strip, the bag footer and the PDP only claim it when the merchant
 * wrote it.
 */
export function isFreeShipping(costNote: string | null | undefined): boolean {
  return /\bfree\b/i.test(costNote ?? "");
}
