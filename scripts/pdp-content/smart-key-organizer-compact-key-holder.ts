import type { ProductPdpContent } from "./types";

/**
 * The KeyFold Pro: Minimalist Smart Key Holder.
 *
 * Every factual claim comes from the product description in Shopify:
 * aircraft-grade aluminum with carbon fiber finishes; pocket-knife-style frame
 * that folds keys inside; removable deep-carry pocket clip; bottom D-ring for
 * fobs/trackers; screw-locking assembly for most standard household keys; holds
 * multiple keys in half the space of a standard keychain; finishes Matte Black,
 * Slate Blue, Olive Green, Gold, Titanium Gradient, Forged Carbon Fiber.
 *
 * Deliberately absent: maximum key count, weight, dimensions (not stated).
 */

const IMG = {
  carbon: "gid://shopify/MediaImage/39568734028003",
  open: "gid://shopify/MediaImage/39568734224611",
  gold: "gid://shopify/MediaImage/39568734126307",
  titanium: "gid://shopify/MediaImage/39568734257379",
};

export const content: ProductPdpContent = {
  handle: "smart-key-organizer-compact-key-holder",
  subtitle:
    "Fold your keys inside a pocket-knife-style frame — silent, scratch-free and half the bulk.",
  ctaHeadline: "Ready to end key jangle for good?",
  perks: [
    "Silent, scratch-free key storage",
    "Aircraft-grade aluminum, carbon fiber finish",
    "Removable pocket clip and D-ring",
    "Fits most standard keys, no tools needed",
  ],

  benefits: [
    { icon: "feather", label: "Half the pocket space", body: "Holds multiple keys in about half the space of a standard keychain." },
    { icon: "check", label: "No jangle, no scratches", body: "Locks keys firmly in place so they won't jingle or scratch your phone." },
    { icon: "stone", label: "Aircraft-grade aluminum", body: "Lightweight aluminum with carbon fiber finishes." },
    { icon: "hand", label: "Easy assembly", body: "A simple screw-locking system fits most standard household keys." },
  ],

  story: [
    {
      icon: "check",
      label: "A chaotic key ring in your pocket",
      body: "A loose bunch of keys jingles, pokes holes in your pockets and scratches your phone and everything else in the bag.",
    },
    {
      icon: "sparkle",
      label: "Meet the KeyFold Pro.",
      body: "Your keys fold inside a pocket-knife-style frame and lock firmly in place, so the whole set sits quiet and flat — with a clip to carry it and a D-ring for a fob or tracker.",
      image: IMG.open,
    },
  ],

  featureHighlights: [
    {
      icon: "check",
      label: "Silent and scratch-free",
      body: "Keys are locked firmly in place, so they don't jingle, poke holes in your pockets or scratch nearby items in your bag. Your phone screen stays safe.",
      image: IMG.carbon,
    },
    {
      icon: "ship",
      label: "Deep-carry pocket clip",
      body: "A sturdy, removable clip on the back attaches to belt loops, jeans pockets or bag dividers for quick access.",
    },
    {
      icon: "tag",
      label: "Bottom D-ring for fobs and trackers",
      body: "A built-in D-ring connects car key fobs, smart trackers or larger keys with no fuss.",
      image: IMG.gold,
    },
    {
      icon: "sparkle",
      label: "Premium tactical finishes",
      body: "Matte Black, Slate Blue, Olive Green, Gold, Titanium Gradient and Forged Carbon Fiber — pick the one that suits you.",
      image: IMG.titanium,
    },
  ],

  howItWorks: [
    { icon: "hand", label: "Add your keys", body: "Stack your keys on the screw-locking system — no special tools." },
    { icon: "check", label: "Lock them in", body: "Tighten so the keys sit firmly inside the frame." },
    { icon: "ship", label: "Clip and go", body: "Attach the pocket clip to a belt loop, pocket or bag divider." },
  ],

  useCases: [
    { icon: "ship", label: "Everyday carry", body: "Keys, folded down, in the front pocket of your jeans." },
    { icon: "travel", label: "Commuting & travel", body: "No jangling keys in a quiet carriage or at the airport." },
    { icon: "check", label: "With a tracker", body: "Hang a smart tracker or car fob from the D-ring." },
    { icon: "gift", label: "A tidy gift", body: "Choose from six finishes." },
  ],

  whatsIncluded: [
    {
      icon: "package",
      label: "1 × KeyFold Pro key organizer",
      body: "Aluminum frame with carbon fiber finish, screw-locking assembly, removable pocket clip and bottom D-ring.",
    },
  ],

  specs: [
    { label: "Material", value: "Aircraft-grade aluminum with carbon fiber finish" },
    { label: "Design", value: "Pocket-knife-style folding frame" },
    { label: "Assembly", value: "Screw-locking system — no special tools", description: "Fits most standard household keys" },
    { label: "Pocket clip", value: "Removable deep-carry clip" },
    { label: "Attachment", value: "Bottom D-ring", description: "For car key fobs, smart trackers or larger keys" },
    { label: "Space saving", value: "About half the pocket space of a standard keychain" },
    { label: "Finishes", value: "Matte Black, Slate Blue, Olive Green, Gold, Titanium Gradient, Forged Carbon Fiber" },
  ],

  faq: [
    {
      question: "Will my keys fit?",
      answer: "The simple screw-locking system fits most standard household keys, and you don't need any special tools to assemble it.",
    },
    {
      question: "Can I attach a car fob or tracker?",
      answer: "Yes. The built-in bottom D-ring connects car key fobs, smart trackers or larger keys.",
    },
    {
      question: "How do I carry it?",
      answer: "Use the removable deep-carry pocket clip on the back to attach it to a belt loop, a jeans pocket or a bag divider — or take the clip off if you prefer.",
    },
    {
      question: "Will it jingle or scratch my phone?",
      answer: "No. Keys lock firmly in place inside the frame, so they won't jingle, poke holes in pockets or scratch items nearby.",
    },
    {
      question: "How long does delivery take?",
      answer: "Shipping is free, and orders arrive in 5–11 working days. Every order gets a tracking link once the carrier scans it.",
    },
  ],

  mediaAlt: {
    [IMG.carbon]: "Carbon fiber key organizer with three keys fanned out",
    [IMG.open]: "Two key organizers shown open and folded with keys inside",
    [IMG.gold]: "Gold carbon fiber key organizer with keys and D-ring",
    [IMG.titanium]: "Titanium gradient key organizer with keys and D-ring",
  },
};
