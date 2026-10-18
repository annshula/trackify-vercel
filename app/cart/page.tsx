import type { Metadata } from 'next';
import { productRepository } from '@/lib/catalog';
import { shopRepository } from '@/lib/catalog/shop';
import { cartUpsellCandidates } from '@/lib/cart/upsell';
import { getPaymentMethods } from '@/lib/shopify/payments';
import { pdpFontVariables } from '@/lib/pdp/fonts';
import { isFreeShipping } from '@/lib/pdp/shipping';
import { noIndex } from '@/lib/seo/metadata';
import { cn } from '@/lib/utils/cn';

import { CartPageClient } from '@/components/cart/cart-page-client';

export const metadata: Metadata = {
  title: 'Your bag',
  robots: noIndex,
};

/** Full-page bag. The cart itself is per-visitor and loads on the client from the cart provider. */
export default async function CartPage() {
  const [products, payments, pdp] = await Promise.all([
    productRepository.getAllProducts(),
    getPaymentMethods(),
    shopRepository.getPdpContent(),
  ]);

  return (
    <div className={cn('pdp-theme', pdpFontVariables)}>
      <div className="container-page max-w-2xl pt-10 pb-24">
        <h1 className="text-center font-serif text-display font-light lg:text-left">Your bag</h1>
        <CartPageClient
          payments={payments}
          upsells={cartUpsellCandidates(products)}
          delivery={pdp.shipping.deliveryEstimate}
          freeShipping={isFreeShipping(pdp.shipping.costNote)}
        />
      </div>
    </div>
  );
}
