/**
 * FAQ content.
 *
 * Grounded in what the catalog actually says, not generic e-commerce
 * boilerplate — the compatibility, materials and battery claims below are
 * pulled from the real product descriptions in data/products.json (e.g. the
 * FindCard Pro is genuinely iOS/Apple Find My exclusive, while the FindIt
 * Smart Tag and the trackers bundled in the kit sets work with both iOS and
 * Android). Store-policy answers (shipping, returns, payment, accounts)
 * describe how this storefront actually behaves, the same way
 * lib/content/pages.ts does — nothing here is invented.
 */

export type FaqEntry = {
  id: string;
  question: string;
  answer: string;
};

export type FaqCategory = {
  id: string;
  title: string;
  description: string;
  items: FaqEntry[];
};

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "trackers",
    title: "Trackers & compatibility",
    description: "Apple Find My, Bluetooth tags, battery life and privacy.",
    items: [
      {
        id: "tracker-ios-android",
        question: "Do your trackers work with Android, or only iPhone?",
        answer:
          "It depends on the tracker. The FindCard Pro is genuinely Apple Find My exclusive — it only works with iPhone, iPad and Mac, not Android. The FindIt Smart Tag and the trackers included in our kit bundles (the Essential Travel Kit, TrackPack Duo and Nomad Guard) connect through their own app and work with both iOS and Android. If Android support matters to you, check the specific product page before you buy — we would rather you know upfront than find out after the order arrives.",
      },
      {
        id: "tracker-battery",
        question: "How long does the battery last, and how do I recharge it?",
        answer:
          "The FindCard Pro is wirelessly rechargeable — a single charge on any standard Qi charger lasts up to about three months of everyday tracking. The FindIt Smart Tag runs on a standard replaceable coin battery instead, so there's no charger to remember. Either way, you'll get a low-battery alert on your phone before it actually dies, not a dead tracker with no warning.",
      },
      {
        id: "tracker-privacy",
        question: "Is my location data private?",
        answer:
          "For the FindCard Pro, yes — it rides on Apple's Find My network, which anonymizes and encrypts location reports end to end, the same privacy model your AirTags or iPhone use. Your location is never visible to us, to Apple, or to anyone except your own signed-in Apple ID.",
      },
      {
        id: "tracker-range",
        question: "What's the range — does it only work near my phone?",
        answer:
          "Not just near your phone. Find My–compatible trackers like the FindCard Pro use the whole network of nearby Apple devices to report a lost item's location, so range is effectively \"anywhere another iPhone passes by,\" not a fixed Bluetooth radius. The FindIt Smart Tag and app-based trackers use direct Bluetooth, so they're strongest within roughly 100–150 ft of your phone and rely on their own app's community-finding feature beyond that.",
      },
    ],
  },
  {
    id: "gear",
    title: "Wallets, keys & EDC gear",
    description: "RFID protection, card capacity, key organizers and locks.",
    items: [
      {
        id: "rfid-wallet",
        question: "Does the ShieldWallet Pro actually block RFID skimming?",
        answer:
          "Yes — the inner chamber is a solid anodized aluminum shell, which physically blocks the 13.56 MHz signal that contactless card skimmers use, the same principle as a Faraday cage. It's not a marketing sticker on fabric; it's the aluminum body itself doing the blocking. It holds 5–7 cards in the aluminum compartment, plus cash or extra cards under the elastic band on the outside.",
      },
      {
        id: "keyfold-fit",
        question: "Will the KeyFold Pro fit my car key fob?",
        answer:
          "It fits most standard house and office keys through its screw-locking frame, and has a bottom D-ring specifically for larger items like car fobs or a smart tracker — they hang off the ring rather than folding inside the frame with your flat keys. If your fob is unusually large or an odd shape, it may sit better clipped to the D-ring than forced into the fold-out slots.",
      },
      {
        id: "padlock-fingerprints",
        question: "How many fingerprints can the TouchLock Pro store, and what happens if the battery dies?",
        answer:
          "It stores multiple registered fingerprints, so you can share access with family or teammates without handing out a physical key. The battery is USB-rechargeable and rated for thousands of unlocks per charge, and the LED indicator warns you before it runs low — the bottom charging port stays protected but accessible, so a top-up before a trip takes a couple of minutes.",
      },
      {
        id: "bladecard-flying",
        question: "Can I bring the BladeCard Elite multitool through airport security?",
        answer:
          "Treat it like any knife: pack it in checked luggage, not your carry-on. It has genuine cutting edges, and TSA (and most international equivalents) prohibit blades of any size in cabin bags — a wallet-card shape doesn't change that rule. It's built for job sites, camping and everyday repairs at home, not for carrying through a security checkpoint.",
      },
    ],
  },
  {
    id: "travel",
    title: "Travel & the Smart Travel Backpack",
    description: "GPS tracking, TSA locks, laptop fit and weatherproofing.",
    items: [
      {
        id: "backpack-gps",
        question: "How does the backpack's GPS tracking work?",
        answer:
          "The Smart Travel Backpack has an integrated GPS tracker built into the bag itself, so you can check its real-time location from your phone — useful for the moment you're not sure if it made it onto the same flight as you, or which luggage carousel it's headed to. It's a separate system from the card/tag trackers, since it's built into the bag rather than something you add yourself.",
      },
      {
        id: "backpack-laptop",
        question: "What size laptop fits, and is it actually TSA-friendly?",
        answer:
          "The padded compartment fits laptops up to 17.3\", and the whole bag unzips flat at the security checkpoint so it lays out the way TSA wants for the X-ray, instead of you wrestling a stuffed bag open. It also ships with an integrated TSA-approved combination lock already built in, not a separate accessory you have to buy.",
      },
      {
        id: "backpack-weather",
        question: "Is the backpack actually waterproof?",
        answer:
          "It's water-resistant, not fully waterproof — the high-density Oxford fabric shell shrugs off a sudden downpour or a spilled drink without soaking through to your laptop, but we wouldn't recommend submerging it or leaving it out in a storm for hours. For day-to-day commuting and travel weather, it holds up well.",
      },
    ],
  },
  {
    id: "orders",
    title: "Orders, shipping & delivery",
    description: "Timelines, tracking, and what happens after checkout.",
    items: [
      {
        id: "shipping-time",
        question: "How long will my order take to arrive?",
        answer:
          "Shipping options and estimated delivery dates are calculated at checkout using the address you enter, so you see the exact cost and timeframe before you pay — not a vague \"5–7 business days\" that applies to everyone regardless of where they live. Once it ships, tracking appears automatically in your account under Orders.",
      },
      {
        id: "change-order",
        question: "Can I change or cancel my order after placing it?",
        answer:
          "Contact us as soon as you can with your order number. If it hasn't been dispatched yet, we can usually adjust the address, swap a color, or cancel it outright — once it's handed to the carrier, we can no longer intercept it, but we can help you start a return the moment it arrives.",
      },
      {
        id: "track-order",
        question: "Where do I track my package?",
        answer:
          "Sign in and open Account → Orders. Every order shows its current status there, and the tracking link appears as soon as the carrier scans it, so you don't need to dig through a separate shipping confirmation email to find it.",
      },
    ],
  },
  {
    id: "returns",
    title: "Returns & warranty",
    description: "What to do if something isn't right.",
    items: [
      {
        id: "start-return",
        question: "How do I start a return?",
        answer:
          "Open the order in Account → Orders and use the contact link there to tell us what's wrong — wrong item, changed your mind, or a fault. We reply within one working day and walk you through the rest; there's no separate returns portal to hunt for.",
      },
      {
        id: "return-condition",
        question: "Does the item need to be unused to return it?",
        answer:
          "Yes — we ask that items come back unworn or unused, with any original packaging, so we can resell or restock them. If something arrived faulty or not as described, that condition requirement doesn't apply; tell us what happened and we'll sort it out.",
      },
      {
        id: "refund-timing",
        question: "How long does a refund take once you receive the return?",
        answer:
          "We issue the refund to your original payment method as soon as the return is received and checked. From there it's your bank's turn — most cards show the credit within a few business days, occasionally a little longer depending on the issuer.",
      },
    ],
  },
  {
    id: "account",
    title: "Payment, checkout & your account",
    description: "Security, guest checkout, and what we do (and don't) store.",
    items: [
      {
        id: "guest-checkout",
        question: "Do I need to create an account to buy something?",
        answer:
          "No — guest checkout is available for every order. Creating an account is entirely optional; it just means your order history, delivery tracking and saved addresses are waiting for you next time, instead of starting from scratch.",
      },
      {
        id: "payment-security",
        question: "Is it safe to enter my card details on this site?",
        answer:
          "Checkout and payment are handled entirely by our PCI-compliant payment provider, on their own secure infrastructure — this storefront never sees, stores, or transmits your card number at any point. Even if you have an account with us, we hold no card data to protect, because we never had it.",
      },
      {
        id: "discount-code",
        question: "How do I use a discount code?",
        answer:
          "Enter it in the discount field on your bag page, or in the promo code box at checkout. It's validated in real time and the discount is applied to your total immediately, before you enter payment details — so you'll always see the reduced price before you commit.",
      },
    ],
  },
];

/** Flat list — used for search/filter and for the FAQPage schema, which Google expects as one array regardless of on-page grouping. */
export const FAQ_ENTRIES: (FaqEntry & { category: string })[] = FAQ_CATEGORIES.flatMap((category) =>
  category.items.map((item) => ({ ...item, category: category.title })),
);
