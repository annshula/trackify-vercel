import type { ProductPdpContent } from "./types";

/**
 * 4-in-1 Essential Smart EDC & Travel Kit.
 *
 * Every factual claim comes from the product description in Shopify. The kit is
 * a bundle: ultra-slim Bluetooth smart card tracker, compact smart tag finder,
 * forged carbon fiber key organizer, and a stainless-steel multifunctional
 * wallet card (bottle opener, edge ruler, wrench slots, elastic cash strap).
 *
 * Deliberately absent: tracking-network brand, battery life, range, app name,
 * weights and dimensions (none are stated). The product has a single photo, so
 * no section uses images.
 */

export const content: ProductPdpContent = {
  handle: "essential-travel-kit",
  subtitle:
    "Two trackers, a key organizer and a multitool card — everything for a lighter, safer carry.",
  ctaHeadline: "Ready to carry less and lose nothing?",
  perks: [
    "4 essentials in one kit",
    "Bluetooth tracker card and key tag",
    "Carbon fiber key organizer",
    "Stainless-steel multitool wallet card",
  ],

  benefits: [
    { icon: "travel", label: "Track wallet and keys", body: "Connect your wallet and keys to smart tracking networks for instant location pinpointing." },
    { icon: "check", label: "Everyday utility", body: "A built-in multitool handles quick repairs, bottle opening and measuring." },
    { icon: "stone", label: "Durable build", body: "Space-grade aluminum, carbon fiber finish and tactical steel." },
    { icon: "feather", label: "No pocket bulk", body: "A minimalist design that fits comfortably in front pockets." },
  ],

  story: [
    {
      icon: "check",
      label: "Four small things to keep track of",
      body: "A wallet that vanishes, keys that jangle, a trip where nothing is where you left it — and no tool when you need one.",
    },
    {
      icon: "sparkle",
      label: "Meet the Essential Travel Kit.",
      body: "A compact bundle that combines modern tracking tech with tactical utility, designed for commuters, outdoor enthusiasts and frequent flyers: a card tracker for the wallet, a tag finder for the keys, a key organizer and a multitool card.",
    },
  ],

  featureHighlights: [
    {
      icon: "travel",
      label: "Ultra-slim smart card tracker",
      body: "A credit-card-sized Bluetooth card that slides into any wallet slot or passport pouch for seamless global tracking.",
    },
    {
      icon: "check",
      label: "Compact smart tag finder",
      body: "A lightweight Bluetooth key tag that clips onto keys, luggage or bag zippers for quick location alerts.",
    },
    {
      icon: "stone",
      label: "Forged carbon fiber key organizer",
      body: "A compact fold-out holder that secures multiple keys, eliminating pocket bulge and key noise.",
    },
    {
      icon: "ruler",
      label: "Multifunctional tactical wallet card",
      body: "A stainless-steel survival tool the size of a credit card, with a bottle opener, edge ruler, wrench slots and an elastic cash strap.",
    },
  ],

  howItWorks: [
    { icon: "package", label: "Place the trackers", body: "Slide the card into your wallet and clip the tag to your keys or bag." },
    { icon: "travel", label: "Connect", body: "Connect them to smart tracking networks for location pinpointing." },
    { icon: "check", label: "Carry on", body: "Keys folded into the organizer, the multitool card in your wallet slot." },
  ],

  useCases: [
    { icon: "ship", label: "Daily commute", body: "Keys quiet and organized, wallet trackable." },
    { icon: "travel", label: "Frequent flying", body: "Wallet and passport pouch trackable on the move." },
    { icon: "sun", label: "Outdoors", body: "A multitool card with a bottle opener and wrench slots." },
    { icon: "gift", label: "A bundled gift", body: "Four useful essentials in one kit." },
  ],

  whatsIncluded: [
    { icon: "travel", label: "Ultra-slim smart card tracker", body: "Credit-card-sized Bluetooth card for your wallet or passport pouch." },
    { icon: "check", label: "Compact smart tag finder", body: "Bluetooth key tag for keys, luggage or bag zippers." },
    { icon: "stone", label: "Forged carbon fiber key organizer", body: "Compact fold-out holder for multiple keys." },
    { icon: "ruler", label: "Multifunctional tactical wallet card", body: "Stainless steel, with bottle opener, ruler, wrench slots and cash strap." },
  ],

  specs: [
    { label: "Kit contents", value: "4 pieces", description: "Card tracker · tag finder · key organizer · multitool card" },
    { label: "Trackers", value: "Bluetooth smart card + smart tag", description: "Connect to smart tracking networks" },
    { label: "Key organizer", value: "Forged carbon fiber, fold-out" },
    { label: "Multitool card", value: "Stainless steel", description: "Bottle opener, edge ruler, wrench slots, elastic cash strap" },
    { label: "Materials", value: "Space-grade aluminum, carbon fiber finish, tactical steel" },
    { label: "Carry", value: "Front-pocket friendly, minimalist design" },
  ],

  faq: [
    {
      question: "What's in the kit?",
      answer: "Four pieces: an ultra-slim smart card tracker, a compact smart tag finder, a forged carbon fiber key organizer and a multifunctional stainless-steel wallet card.",
    },
    {
      question: "Where do the trackers go?",
      answer: "The card slides into a wallet slot or passport pouch. The tag clips onto keys, luggage or bag zippers.",
    },
    {
      question: "What does the multitool card do?",
      answer: "It has a bottle opener, an edge ruler, wrench slots and an elastic cash strap, in a credit-card size.",
    },
    {
      question: "How long does delivery take?",
      answer: "Shipping is free, and orders arrive in 5–11 days. Every order gets a tracking link once the carrier scans it.",
    },
  ],
};
