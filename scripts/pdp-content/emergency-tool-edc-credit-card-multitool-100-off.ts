import type { ProductPdpContent } from "./types";

/**
 * The BladeCard Elite: Multi-Blade Wallet Tool & Survival Card.
 *
 * Every factual claim comes from the product description in Shopify:
 * heat-treated, corrosion-resistant stainless steel with a matte-black coating;
 * standard credit-card dimensions; dual-blade edge (sharp and blunt), wire-cutter
 * notch, corner flathead screwdriver, can/bottle opener, serrated saw edge,
 * paracord grip wrap, ruler and engraved Morse SOS/HELP reference.
 *
 * Deliberately absent: exact weight, thickness, blade length, steel grade, sheath
 * (none are stated).
 */

const IMG = {
  front: "gid://shopify/MediaImage/36062833213667",
  back: "gid://shopify/MediaImage/36062833180899",
  edge: "gid://shopify/MediaImage/36062833148131",
};

export const content: ProductPdpContent = {
  handle: "emergency-tool-edc-credit-card-multitool-100-off",
  subtitle:
    "A full multitool in the shape of a credit card — it slides into any wallet slot.",
  ctaHeadline: "Ready to carry a toolkit that fits in your wallet?",
  perks: [
    "Credit-card size, wallet-slot fit",
    "Dual-blade edge, saw, wire cutter and opener",
    "Heat-treated stainless steel",
    "Paracord grip, ruler and SOS reference",
  ],

  benefits: [
    { icon: "ruler", label: "Wallet-slot slim", body: "Standard credit-card dimensions — no extra pocket weight." },
    { icon: "gym", label: "Tough stainless steel", body: "Heat-treated, corrosion-resistant, matte-black coated." },
    { icon: "check", label: "Many tools, one card", body: "Blade, saw, wire cutter, screwdriver, opener and ruler on one card." },
    { icon: "support", label: "Ready for emergencies", body: "Paracord wrap and an engraved Morse SOS/HELP reference." },
  ],

  story: [
    {
      icon: "check",
      label: "The right tool is never in your pocket",
      body: "A box needs cutting, a bottle needs opening, a screw has come loose — and the multitool is at home in a drawer.",
    },
    {
      icon: "sparkle",
      label: "Meet the BladeCard Elite.",
      body: "It folds a razor-sharp edge, a blunt scraping edge, a wire-cutter notch, a screwdriver tip, a bottle and can opener and a saw edge into a stainless-steel card that sits in your wallet like any other.",
      image: IMG.front,
    },
  ],

  featureHighlights: [
    {
      icon: "check",
      label: "Dual-blade edge: sharp and blunt",
      body: "A razor-sharp edge for slicing rope and boxes, and a dull, blunt edge made for scraping, prying and safe handling.",
      image: IMG.back,
    },
    {
      icon: "check",
      label: "Saw, wire cutter and opener",
      body: "A multi-tooth serrated edge saws through wood, cordage and tough plastics. A dedicated notch strips and cuts electrical wire, ties and cables, and a reinforced leverage notch pops bottle caps and tin cans.",
      image: IMG.edge,
    },
    {
      icon: "hand",
      label: "Paracord grip that unravels",
      body: "A tactical braided cord wrap gives the card a non-slip, ergonomic handle — and can be unraveled for emergency rope.",
    },
    {
      icon: "ruler",
      label: "Corner screwdriver, ruler and SOS signals",
      body: "A flathead screwdriver tip on the corner handles quick screw adjustments. The marked edge measures, and the engraved Morse code (SOS/HELP) reference is there if you ever need it.",
    },
  ],

  howItWorks: [
    { icon: "package", label: "Slip it in", body: "Keep it in a wallet slot, money clip or pouch like a standard card." },
    { icon: "hand", label: "Pick your edge", body: "Use the sharp edge, blunt edge, saw, notch or opener — whichever the job needs." },
    { icon: "check", label: "Put it back", body: "It goes straight back into your wallet, no case required." },
  ],

  useCases: [
    { icon: "sun", label: "Camping & hiking", body: "A saw, cord and SOS reference in a pocket-sized package." },
    { icon: "ship", label: "DIY repairs", body: "Screwdriver tip, wire cutter notch and an edge for opening boxes." },
    { icon: "travel", label: "Auto kits & urban survival", body: "A must-have utility tool for emergencies, in the shape of a card." },
    { icon: "gift", label: "Everyday carry", body: "A bottle opener and a ruler are handy more often than you'd expect." },
  ],

  whatsIncluded: [
    {
      icon: "package",
      label: "1 × BladeCard Elite multitool card",
      body: "Stainless-steel card with integrated tools and paracord grip wrap.",
    },
  ],

  specs: [
    { label: "Material", value: "Heat-treated stainless steel", description: "Corrosion-resistant, matte-black coated" },
    { label: "Size", value: "Standard credit-card dimensions" },
    { label: "Cutting edges", value: "Razor-sharp edge + blunt edge" },
    { label: "Tools", value: "Wire-cutter notch · flathead screwdriver · bottle/can opener · serrated saw" },
    { label: "Grip", value: "Braided paracord wrap", description: "Can be unraveled for emergency rope" },
    { label: "Markings", value: "Edge ruler · engraved Morse SOS/HELP reference" },
  ],

  faq: [
    {
      question: "Will it fit in my wallet?",
      answer: "Yes. It has standard credit-card dimensions, so it slides into a wallet slot, a money clip or a pouch.",
    },
    {
      question: "What can it cut?",
      answer: "The sharp edge slices rope and boxes, the serrated edge saws wood, cordage and tough plastics, and the notch cuts and strips electrical wire, ties and cables.",
    },
    {
      question: "Why is there a blunt edge as well?",
      answer: "The dull edge is for scraping, prying and safe handling, so you aren't reaching for the sharp one every time.",
    },
    {
      question: "Will it rust?",
      answer: "It is made from corrosion-resistant stainless steel with a matte-black coating, built for rugged outdoor and daily use.",
    },
    {
      question: "How long does delivery take?",
      answer: "Shipping is free, and orders arrive in 5–11 working days. Every order gets a tracking link once the carrier scans it.",
    },
  ],

  mediaAlt: {
    [IMG.front]: "Black stainless-steel credit-card multitool with paracord wrap",
    [IMG.back]: "Back of the credit-card multitool showing ruler and Morse code engraving",
    [IMG.edge]: "Close-up of the multitool's saw teeth and bottle-opener notch",
  },
};
