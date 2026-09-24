import type { ProductPdpContent } from "./types";

/**
 * Trackify Premium Elecspray Hair Brush.
 *
 * Sources for every factual claim (nothing here is invented):
 *  - CJ product CJTF3069071: 300 mAh rechargeable battery, plastic body,
 *    188 g, 225 × 90 × 65 mm package, carton packaging, three colours.
 *  - Supplier infographics: refillable top-fill liquid tank, spray outlet in
 *    the brush head, one-button self-cleaning bristle plate.
 *  - Shopify refund policy: 30 days, unused, original packaging, email to start.
 *
 * Not stated anywhere reliable, so deliberately absent: charging cable type or
 * whether one is in the box, run time per charge, tank capacity, heat.
 */

const IMG = {
  lifestyleFrizz: "gid://shopify/MediaImage/46181324292323",
  mist: "gid://shopify/MediaImage/46181324325091",
  tank: "gid://shopify/MediaImage/46181324226787",
  lifestyleScalp: "gid://shopify/MediaImage/46181324357859",
  selfClean: "gid://shopify/MediaImage/46181324390627",
};

export const content: ProductPdpContent = {
  handle: "electric-spray-massage-hair-brush",
  subtitle:
    "Mists, detangles and massages in one pass — smoother, calmer hair without the tug.",
  ctaHeadline: "Ready for smoother, calmer hair?",

  benefits: [
    { icon: "droplet", label: "Mist as you brush", body: "A fine spray hydrates strands while the bristles move through them." },
    { icon: "hand", label: "Less pulling", body: "Cushioned, flexible bristles give at knots instead of tearing through." },
    { icon: "clean", label: "Self-cleaning", body: "One press pushes trapped hair off the bristles." },
    { icon: "battery", label: "Cordless", body: "Built-in 300 mAh rechargeable battery. 188 g." },
  ],

  story: [
    {
      icon: "check",
      label: "Still fighting frizz and knots every morning?",
      body: "A dry brush drags through tangles, builds static and leaves flyaways standing up. Adding a spray bottle means juggling two things at once — and the brush still ends up clogged with hair.",
    },
    {
      icon: "sparkle",
      label: "Meet the Elecspray Hair Brush.",
      body: "It puts the mist inside the brush. Fill the tank with water or your favourite light leave-in, press once, and a fine spray reaches your hair as the cushioned bristles glide through — hydrated and detangled in the same stroke. When you're done, one press clears the bristles.",
      image: IMG.lifestyleFrizz,
    },
  ],

  featureHighlights: [
    {
      icon: "droplet",
      label: "Moisture lands where you're brushing",
      body: "The spray outlet sits in the brush head, so mist reaches the strands you're working on — not the mirror. Dry lengths get hydration exactly as you detangle them, which helps calm frizz and static.",
      image: IMG.mist,
    },
    {
      icon: "sparkle",
      label: "Use the leave-in you already love",
      body: "The refillable top-fill tank takes plain water or a light hair serum and releases it as an even mist rather than drips — so a little product goes further and doesn't sit heavy on your roots.",
      image: IMG.tank,
    },
    {
      icon: "massage",
      label: "A scalp massage with every pass",
      body: "Rounded, flexible bristle tips on an air cushion press gently against the scalp. Relaxing at the end of a long day, and gentle enough for everyday brushing.",
      image: IMG.lifestyleScalp,
    },
    {
      icon: "clean",
      label: "Clean bristles in one press",
      body: "Every brush collects hair. Press the release button and the bristle plate pushes it up and out, ready to wipe away — no picking strands out with your fingers.",
      image: IMG.selfClean,
    },
  ],

  howItWorks: [
    { icon: "droplet", label: "Fill", body: "Open the port on top and add water or a light, water-thin leave-in." },
    { icon: "sparkle", label: "Mist & brush", body: "Switch it on and brush from the ends up to the roots as the fine mist releases." },
    { icon: "clean", label: "Clean", body: "Press the release button to push collected hair off the bristles, then wipe away." },
  ],

  useCases: [
    { icon: "sun", label: "Morning refresh", body: "Revive bed-head and smooth flyaways in a couple of minutes before you head out." },
    { icon: "moon", label: "Evening wind-down", body: "A slow scalp massage with a light serum as part of your night routine." },
    { icon: "travel", label: "Gym bag & travel", body: "Cordless and 188 g — it replaces a brush and a spray bottle in your bag." },
    { icon: "gift", label: "An easy gift", body: "Three soft colours for anyone who fights knots and static." },
  ],

  whatsIncluded: [
    {
      icon: "package",
      label: "1 × Elecspray Hair Brush",
      body: "In your chosen colour, with built-in rechargeable battery and refillable mist tank.",
    },
  ],

  specs: [
    { label: "Functions", value: "Mist spray · Scalp massage · Self-cleaning bristles" },
    { label: "Battery", value: "300 mAh, built-in rechargeable" },
    { label: "Power", value: "Cordless" },
    { label: "Tank", value: "Refillable, top-fill port" },
    { label: "Material", value: "Plastic body, flexible cushioned bristles" },
    { label: "Weight", value: "188 g" },
    { label: "Package size", value: "22.5 × 9 × 6.5 cm" },
    { label: "Colours", value: "Beige, Pink, Purple" },
    { label: "Packaging", value: "Carton box" },
  ],

  faq: [
    {
      question: "What can I put in the tank?",
      answer: "Plain water works for everyday frizz and static. You can also use a light, water-thin leave-in serum or essence. Avoid thick creams and heavy oils — if a product won't mist from an ordinary spray bottle, it won't mist from the brush either.",
    },
    {
      question: "Does it need batteries?",
      answer: "No. It runs on a built-in 300 mAh rechargeable battery, so there's nothing to replace — just recharge it when it runs low.",
    },
    {
      question: "Will it work on my hair type?",
      answer: "The flexible cushioned bristles are made to glide through straight, wavy, curly and thick hair. For very tight curls or heavy knots, work in small sections and start from the ends.",
    },
    {
      question: "How do I clean it?",
      answer: "Press the release button to push collected hair off the bristles and wipe it away. If you won't use it for a few days, empty the tank, and keep the charging port dry.",
    },
    {
      question: "Which colour should I choose?",
      answer: "Beige, pink and purple are the same brush with identical features — it's purely your preference. Selecting a colour switches the main photo so you can see it.",
    },
    {
      question: "How long does shipping take, and what does it cost?",
      answer: "Delivery options and the exact cost for your address are shown at checkout before you pay. Every order gets a tracking link once the carrier scans it.",
    },
    {
      question: "Can I return it?",
      answer: "Yes — within 30 days of receiving it. Because it's a personal-care item, it needs to be unused and in its original packaging. Email support@shoptrackify.com to start a return and we'll send you a return label.",
    },
  ],

  mediaAlt: {
    "gid://shopify/MediaImage/46181324161251": "Elecspray Hair Brush in beige, front and bristle side, with a woman brushing her hair",
    "gid://shopify/MediaImage/46181324194019": "Elecspray Hair Brush in purple, front and bristle side",
    "gid://shopify/MediaImage/46181324226787": "Pouring hair serum into the brush's top-fill mist tank",
    "gid://shopify/MediaImage/46181324259555": "Elecspray Hair Brush in pink, front and bristle side",
    [IMG.lifestyleFrizz]: "Woman brushing long, smooth hair as the brush releases a fine mist",
    [IMG.mist]: "Close-up of fine mist spraying from the brush head onto hair",
    [IMG.lifestyleScalp]: "Woman brushing near her scalp with the beige Elecspray brush",
    [IMG.selfClean]: "Self-cleaning in one press: collected hair is pushed off the bristles",
  },
};
