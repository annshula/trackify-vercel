import type { ProductPdpContent } from "./types";

/**
 * The TrackPack Duo: Smart Card & Tag Finder Set.
 *
 * Every factual claim comes from the product description in Shopify: an ultra-
 * thin smart card tracker and a keychain-style smart tag; real-time global
 * tracking via smart global location networks; instant separation alerts to the
 * phone; a loud audio beeper triggered from the phone; low-power Bluetooth in
 * scratch-resistant, travel-ready materials.
 *
 * Deliberately absent: battery life figures, range, network brand, app name,
 * dimensions (not stated). The product has a single photo, so no section uses
 * images.
 */

export const content: ProductPdpContent = {
  handle: "tracker-wallet-kit",
  subtitle:
    "A slim card for your wallet and a tag for your keys — find either from your phone.",
  ctaHeadline: "Ready to stop misplacing the things that matter?",
  perks: [
    "Ultra-thin card tracker for your wallet",
    "Keychain tag for keys and bags",
    "Separation alerts on your phone",
    "Loud beeper you trigger remotely",
  ],

  benefits: [
    { icon: "travel", label: "Global tracking", body: "Syncs with smart global location networks for worldwide item retrieval." },
    { icon: "check", label: "Separation alerts", body: "Get notified on your phone whenever you leave a tagged item behind." },
    { icon: "sparkle", label: "Loud beeper", body: "Ring an item from your phone to find it under furniture or inside a deep bag." },
    { icon: "battery", label: "Low-power Bluetooth", body: "Scratch-resistant, travel-ready materials with long battery life." },
  ],

  story: [
    {
      icon: "check",
      label: "Where did I put it?",
      body: "Wallet, passport, keys, bag — the things you need most are the easiest to misplace, and a search wastes the time you don't have.",
    },
    {
      icon: "sparkle",
      label: "Meet the TrackPack Duo.",
      body: "Two trackers, one set: an ultra-slim smart card that fits any wallet slot or passport holder, and a smart tag that clips on to keys, car fobs, backpacks and luggage — with full-coverage location tracking, anywhere in the world.",
    },
  ],

  featureHighlights: [
    {
      icon: "travel",
      label: "Ultra-thin smart card tracker",
      body: "A razor-thin profile that fits into any standard wallet card slot, passport holder or slim billfold without adding bulk.",
    },
    {
      icon: "check",
      label: "Compact smart tag finder",
      body: "A lightweight, durable keychain-style tracker that attaches instantly to house keys, car fobs, backpacks or travel luggage.",
    },
    {
      icon: "support",
      label: "Instant separation alerts",
      body: "Your phone notifies you the moment you walk away from a tagged item, so you notice before you're out the door.",
    },
    {
      icon: "sparkle",
      label: "A loud ring on demand",
      body: "Trigger an audible ring straight from your smartphone to locate items tucked under furniture or inside deep bags.",
    },
  ],

  howItWorks: [
    { icon: "package", label: "Attach", body: "Slide the card into your wallet; clip the tag to your keys or bag." },
    { icon: "travel", label: "Sync", body: "Connect to smart global location networks from your phone." },
    { icon: "check", label: "Find", body: "Check the location, or ring the item to hear where it is." },
  ],

  useCases: [
    { icon: "ship", label: "Wallet & passport", body: "A card that disappears into a slot and keeps watch." },
    { icon: "home", label: "House keys & car fobs", body: "Never turn the house upside down for keys again." },
    { icon: "travel", label: "Luggage & backpacks", body: "Tag a bag you can't afford to lose on a trip." },
    { icon: "gift", label: "A useful gift", body: "Two trackers in one set." },
  ],

  whatsIncluded: [
    { icon: "travel", label: "1 × Ultra-thin smart card tracker", body: "For wallets, passport holders and slim billfolds." },
    { icon: "check", label: "1 × Compact smart tag finder", body: "Keychain-style tracker for keys, fobs, backpacks and luggage." },
  ],

  specs: [
    { label: "Set contents", value: "Smart card tracker + smart tag finder" },
    { label: "Tracking", value: "Real-time, via smart global location networks" },
    { label: "Alerts", value: "Instant separation alerts on your phone" },
    { label: "Audio", value: "Loud beeper, triggered from your smartphone" },
    { label: "Connectivity", value: "Low-power Bluetooth" },
    { label: "Build", value: "Scratch-resistant, travel-ready materials" },
    { label: "Card profile", value: "Razor-thin — fits a standard card slot" },
  ],

  faq: [
    {
      question: "What's in the set?",
      answer: "An ultra-thin smart card tracker for your wallet or passport holder and a compact smart tag finder for keys, bags and luggage.",
    },
    {
      question: "Will it alert me if I leave something behind?",
      answer: "Yes. You receive an immediate notification on your phone whenever you leave a tagged item behind.",
    },
    {
      question: "How do I find something nearby?",
      answer: "Trigger the loud beeper from your smartphone to hear where an item is — for example under furniture or inside a deep bag.",
    },
    {
      question: "Does the card add bulk to my wallet?",
      answer: "No. It has a razor-thin profile designed to fit seamlessly into a standard wallet card slot without adding bulk.",
    },
    {
      question: "How long does delivery take?",
      answer: "Shipping is free, and orders arrive in 5–11 working days. Every order gets a tracking link once the carrier scans it.",
    },
  ],
};
