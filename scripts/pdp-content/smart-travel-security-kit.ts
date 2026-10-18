import type { ProductPdpContent } from "./types";

/**
 * Biometric Tech Travel Bundle: Modern Backpack, Carbon Fiber Key Smart Holder
 * & Fingerprint Lock.
 *
 * Every factual claim comes from the product description in Shopify: a Beige
 * anti-theft commuter backpack (concealed zippers, water-resistant materials,
 * dedicated compartments for laptop, tablet and bottle, padded straps,
 * ergonomic back panel); a biometric fingerprint padlock (multiple fingerprints,
 * rechargeable battery, for backpack zippers, lockers or luggage); a forged
 * carbon fiber key organizer (accessories sold separately).
 *
 * Deliberately absent: backpack capacity or laptop size, padlock battery life,
 * fingerprint capacity count, dimensions (not stated). The product has a single
 * photo, so no section uses images.
 */

export const content: ProductPdpContent = {
  handle: "smart-travel-security-kit",
  subtitle:
    "An anti-theft backpack, a fingerprint padlock and a key organizer — secured, organized, keyless.",
  ctaHeadline: "Ready to travel with less worry?",
  perks: [
    "Anti-theft backpack, concealed zippers",
    "Unlock the padlock with your fingerprint",
    "Carbon fiber key organizer",
    "Save more as a kit",
  ],

  benefits: [
    { icon: "shield", label: "Integrated security", body: "A backpack, lock and key organizer designed to work together." },
    { icon: "lock", label: "Keyless access", body: "No keys or combinations to remember — biometrics unlock instantly." },
    { icon: "sparkle", label: "Coordinated style", body: "Every component shares a premium, modern look." },
    { icon: "tag", label: "Great value", body: "Save more when you buy these essentials together as a kit." },
  ],

  story: [
    {
      icon: "check",
      label: "Lost keys, forgotten combinations, open zippers",
      body: "Bags get opened, locks need the right key or number, and a loose key ring makes a mess of your pockets.",
    },
    {
      icon: "sparkle",
      label: "Meet the Smart Security Kit.",
      body: "A minimalist anti-theft backpack with concealed zippers, a padlock that opens with your fingerprint, and a forged carbon fiber key organizer — three things that work together so you spend less time searching and more time moving.",
    },
  ],

  featureHighlights: [
    {
      icon: "travel",
      label: "The Modern Commuter Anti-Theft Backpack (Beige)",
      body: "A minimalist design with concealed zippers and durable water-resistant materials. Multiple dedicated compartments hold your laptop, tablet, water bottle and daily essentials, and padded shoulder straps with an ergonomic back panel keep all-day carry comfortable.",
    },
    {
      icon: "lock",
      label: "The Biometric Fingerprint Smart Padlock",
      body: "Unlocks instantly with your unique fingerprint — no lost keys, no complex combinations. Program multiple fingerprints for family members or trusted companions, and use it on the backpack's zippers, a gym locker or luggage. The battery is rechargeable and long-lasting.",
    },
    {
      icon: "stone",
      label: "The Carbon Fiber Key Smart Organizer",
      body: "Made from premium forged carbon fiber, it declutters your pockets. Keys stack neatly and swivel out with a simple motion, preventing scratches on other items. Tools and accessories can be added (sold separately).",
    },
  ],

  howItWorks: [
    { icon: "hand", label: "Program your fingerprints", body: "Add yours — and others for family members or trusted companions." },
    { icon: "lock", label: "Lock it up", body: "Secure the backpack's zippers, a locker or your luggage." },
    { icon: "check", label: "Tap to open", body: "Unlock instantly with your fingerprint — no keys or combinations." },
  ],

  useCases: [
    { icon: "ship", label: "Daily commute", body: "A backpack with dedicated compartments for laptop, tablet and bottle." },
    { icon: "gym", label: "Gym lockers", body: "Lock a locker with a fingerprint instead of a key." },
    { icon: "travel", label: "Luggage", body: "Use the padlock on your luggage." },
    { icon: "gift", label: "A coordinated gift", body: "Three matching essentials in one kit." },
  ],

  whatsIncluded: [
    { icon: "travel", label: "Modern Commuter Anti-Theft Backpack (Beige)", body: "Concealed zippers, water-resistant materials, padded straps." },
    { icon: "lock", label: "Biometric Fingerprint Smart Padlock", body: "Multiple fingerprints, rechargeable battery." },
    { icon: "stone", label: "Carbon Fiber Key Smart Organizer", body: "Forged carbon fiber; accessories sold separately." },
  ],

  specs: [
    { label: "Bundle contents", value: "3 items", description: "Backpack · fingerprint padlock · key organizer" },
    { label: "Backpack colour", value: "Beige" },
    { label: "Backpack security", value: "Concealed zippers" },
    { label: "Backpack materials", value: "Durable, water-resistant" },
    { label: "Backpack storage", value: "Dedicated compartments for laptop, tablet and water bottle" },
    { label: "Padlock", value: "Biometric fingerprint unlock", description: "Multiple fingerprints; rechargeable battery" },
    { label: "Key organizer", value: "Forged carbon fiber", description: "Accessories sold separately" },
  ],

  faq: [
    {
      question: "What's in the kit?",
      answer: "A Modern Commuter Anti-Theft Backpack in beige, a Biometric Fingerprint Smart Padlock and a Carbon Fiber Key Smart Organizer.",
    },
    {
      question: "Can more than one person use the padlock?",
      answer: "Yes. You can program multiple fingerprints for family members or trusted companions.",
    },
    {
      question: "Where can I use the padlock?",
      answer: "On the backpack's zippers, a gym locker or your luggage.",
    },
    {
      question: "Does the padlock need batteries?",
      answer: "It has a long-lasting rechargeable battery.",
    },
    {
      question: "How long does delivery take?",
      answer: "Shipping is free, and orders arrive in 5–11 working days. Every order gets a tracking link once the carrier scans it.",
    },
  ],
};
