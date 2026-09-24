import type { ShopPdpContent } from "./types";

/**
 * Store-wide PDP content (Shopify shop metafields). Every line is a policy
 * the store actually has — see the Shopify refund policy and lib/content/faq.ts.
 *
 * TODO(merchant): processing time, delivery estimate and ship-to regions are
 * left empty on purpose. The PDP hides each row until a real value is set, in
 * Shopify admin (Settings → Custom data → Shop) or here.
 */
export const shopContent: ShopPdpContent = {
  announcement: "30-day returns on every order",
  shippingProcessingTime: "",
  shippingDeliveryEstimate: "",
  shippingCostNote: "Calculated at checkout — you see the exact cost before you pay",
  shippingRegions: "",
  trustPoints: [
    {
      icon: "returns",
      label: "30-day returns",
      body: "Changed your mind? Request a return within 30 days of delivery — unused and in its original packaging — and we'll send the label.",
    },
    {
      icon: "lock",
      label: "Secure checkout",
      body: "Payment runs through Shopify's encrypted checkout. Your card details never touch our servers.",
    },
    {
      icon: "truck",
      label: "Tracked delivery",
      body: "Every order gets a tracking link as soon as the carrier scans it — also visible under Account → Orders.",
    },
    {
      icon: "support",
      label: "Real support",
      body: "Questions before or after you order? Email support@shoptrackify.com.",
    },
  ],
};
