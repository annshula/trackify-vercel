import type { ProductPdpContent } from "./types";

/**
 * The Nomad Guard: 4-in-1 Smart Travel Essentials Kit.
 *
 * Every factual claim comes from the product description in Shopify: an RFID-
 * blocking pop-up wallet (heavy-duty aluminum, quick-trigger card ejection,
 * holds up to 6 cards, expandable elastic strap), a forged carbon fiber key
 * organizer, an ultra-slim Bluetooth smart card tracker, and a compact smart tag
 * keychain tracker with single-touch pairing and proximity alerts; works with
 * iOS and Android.
 *
 * Deliberately absent: tracking-network brand, battery life, dimensions,
 * weights (not stated). The product has a single photo, so no section uses
 * images.
 */

export const content: ProductPdpContent = {
  handle: "ultimate-travel-bundle",
  subtitle:
    "A shielded pop-up wallet, a key organizer and two trackers — organized and trackable anywhere.",
  ctaHeadline: "Ready to travel lighter and lose nothing?",
  perks: [
    "RFID-blocking pop-up wallet",
    "Carbon fiber key organizer",
    "Smart card tracker and key tag",
    "Works with iOS and Android",
  ],

  benefits: [
    { icon: "shield", label: "Anti-theft protection", body: "An RFID-blocking shield prevents unauthorized wireless scans." },
    { icon: "travel", label: "Global peace of mind", body: "Track your wallet and keys anywhere with smart Bluetooth technology." },
    { icon: "feather", label: "Minimal and lightweight", body: "Carbon fiber motif and aircraft aluminum reduce pocket bulk." },
    { icon: "check", label: "Universal compatibility", body: "Works with iOS and Android devices." },
  ],

  story: [
    {
      icon: "check",
      label: "Cards, cash and keys everywhere",
      body: "On the road your wallet, keys and cards are the things you can least afford to lose — and the hardest to keep organized.",
    },
    {
      icon: "sparkle",
      label: "Meet the Nomad Guard.",
      body: "A high-tech set built for travelers, digital nomads and commuters that keeps your cards, cash and keys organized, lightweight and completely trackable.",
    },
  ],

  featureHighlights: [
    {
      icon: "shield",
      label: "RFID-blocking pop-up smart wallet",
      body: "A heavy-duty aluminum build with quick-trigger card ejection. It holds up to 6 cards securely and protects your identity against electronic pickpocketing and RFID skimming, with an expandable elastic strap for cash or receipts.",
    },
    {
      icon: "stone",
      label: "Forged carbon fiber key organizer",
      body: "Eliminates pocket clutter and key jangling. A sleek, lightweight, durable design holds multiple keys silently in a compact fold-out frame.",
    },
    {
      icon: "travel",
      label: "Ultra-slim smart card tracker",
      body: "A credit-card-sized Bluetooth tracker that fits directly into your wallet or passport sleeve, compatible with smart tracking networks for effortless global location monitoring.",
    },
    {
      icon: "check",
      label: "Compact smart tag keychain tracker",
      body: "Attach it to your keys, backpack or luggage and track missing items from your smartphone, with single-touch pairing and real-time proximity alerts.",
    },
  ],

  howItWorks: [
    { icon: "package", label: "Load your wallet", body: "Add up to 6 cards and slide in the smart card tracker." },
    { icon: "check", label: "Tag your keys", body: "Fold the keys into the organizer and attach the smart tag." },
    { icon: "travel", label: "Track from your phone", body: "Pair with single-touch pairing and watch for proximity alerts." },
  ],

  useCases: [
    { icon: "travel", label: "Digital nomads", body: "One organized set for cards, cash and keys." },
    { icon: "ship", label: "Daily commuters", body: "Quiet keys, a fast pop-up wallet and trackable essentials." },
    { icon: "shield", label: "Busy places", body: "RFID shielding against unauthorized wireless scans." },
    { icon: "gift", label: "A traveler's gift", body: "Four useful items in one bundle." },
  ],

  whatsIncluded: [
    { icon: "shield", label: "RFID-blocking pop-up smart wallet", body: "Heavy-duty aluminum, holds up to 6 cards, with an expandable elastic strap." },
    { icon: "stone", label: "Forged carbon fiber key organizer", body: "Silent, lightweight fold-out frame for multiple keys." },
    { icon: "travel", label: "Ultra-slim smart card tracker", body: "Credit-card-sized Bluetooth tracker for your wallet or passport sleeve." },
    { icon: "check", label: "Compact smart tag keychain tracker", body: "Single-touch pairing and real-time proximity alerts." },
  ],

  specs: [
    { label: "Bundle contents", value: "4 pieces", description: "Pop-up wallet · key organizer · card tracker · tag tracker" },
    { label: "Wallet", value: "Heavy-duty aluminum, RFID-blocking", description: "Quick-trigger card ejection, holds up to 6 cards" },
    { label: "Cash & receipts", value: "Expandable elastic strap" },
    { label: "Key organizer", value: "Forged carbon fiber, fold-out" },
    { label: "Trackers", value: "Bluetooth smart card + smart tag", description: "Single-touch pairing, real-time proximity alerts" },
    { label: "Compatibility", value: "iOS and Android" },
    { label: "Materials", value: "Space-grade carbon fiber motif and aircraft aluminum" },
  ],

  faq: [
    {
      question: "What's in the bundle?",
      answer: "Four pieces: an RFID-blocking pop-up smart wallet, a forged carbon fiber key organizer, an ultra-slim smart card tracker and a compact smart tag keychain tracker.",
    },
    {
      question: "How many cards does the wallet hold?",
      answer: "Up to 6 cards securely, plus cash or receipts under the expandable elastic strap.",
    },
    {
      question: "Does it work with my phone?",
      answer: "Yes. It works with both iOS and Android devices.",
    },
    {
      question: "How do the trackers pair?",
      answer: "The smart tag uses single-touch pairing, and both trackers are compatible with smart tracking networks for location monitoring from your phone.",
    },
    {
      question: "How long does delivery take?",
      answer: "Shipping is free, and orders arrive in 5–11 days. Every order gets a tracking link once the carrier scans it.",
    },
  ],
};
