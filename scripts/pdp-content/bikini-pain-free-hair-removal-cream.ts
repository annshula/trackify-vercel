import type { ProductPdpContent } from "./types";

/**
 * PHOFAY Cloud Sense hair removal mousse ("Bikini Pain-Free Hair Removal
 * Cream" in Shopify).
 *
 * Sources for every factual claim (nothing here is invented):
 *  - CJ product CJPF2536027 (supplier PHOFAY): spray depilatory cream,
 *    pressure can, Style × Quantity variants.
 *  - Packaging / supplier infographics on the product's own media:
 *    140ML / 4.73 FL.OZ can; Smooth cream tube 100ML / 3.5 FL.OZ; Orange
 *    Spring Cologne scent; "Hypoallergenic, no additives, non-irritating";
 *    herbal extracts (ginseng, portulaca oleracea, aloe barbadensis leaf
 *    water, glycerin) + hyaluronic acid; 4-step use with the provided scraper
 *    and a 5–10 minute wait; the six-point benefits panel; the brand's
 *    "OUR vs OTHER" comparison; before/after on back, chest, armpit, leg, arm;
 *    the brand's offer of FDA / CPNP / SCPN / MSDS certificates.
 *
 * Seen but deliberately not repeated (unverifiable marketing numbers): "3823
 * experiments", "170K+", "98.6% fan loyalty", "PH11", "penetrates 2mm".
 */

const IMG = {
  heroBottle: "gid://shopify/MediaImage/46203185103075",
  bottleSerum: "gid://shopify/MediaImage/46203185135843",
  beforeAfterGrid: "gid://shopify/MediaImage/46203185168611",
  certificates: "gid://shopify/MediaImage/46203372142819",
  silkySkin: "gid://shopify/MediaImage/46203185332451",
  sprayAndCream: "gid://shopify/MediaImage/46203185201379",
  instructions: "gid://shopify/MediaImage/46203185234147",
  mechanism: "gid://shopify/MediaImage/46203372568803",
  herbalExtracts: "gid://shopify/MediaImage/46203185299683",
  ourVsOther: "gid://shopify/MediaImage/46203185365219",
  howToUse: "gid://shopify/MediaImage/46203372470499",
  consumerFeedback: "gid://shopify/MediaImage/46203372536035",
  friends: "gid://shopify/MediaImage/46203372503267",
  benefitsPanel: "gid://shopify/MediaImage/46203372437731",
  labResults: "gid://shopify/MediaImage/46203372830947",
  realPhoto: "gid://shopify/MediaImage/46203185266915",
};

export const content: ProductPdpContent = {
  handle: "bikini-pain-free-hair-removal-cream",
  subtitle: "A gentle spray mousse that removes hair in 5–10 minutes — no razor, no wax.",
  ctaHeadline: "Ready for smooth, pain-free skin?",
  // Set by the merchant for this product (2026-09-26).
  deliveryEstimate: "3–8 days",

  perks: [
    "Hydrates skin for up to 24hrs",
    "Suitable for sensitive skin",
    "Removes short, stubborn hair",
    "Minimizes ingrown hair",
    "Long lasting smoothness",
    "35% less chemical ingredients",
  ],

  benefits: [
    { icon: "feather", label: "Pain-free", body: "No blade, no pulling — spray, wait, wipe away." },
    { icon: "shield", label: "Sensitive-skin safe", body: "Hypoallergenic, no additives, non-irritating." },
    { icon: "droplet", label: "24hr hydration", body: "Aloe and hyaluronic acid keep skin soft after." },
    { icon: "sparkle", label: "Long-lasting smooth", body: "Works at the root, not just the surface." },
  ],

  story: [
    {
      icon: "feather",
      label: "Razors nick. Wax pulls.",
      body: "Shaving leaves bumps and ingrown hairs; waxing hurts — especially on sensitive skin.",
    },
    {
      icon: "sparkle",
      label: "A gentler way to go smooth",
      body: "Spray the mousse, wait 5–10 minutes, and wipe hair away with the scraper. No blade, no strips.",
      image: IMG.silkySkin,
    },
  ],

  featureHighlights: [
    {
      icon: "shield",
      label: "Made for sensitive skin",
      body: "Hypoallergenic, additive-free and non-irritating per the packaging. Patch test a small area 24 hours before first use.",
      image: IMG.heroBottle,
    },
    {
      icon: "droplet",
      label: "Herbal extracts, not harsh chemicals",
      body: "Ginseng extract, portulaca oleracea extract, aloe leaf water and glycerin, with hyaluronic acid — 35% less chemical ingredients.",
      image: IMG.herbalExtracts,
    },
    {
      icon: "sparkle",
      label: "Works at the root",
      body: "The formula softens hair down at the root so it wipes away cleanly, instead of cutting it off at the surface.",
      image: IMG.mechanism,
    },
    {
      icon: "check",
      label: "Real results, head to toe",
      body: "Before-and-after on back, chest, underarms, legs and arms — one formula for the whole body.",
      image: IMG.consumerFeedback,
    },
    {
      icon: "package",
      label: "Spray mousse or cream",
      body: "The Cloud Sense spray mousse (140ML), paired with a serum or the Smooth cream tube (100ML) depending on the style you pick.",
      image: IMG.sprayAndCream,
    },
  ],

  howItWorks: [
    { icon: "clean", label: "Clean & dry", body: "Start on clean, dry skin. Patch test first if it's your first time.", image: IMG.instructions },
    { icon: "droplet", label: "Apply evenly", body: "Spray an even layer over the area you want smooth." },
    { icon: "moon", label: "Wait 5–10 minutes", body: "Let the mousse soften the hair at the root." },
    { icon: "hand", label: "Scrape & rinse", body: "Wipe hair away with the provided scraper, then rinse with water." },
  ],

  useCases: [
    { icon: "fit", label: "Legs & arms", body: "Large areas done in one go." },
    { icon: "hand", label: "Underarms", body: "Smooth without razor burn." },
    { icon: "gym", label: "Back & chest", body: "Shown in the brand's before-and-after." },
    { icon: "sparkle", label: "Bikini line", body: "Gentle formula for sensitive areas — follow the packaging directions." },
  ],

  whatsIncluded: [
    { icon: "package", label: "Cloud Sense hair removal mousse", body: "140ML / 4.73 FL.OZ spray can, per pack." },
    { icon: "hand", label: "Scraper", body: "For wiping the mousse and hair away." },
    { icon: "gift", label: "Serum or Smooth cream", body: "Included with the Spray & Serum and Spray & Cream styles." },
  ],

  specs: [
    { label: "Brand", value: "PHOFAY Cloud Sense" },
    { label: "Format", value: "Spray mousse, 140ML / 4.73 FL.OZ" },
    { label: "Cream (Spray & Cream style)", value: "Smooth cream tube, 100ML / 3.5 FL.OZ" },
    { label: "Key ingredients", value: "Ginseng, portulaca oleracea, aloe leaf water, glycerin, hyaluronic acid" },
    { label: "Scent", value: "Orange Spring Cologne" },
    { label: "Skin type", value: "Sensitive skin — hypoallergenic, no additives" },
    { label: "Time on skin", value: "5–10 minutes" },
    { label: "Suitable for", value: "Men & women" },
  ],

  comparison: [
    { feature: "Pain", us: "Painless — no blade, no pulling", others: "Wax pulls hair; razors nick" },
    { feature: "Skin reaction", us: "Gentle, non-irritating, made for sensitive skin", others: "Prone to redness, swelling and folliculitis" },
    { feature: "Regrowth", us: "Removed at the root", others: "Cut at the surface — regrowth feels thicker and harder" },
    { feature: "Ingredients", us: "Aloe, portulaca oleracea, hyaluronic acid", others: "Artificial synthetic chemicals" },
    { feature: "Where you can use it", us: "All over the body", others: "Limited — hard-to-reach areas are difficult" },
  ],

  faq: [
    { question: "Is it safe for sensitive skin?", answer: "It's labelled hypoallergenic, additive-free and non-irritating, but every skin is different. Patch test a small area 24 hours before your first full use." },
    { question: "How long do I leave it on?", answer: "5 to 10 minutes, per the instructions. Don't leave it on longer than directed." },
    { question: "How do I remove it?", answer: "Wipe the mousse and hair away with the provided scraper, then rinse the skin with water." },
    { question: "Where can I use it?", answer: "The brand shows results on the back, chest, underarms, legs and arms. Follow the packaging directions for sensitive areas, and don't use it on your face." },
    { question: "What's the difference between the styles?", answer: "Spray is the mousse on its own. Spray & Serum adds a serum, and Spray & Cream adds the Smooth hair removal cream tube (100ML)." },
    { question: "What if it stings?", answer: "Rinse the area straight away with cool water and stop using it. If irritation continues, see a doctor." },
    { question: "Does it have a scent?", answer: "Yes — a light Orange Spring Cologne scent." },
  ],

  mediaAlt: {
    [IMG.heroBottle]: "PHOFAY Cloud Sense hair removal mousse with aloe and ginseng",
    [IMG.bottleSerum]: "Cloud Sense mousse beside the bikini line brightening serum",
    [IMG.beforeAfterGrid]: "Before and after hair removal on armpit, leg, back, arm and chest",
    [IMG.certificates]: "PHOFAY certificate card: FDA, CPNP, SCPN, MSDS",
    [IMG.silkySkin]: "Couple with smooth, hair-free skin",
    [IMG.sprayAndCream]: "Smooth hair removal cream tube and Cloud Sense spray mousse",
    [IMG.instructions]: "Four-step instructions: clean, apply, wait 5 to 10 minutes, scrape and rinse",
    [IMG.mechanism]: "Diagram of the mousse softening hair at the root",
    [IMG.herbalExtracts]: "Herbal extracts: ginseng, portulaca oleracea, aloe leaf water, glycerin",
    [IMG.ourVsOther]: "Cloud Sense compared with other hair removal creams",
    [IMG.howToUse]: "How to use the hair removal mousse in four steps",
    [IMG.consumerFeedback]: "Customer before and after on back, chest, armpit, leg and arm",
    [IMG.friends]: "Friends with Cloud Sense gift bags",
    [IMG.benefitsPanel]: "Six benefits: hydrates 24hrs, sensitive skin, stubborn hair, ingrown hair, smoothness, fewer chemicals",
    [IMG.labResults]: "PHOFAY lab testing overview",
    [IMG.realPhoto]: "Cloud Sense mousse can next to its box",
  },
};
