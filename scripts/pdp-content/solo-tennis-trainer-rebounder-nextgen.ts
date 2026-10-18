import type { ProductPdpContent } from "./types";

/**
 * Solo Tennis Trainer Rebound Baseboard with Elastic String.
 *
 * Every factual claim comes from the product description in Shopify: high-
 * elasticity bungee cord that returns the ball; base filled with water or sand
 * through a fill valve; empty it is lightweight and carryable; anti-tangle
 * swivel ring; grooved base that wraps the string and holds the ball; for
 * beginners/novices, kids and adults; forehand, backhand and footwork practice.
 *
 * Deliberately absent: weight (filled or empty), dimensions, cord length, ball
 * count per option, racket — none are stated in the description.
 */

const IMG = {
  base: "gid://shopify/MediaImage/39543334437091",
  folded: "gid://shopify/MediaImage/39543156211939",
  grooves: "gid://shopify/MediaImage/39543334469859",
  kid: "gid://shopify/MediaImage/39538148049123",
  street: "gid://shopify/MediaImage/39538101551331",
  action: "gid://shopify/MediaImage/39543156179171",
};

export const content: ProductPdpContent = {
  handle: "solo-tennis-trainer-rebounder-nextgen",
  subtitle:
    "Practice your forehand, backhand and footwork without a partner or a ball machine.",
  ctaHeadline: "Ready to practice without waiting for a partner?",
  perks: [
    "Elastic cord returns every ball",
    "Fill with water or sand for stability",
    "Anti-tangle swivel ring",
    "For kids, beginners and adults",
  ],

  benefits: [
    { icon: "gym", label: "Solo practice", body: "A high-elasticity bungee cord returns the ball after every hit." },
    { icon: "droplet", label: "Stable when filled", body: "Add water or sand through the fill valve to anchor the base." },
    { icon: "travel", label: "Portable when empty", body: "Lightweight and easy to carry to the park, driveway or court." },
    { icon: "check", label: "Tangle-free", body: "A built-in anti-tangle swivel ring keeps the cord from twisting." },
  ],

  story: [
    {
      icon: "check",
      label: "No partner, no court, no practice",
      body: "Practice usually needs another person or an expensive ball machine — and a lot of time spent chasing balls.",
    },
    {
      icon: "sparkle",
      label: "Meet the Solo Tennis Trainer.",
      body: "A portable rebound baseboard: fill the base, unwind the cord and hit. The ball comes back to you after every swing, simulating a real rally, so you can work on forehand, backhand and footwork without chasing a ball.",
      image: IMG.kid,
    },
  ],

  featureHighlights: [
    {
      icon: "gym",
      label: "A rally that never ends",
      body: "The high-elasticity bungee cord returns the ball to you after every hit, so you keep a real rally going alone — on forehand, backhand and footwork.",
      image: IMG.action,
    },
    {
      icon: "droplet",
      label: "Anchored when you need it, light when you don't",
      body: "A secure fill valve lets you add water or sand to hold the base firmly in place during intense sessions. Empty it and the base is lightweight and easy to carry.",
      image: IMG.folded,
    },
    {
      icon: "package",
      label: "Tidy storage built into the base",
      body: "The grooved base is shaped to wrap the string neatly and hold the tennis ball securely when you're not playing.",
      image: IMG.grooves,
    },
    {
      icon: "check",
      label: "Great for all ages",
      body: "A good tool for kids learning the basics, adults picking up a new hobby, or anyone who wants to improve hand-eye coordination and fitness.",
      image: IMG.street,
    },
  ],

  howItWorks: [
    { icon: "droplet", label: "Fill the base", body: "Add water or sand through the fill valve for stability." },
    { icon: "check", label: "Unwind the string", body: "Pull the elastic string out to your desired length." },
    { icon: "gym", label: "Hit and rebound", body: "Hit the ball forward and upwards, and get ready for the rebound." },
  ],

  useCases: [
    { icon: "sun", label: "At the park", body: "Carry the empty base to a field or court and fill it there." },
    { icon: "home", label: "In the driveway", body: "Practice at home without chasing balls." },
    { icon: "gym", label: "Building fitness", body: "Work on hand-eye coordination and footwork." },
    { icon: "gift", label: "For young players", body: "A simple way for kids to learn the basics." },
  ],

  whatsIncluded: [
    {
      icon: "package",
      label: "Solo tennis trainer",
      body: "Rebound baseboard with elastic string, anti-tangle swivel ring and fill valve. Choose the option that suits you on this page.",
    },
  ],

  specs: [
    { label: "Use", value: "Solo tennis practice", description: "Forehand, backhand and footwork" },
    { label: "Rebound", value: "High-elasticity bungee cord", description: "Returns the ball after every hit" },
    { label: "Stability", value: "Fill valve — add water or sand" },
    { label: "Cord", value: "Anti-tangle swivel ring" },
    { label: "Storage", value: "Grooved base wraps the string and holds the ball" },
    { label: "Suitable for", value: "Beginners and novices — kids to adults" },
    { label: "Options", value: "Trainer and ball with line · Trainer and ball with line, 2 pcs · Ball with line" },
  ],

  faq: [
    {
      question: "Do I need a partner?",
      answer: "No. The bungee cord returns the ball to you after every hit, so you can practice a rally on your own.",
    },
    {
      question: "What do I fill the base with?",
      answer: "Water or sand, through the secure fill valve. A filled base stays firmly in place during intense practice; empty, it is light enough to carry.",
    },
    {
      question: "Who is it for?",
      answer: "It is designed for beginners and novices — kids learning the basics and adults picking up the game, or anyone who wants to improve hand-eye coordination and fitness.",
    },
    {
      question: "Will the cord tangle?",
      answer: "The built-in anti-tangle swivel ring is there to keep the cord from twisting, so practice stays uninterrupted.",
    },
    {
      question: "How long does delivery take?",
      answer: "Shipping is free, and orders arrive in 5–11 days. Every order gets a tracking link once the carrier scans it.",
    },
  ],

  mediaAlt: {
    [IMG.base]: "Blue solo tennis trainer base with tennis ball and elastic string",
    [IMG.folded]: "Solo tennis trainer base showing the fill valve",
    [IMG.grooves]: "Underside of the tennis trainer base showing the grooves for wrapping the string",
    [IMG.kid]: "Child practicing tennis in a driveway with the solo trainer",
    [IMG.street]: "Kids practicing tennis on a street with solo trainers",
    [IMG.action]: "Player returning a ball tethered to the solo tennis trainer on court",
  },
};
