import "server-only";
import { storefrontRequest } from "@/lib/shopify/storefront";

/**
 * The payment methods the store actually accepts at checkout, straight from
 * Shopify (Settings → Payments), so the PDP and the bag never show a logo
 * checkout would refuse. Wallets lead (Shop Pay, Apple Pay, Google Pay), then
 * cards. Cached for a day and tagged `payments`; on any failure the row is
 * simply left out.
 */

/** `id` is a file name in `public/payments/` — Shopify's own icons (activemerchant/payment_icons, MIT). */
export type PaymentMethod = { id: string; label: string };

const WALLETS: Record<string, PaymentMethod> = {
  SHOPIFY_PAY: { id: "shopify_pay", label: "Shop Pay" },
  APPLE_PAY: { id: "apple_pay", label: "Apple Pay" },
  GOOGLE_PAY: { id: "google_pay", label: "Google Pay" },
};

const CARDS: Record<string, PaymentMethod> = {
  VISA: { id: "visa", label: "Visa" },
  MASTERCARD: { id: "master", label: "Mastercard" },
  AMERICAN_EXPRESS: { id: "american_express", label: "American Express" },
  DISCOVER: { id: "discover", label: "Discover" },
  DINERS_CLUB: { id: "diners_club", label: "Diners Club" },
};

const QUERY = /* GraphQL */ `
  query PaymentSettings {
    shop {
      paymentSettings {
        acceptedCardBrands
        supportedDigitalWallets
      }
    }
  }
`;

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  try {
    const data = await storefrontRequest<{
      shop: {
        paymentSettings: {
          acceptedCardBrands: string[];
          supportedDigitalWallets: string[];
        };
      };
    }>({
      query: QUERY,
      // Not cart state, so unlike the rest of the Storefront traffic it may be cached:
      // payment settings change rarely, and the page must stay statically renderable.
      cache: "force-cache",
      revalidate: 86_400,
      tags: ["payments"],
    });
    const { acceptedCardBrands, supportedDigitalWallets } =
      data.shop.paymentSettings;
    // Ordered by our tables, not Shopify's response; unknown brands have no icon.
    return [
      ...Object.entries(WALLETS).filter(([key]) =>
        supportedDigitalWallets.includes(key),
      ),
      ...Object.entries(CARDS).filter(([key]) =>
        acceptedCardBrands.includes(key),
      ),
    ].map(([, method]) => method);
  } catch (error) {
    console.error("[payments] fetch failed:", (error as Error).message);
    return [];
  }
}
