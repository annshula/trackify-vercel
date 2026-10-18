"use client";

import { BagContents } from "./bag-contents";
import type { CartUpsell } from "@/lib/cart/upsell";
import type { PaymentMethod } from "@/lib/shopify/payments";

/**
 * Full-page bag: the same contents as the drawer, in a soft panel. The cart
 * itself comes from the shared cart provider (fetched once per session), so
 * the bag shows a loading line until that first response lands.
 */
export function CartPageClient({
  payments,
  upsells,
  delivery,
  freeShipping,
}: {
  payments: PaymentMethod[];
  upsells: CartUpsell[];
  delivery: string | null;
  freeShipping: boolean;
}) {
  return (
    <div className="mt-8 flex min-h-80 flex-col rounded-media bg-cream p-2">
      <BagContents payments={payments} upsells={upsells} delivery={delivery}
            freeShipping={freeShipping} />
    </div>
  );
}
