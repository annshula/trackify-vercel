import type { HomeContent, ShopPdpContent } from "./types";

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

/**
 * Homepage content (shop metafields `custom.home_*`). Sources: the About
 * page's founding idea, the Shopify refund policy, the contact page's
 * "one working day" reply promise, and the catalog itself. Written not to
 * repeat the hero ("Every piece earns its place…").
 */
export const homeContent: HomeContent = {
  featuredCollection: "gid://shopify/Collection/449724088547", // Best Seller
  spotlightProduct: "gid://shopify/Product/10216256372963", // Elecspray Hair Brush
  intro: [
    {
      icon: "sparkle",
      label: "Small things, made more useful.",
      body: "Most of what you carry every day is easy to lose, hard to find at the bottom of a bag, or quietly annoying. We look for products that fix one of those problems well — a card that tells your phone where your wallet is, a lock you open with a fingerprint, a brush that mists as it detangles.",
      image: "gid://shopify/MediaImage/36308474265827",
    },
    { icon: "check", label: "Harder to lose", body: "Bluetooth trackers and slim cards that pair with the phone you already own." },
    { icon: "lock", label: "Safer on the move", body: "Anti-theft bags and keyless fingerprint locks for travel days." },
    { icon: "feather", label: "Less clutter", body: "Slim wallets and key organisers that take up less room in your pocket." },
  ],
  differentiators: [
    { icon: "check", label: "Reviews you can read", body: "Ratings come from people who bought these products — reviews left here, plus ones imported from the supplier's store, labelled as such." },
    { icon: "tag", label: "Prices without surprises", body: "Shipping and taxes are shown at checkout before you pay. Nothing is added afterwards." },
    { icon: "sparkle", label: "Chosen, not stocked", body: "We would rather carry a few products that do their job than thousands that don't." },
    { icon: "support", label: "Someone to ask", body: "Email support@shoptrackify.com — we reply within one working day." },
  ],
  lifestyle: [
    {
      icon: "sparkle",
      label: "Small upgrades. Calmer days.",
      body: "Knowing where your wallet is. Not digging for keys at the door. A bag that's harder to get into on a crowded train. The little things add up.",
      image: "gid://shopify/MediaImage/36475860779235",
    },
  ],
  story: [
    {
      icon: "sparkle",
      label: "It started with one question: where did I put it?",
      body: "Trackify began with a simple idea — take the worry out of losing the things you carry every day. That started with trackers and slim wallets, and grew into travel security and a few well-chosen everyday extras. The test for every product is still the same: does it make an ordinary day a little easier?",
      image: "gid://shopify/MediaImage/36475860713699",
    },
  ],
  faq: [
    { question: "How long does shipping take?", answer: "Delivery options and estimated dates are calculated at checkout from your address, so you see the exact timeframe and cost before you pay." },
    { question: "How do I track my order?", answer: "Every order gets a tracking link as soon as the carrier scans it. If you're signed in, you'll also find it under Account → Orders." },
    { question: "What is your return policy?", answer: "You have 30 days from delivery to request a return. Items need to be unused and in their original packaging. Email support@shoptrackify.com and we'll send you a return label." },
    { question: "How can I contact you?", answer: "Email support@shoptrackify.com — we reply within one working day. If it's about an order, include your order number so we can help straight away." },
    { question: "Do I need an account to order?", answer: "No. Guest checkout works for every order. An account just keeps your order history, tracking and saved addresses in one place." },
  ],
};
