/**
 * The storefront's categories — the source of truth pushed to Shopify by
 * `npm run shopify:organize`.
 *
 * Each category is one Shopify product type plus one automated collection
 * ("product type is equal to <title>"). To put a new product in a category,
 * set its product type in Shopify admin to the category title exactly — the
 * collection picks it up on its own, no manual collection editing.
 *
 * `products` only records how the current catalog was sorted; new products
 * don't need to be listed here.
 */

export type Category = {
  /** Collection handle — the URL: /collections/<handle>. */
  handle: string;
  /** Collection title and the product type value, character for character. */
  title: string;
  description: string;
  /** Product handles assigned to this category on the initial sort. */
  products: string[];
};

export const CATEGORIES: Category[] = [
  {
    handle: "smart-trackers",
    title: "Smart Trackers",
    description:
      "Slim Bluetooth finders for your wallet, keys and bags — so the things you carry stop going missing.",
    products: ["smart-wallet-tracker", "smart-tag", "tracker-wallet-kit"],
  },
  {
    handle: "everyday-carry",
    title: "Wallets & Everyday Carry",
    description:
      "Compact wallets, key holders and pocket tools that keep what you carry every day organised and protected.",
    products: [
      "rfid-enabled-card-holder",
      "smart-key-organizer-compact-key-holder",
      "emergency-tool-edc-credit-card-multitool-100-off",
      "keychain-storage-bag",
      "keychain-storage-bag-nylon",
    ],
  },
  {
    handle: "travel-security",
    title: "Travel & Security",
    description:
      "Anti-theft bags, keyless locks and ready-made kits for travelling lighter and safer.",
    products: [
      "smart-travel-bag",
      "smart-fingerprint-padlock-keyless-bluetooth-lock",
      "essential-travel-kit",
      "ultimate-travel-bundle",
      "smart-travel-security-kit",
    ],
  },
  {
    handle: "beauty-wellness",
    title: "Beauty & Wellness",
    description: "Hair care and self-care tools for small daily routines that feel good.",
    products: ["electric-spray-massage-hair-brush", "acupressure-pen-pro"],
  },
  {
    handle: "stone-jewelry",
    title: "Stone Jewelry",
    description: "Hematite and natural stone bracelets and rings with a clean, understated finish.",
    products: [
      "black-gallstone-bracelet-hematite-jewelry-terahertz",
      "hematite-ring-without-magnetic-surface",
      "fashion-curved-hematite-magnetic-ring",
      "natural-black-tourmaline-and-hematite-single-strand-round-bead-bracelet",
      "hematite-mens-bracelet",
      "square-black-tourmaline-bracelet-mens-elastic-mixed-style-bracelet",
    ],
  },
  {
    handle: "baby-kids",
    title: "Baby & Kids",
    description: "Thoughtful gear that makes the early years a little easier for parents and little ones.",
    products: ["baby-head-protector-backpack"],
  },
  {
    handle: "sports-fitness",
    title: "Sports & Fitness",
    description: "Training gear that lets you practise on your own time, at your own pace.",
    products: ["solo-tennis-trainer-rebounder-nextgen"],
  },
];

/**
 * Collections replaced by the categories above: deleted from Shopify by
 * `npm run shopify:organize`, with old URL → new category redirects recorded
 * so existing links (ads, bookmarks, search results) keep landing somewhere.
 */
export const RETIRED_COLLECTIONS: Record<string, string> = {
  "smart-wallet-trackers": "smart-trackers",
  "smart-tag": "smart-trackers",
  "smart-tracker": "smart-trackers",
  "rfid-card-holders": "everyday-carry",
  "emergency-tool-edc-credit-card-multitool": "everyday-carry",
  "smart-key-organizer-compact-key-holder": "everyday-carry",
  "everyday-essentials": "everyday-carry",
  "smart-travel-bags": "travel-security",
  "fingerprint-electronic-lock": "travel-security",
  "travel-gear": "travel-security",
  "smart-security": "travel-security",
  "sports": "sports-fitness",
  "kids-toddler": "baby-kids",
};

/** Merchandising collections kept alongside the categories, by handle → title. */
export const KEPT_COLLECTIONS: Record<string, string> = {
  "best-seller": "Best Seller",
  "kits-bundle": "Bundles",
};
