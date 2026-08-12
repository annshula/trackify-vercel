/**
 * Static storefront pages.
 *
 * Shopify Pages live in the Online Store channel, which a headless storefront
 * does not consume, and the Storefront API's `pages` query requires the
 * `unauthenticated_read_content` scope that this app deliberately does not
 * request.
 *
 * These are therefore genuine, editable site content — not fabricated policy.
 * Anything a merchant must customise is marked clearly so it is never shipped
 * as if it were legal text this project wrote for them.
 */

export type StaticPage = {
  handle: string;
  title: string;
  description: string;
  /** Marks pages a merchant must review before going live. */
  requiresMerchantReview?: boolean;
  sections: { heading?: string; body: string[] }[];
};

export const STATIC_PAGES: StaticPage[] = [
  {
    handle: "shipping",
    title: "Shipping",
    description: "How and when your order reaches you.",
    requiresMerchantReview: true,
    sections: [
      {
        body: [
          "Shipping options, rates and delivery estimates are calculated at checkout using the address you enter. You will always see the exact cost and expected timeframe before you pay.",
          "Once your order is dispatched, tracking appears in your account under Orders, and a confirmation email is sent to the address on your order.",
        ],
      },
      {
        heading: "Where we ship",
        body: [
          "The countries and regions we deliver to are set in our store settings. If your country is not offered at checkout, we do not currently ship there.",
        ],
      },
      {
        heading: "Delays",
        body: [
          "Carrier delays are outside our control, but we can help you chase one. Contact us with your order number and we will look into it.",
        ],
      },
    ],
  },
  {
    handle: "returns",
    title: "Returns",
    description: "How to return or exchange an order.",
    requiresMerchantReview: true,
    sections: [
      {
        body: [
          "If something is not right, start a return from your order history. Open the order, then use the contact link to tell us what you would like to do.",
        ],
      },
      {
        heading: "Condition",
        body: [
          "Items should be unworn, unwashed, and returned with any original packaging and tags attached.",
        ],
      },
      {
        heading: "Refunds",
        body: [
          "Refunds are issued to your original payment method once the return is received and checked. Your bank may take a few additional days to show the credit.",
        ],
      },
    ],
  },
  {
    handle: "faq",
    title: "Frequently asked questions",
    description: "Answers to the questions we get most often.",
    sections: [
      {
        heading: "Do I need an account to order?",
        body: [
          "No. You can check out as a guest. An account lets you see order history, follow deliveries, and save addresses for next time.",
        ],
      },
      {
        heading: "Is my payment secure?",
        body: [
          "Yes. Checkout and payment are handled entirely by our payment provider on their own PCI-compliant infrastructure. This site never sees, stores, or processes your card details.",
        ],
      },
      {
        heading: "Can I change my order after placing it?",
        body: [
          "Contact us as soon as possible with your order number. If it has not been dispatched we can usually help.",
        ],
      },
      {
        heading: "How do I use a discount code?",
        body: [
          "Enter it in the discount field on your bag, or at checkout. The code is validated and the discount applied to your total.",
        ],
      },
    ],
  },
  {
    handle: "contact",
    title: "Contact us",
    description: "Get in touch about an order, a return, or anything else.",
    requiresMerchantReview: true,
    sections: [
      {
        body: [
          "We answer every message within one working day. Include your order number if your question is about an order — it lets us help you straight away.",
        ],
      },
    ],
  },
  {
    handle: "privacy",
    title: "Privacy policy",
    description: "What data this storefront handles, and what it does not.",
    requiresMerchantReview: true,
    sections: [
      {
        heading: "What this storefront stores",
        body: [
          "This storefront keeps no customer database. Your account, orders, addresses and payment details are held by our commerce and payments provider, and are read live from your account when you are signed in.",
          "In your browser we store: a cart identifier, your sign-in session (encrypted), your theme choice, your cookie preference, saved items, and recently viewed products.",
        ],
      },
      {
        heading: "Analytics",
        body: [
          "Analytics only run if you accept them. If you decline, no analytics or marketing scripts are loaded at all — they are not merely set to a limited mode. You can change your choice at any time in account settings.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "For a copy of your data or to request deletion, contact us and we will action it with our commerce provider, which is the system of record.",
        ],
      },
    ],
  },
  {
    handle: "terms",
    title: "Terms of service",
    description: "The terms that apply when you shop with us.",
    requiresMerchantReview: true,
    sections: [
      {
        body: [
          "By placing an order you agree to these terms, and to our payment provider’s terms for the checkout and payment portion of your purchase.",
        ],
      },
      {
        heading: "Pricing and availability",
        body: [
          "Prices and availability shown on product pages are synchronised from our commerce system, which is authoritative at checkout — if something changes between browsing and paying, the checkout total is the one that applies.",
        ],
      },
    ],
  },
];

export function getStaticPage(handle: string): StaticPage | null {
  return STATIC_PAGES.find((page) => page.handle === handle) ?? null;
}
