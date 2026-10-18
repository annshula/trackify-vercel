import type { ProductPdpContent } from "./types";

/**
 * Trackify RFID Wallet Quick-Access Pop-Up.
 *
 * Every factual claim comes from the product description in Shopify:
 *  - space-grade, rust-proof anodized aluminum alloy with non-slip exterior panels
 *  - heavy-duty aluminum inner casing acting as a Faraday cage, blocking
 *    13.56 MHz signals (RFID/NFC)
 *  - side slider lever that fans the cards out for single-handed access
 *  - elastic band for bills, receipts or business cards
 *  - dual outer grip slots for daily access cards or IDs
 *  - holds 5–7 cards in the chamber, plus cash and extra cards under the band
 *  - finishes: Copper/Rust Brown and Metallic Slate Gray (the store also sells
 *    further colours — only those two are named in the description)
 *
 * Dimensions (9.7 × 6.2 cm / 3.8 × 2.4 in) come from the product-size infographic
 * among the product photos. Deliberately absent: weight and thickness (not stated).
 */

const IMG = {
  hero: "gid://shopify/MediaImage/36062642340067",
  fan: "gid://shopify/MediaImage/36062642307299",
  silver: "gid://shopify/MediaImage/36062642372835",
  black: "gid://shopify/MediaImage/36348450799843",
  copper: "gid://shopify/MediaImage/36348450996451",
  // Photos and infographics added to the product later.
  terminal: "gid://shopify/MediaImage/46510166376675",
  handPull: "gid://shopify/MediaImage/46510166671587",
  inPocket: "gid://shopify/MediaImage/46510166933731",
  rfid: "gid://shopify/MediaImage/46510166900963",
  trigger: "gid://shopify/MediaImage/46510166802659",
  size: "gid://shopify/MediaImage/46510166966499",
  slim: "gid://shopify/MediaImage/46510167032035",
  capacity: "gid://shopify/MediaImage/46510167261411",
  flatlay: "gid://shopify/MediaImage/46510167294179",
  accessories: "gid://shopify/MediaImage/46510166311139",
};

export const content: ProductPdpContent = {
  handle: "rfid-enabled-card-holder",
  subtitle:
    "One press fans your cards out. Aluminum shielding keeps contactless thieves out.",
  ctaHeadline: "Ready for a slimmer, safer wallet?",
  perks: [
    "One-touch pop-up card access",
    "RFID/NFC-blocking aluminum casing",
    "Holds 5–7 cards plus cash",
    "Slim front-pocket design",
  ],

  benefits: [
    { icon: "hand", label: "Cards in one press", body: "A side slider lever fans your cards out in a neat cascade — single-handed." },
    { icon: "shield", label: "Blocks RFID skimming", body: "The aluminum inner casing acts as a Faraday cage against 13.56 MHz scans." },
    { icon: "feather", label: "Slim, not bulky", body: "Replaces a fat leather wallet with a compact front-pocket design." },
    { icon: "stone", label: "Rust-proof aluminum", body: "Anodized aluminum alloy with non-slip exterior panels." },
  ],

  story: [
    {
      icon: "check",
      label: "A fat wallet, and cards anyone could scan",
      body: "A fat wallet stretches your pocket out of shape, and digging for the right card slows you down at the till — while contactless cards sit open to electronic pickpocketing and RFID skimming.",
    },
    {
      icon: "sparkle",
      label: "Meet the Pop-Up Wallet.",
      body: "A slim aluminum chamber holds your cards behind a shielded casing, and one slide of the side lever fans them out so the one you need is already in your hand. Cash and receipts ride on an elastic band; your daily card sits in an outer grip slot.",
      image: IMG.handPull,
    },
  ],

  featureHighlights: [
    {
      icon: "hand",
      label: "Quick-trigger pop-up access",
      body: "Slide the side lever and your credit cards fan out in a neat cascade. Pick one, push the rest back in — all with a single hand.",
      image: IMG.trigger,
    },
    {
      icon: "shield",
      label: "A protective Faraday cage around your cards",
      body: "The heavy-duty aluminum inner casing blocks 13.56 MHz signals, so unauthorized scans can't read the cards inside — protection against electronic pickpocketing and RFID skimming.",
      image: IMG.rfid,
    },
    {
      icon: "package",
      label: "A flexible band for cash and receipts",
      body: "A high-durability elastic band keeps paper bills, receipts or business cards tightly secured to the wallet frame, so loose paper stays out of your pocket.",
      image: IMG.capacity,
    },
    {
      icon: "check",
      label: "Dual outer grip slots",
      body: "Quick-swipe exterior cutouts hold the access card or ID you use every day, so you can slide it out without opening the main compartment.",
      image: IMG.copper,
    },
    {
      icon: "feather",
      label: "Slim enough for a front pocket",
      body: "A compact, ultra-slim design replaces a fat, bulky leather wallet and reduces pocket bulge and strain.",
      image: IMG.slim,
    },
  ],

  howItWorks: [
    { icon: "package", label: "Load your cards", body: "Slide 5–7 cards into the aluminum chamber." },
    { icon: "hand", label: "Press the lever", body: "Push the side slider and the cards fan out in a cascade." },
    { icon: "check", label: "Grab and go", body: "Take the card you need and slide the rest back in." },
  ],

  useCases: [
    { icon: "ship", label: "At the till", body: "Fan out the cards, tap, and put it away — no digging.", image: IMG.terminal },
    { icon: "travel", label: "Crowded places", body: "Shielded cards in a slim front pocket, instead of a back-pocket wallet." },
    { icon: "check", label: "Daily commute", body: "Keep your transit card or ID in an outer grip slot for a quick swipe.", image: IMG.inPocket },
    { icon: "gift", label: "A practical gift", body: "Choose a finish that suits them from the colours on this page.", image: IMG.flatlay },
  ],

  whatsIncluded: [
    {
      icon: "package",
      label: "1 × RFID Pop-Up Wallet",
      body: "Aluminum chamber with side slider, elastic band and dual outer grip slots, in your chosen colour.",
    },
  ],

  specs: [
    { label: "Material", value: "Anodized aluminum alloy, rust-proof", description: "Space-grade aluminum with non-slip exterior panels", image: IMG.accessories },
    { label: "RFID/NFC protection", value: "Aluminum inner casing (Faraday cage)", description: "Blocks 13.56 MHz signals", image: IMG.rfid },
    { label: "Card access", value: "Side slider lever, one-touch pop-up", image: IMG.trigger },
    { label: "Card capacity", value: "5–7 cards in the aluminum chamber", description: "Extra cards and cash fit under the elastic band", image: IMG.capacity },
    { label: "Dimensions", value: "9.7 × 6.2 cm (3.8 × 2.4 in)", image: IMG.size },
    { label: "Carry style", value: "Ultra-slim, front-pocket", description: "Replaces a bulky leather wallet", image: IMG.slim },
    { label: "Cash & receipts", value: "High-durability elastic band" },
    { label: "Outer storage", value: "Dual outer grip slots", description: "For daily access cards or IDs" },
    { label: "Finishes", value: "Copper/Rust Brown, Metallic Slate Gray", description: "More colours are available on the product page" },
  ],

  faq: [
    {
      question: "Does it really block RFID and NFC?",
      answer: "The aluminum inner casing acts as a Faraday cage and blocks 13.56 MHz signals — the frequency used by contactless cards — so the cards inside can't be read by an unauthorized scan.",
    },
    {
      question: "How many cards does it hold?",
      answer: "Up to 5–7 cards in the aluminum chamber. You can add cash and extra cards under the elastic band.",
    },
    {
      question: "How do I get a card out?",
      answer: "Slide the side lever. The cards fan out in a cascade so you can pick the one you need with one hand.",
    },
    {
      question: "Can I carry cash with it?",
      answer: "Yes. The high-durability elastic band holds paper bills, receipts or business cards against the wallet frame.",
    },
    {
      question: "How long does delivery take?",
      answer: "Shipping is free, and orders arrive in 5–11 days. Every order gets a tracking link once the carrier scans it.",
    },
  ],

  mediaAlt: {
    [IMG.hero]: "Copper RFID pop-up wallet with cards fanned out of the top",
    [IMG.fan]: "Slate gray RFID pop-up wallet with cards fanned out",
    [IMG.silver]: "Silver aluminum RFID pop-up wallet with elastic cash band",
    [IMG.black]: "Black RFID pop-up wallet with red cards fanned out",
    [IMG.copper]: "Copper RFID pop-up wallet showing the outer grip cutouts",
    [IMG.terminal]: "RFID blocking comparison: the wallet held near a payment terminal",
    [IMG.handPull]: "Hand sliding cards out of the pop-up wallet",
    [IMG.inPocket]: "Slim wallet being slipped into a front pocket",
    [IMG.rfid]: "RFID blocking protection infographic with a payment terminal",
    [IMG.trigger]: "One-click pop-up infographic: press the side trigger to fan the cards out",
    [IMG.size]: "Product size infographic: 9.7 by 6.2 centimetres",
    [IMG.slim]: "Slim and pocket-friendly infographic comparing the wallet with a bulky leather wallet",
    [IMG.capacity]: "Capacity infographic: card chamber, backplate compartment and cash band",
    [IMG.flatlay]: "Black pop-up wallet unpacked beside its gift box",
    [IMG.accessories]: "Black pop-up wallet shown from the front and side",
  },
};
