/**
 * Customer messages, sent to us directly on Instagram and Facebook, condensed
 * into one quote each. The cards render these as real platform elements — the
 * Instagram row keeps Instagram's own chrome, the Facebook row keeps
 * Facebook's — so the provenance is visible to the shopper.
 *
 * What is real here: the messages and the senders' countries. What is NOT
 * yet: `name`, `handle` and `postedAt` are drafts written to hold the layout.
 * Each is marked TODO — paste the exact display name, handle and date the
 * message came from before this ships. Never invent engagement (like counts,
 * follower counts, star ratings); a made-up number is fabricated social proof,
 * and this card set deliberately shows none.
 *
 * Also: only publish a handle with the customer's OK — a DM is a private
 * message, and the handle is theirs, not ours.
 */

export type Testimonial = {
  id: string;
  /** Which platform's chrome the card renders, and where the message arrived. */
  platform: "instagram" | "facebook";
  /** Display name shown in the card header. TODO: use the real one. */
  name: string;
  /** Instagram/Facebook handle, without the leading @. TODO: use the real one. */
  handle: string;
  /** Where the customer is — the label shoppers actually asked about. */
  location: string;
  quote: string;
  /** Relative age shown in the card chrome (e.g. '3d'). TODO: use the real one. */
  postedAt: string;
  role: string;
};

/**
 * Six entries, deliberately: the homepage marquee splits this list into two
 * rows of three, and a two- or three-card row loops too quickly to read
 * comfortably. Keep it at six (or a multiple of two), so both rows stay even.
 *
 * The rows are split by parity — even indices (0/2/4) become the top row and
 * odd indices (1/3/5) the bottom one — which is why the platform field
 * alternates: it puts every Instagram card on the top row and every Facebook
 * card on the bottom, instead of mixing the two chromes inside one row.
 */
export const testimonials: Testimonial[] = [
  {
    id: "review-canada-1",
    platform: "instagram",
    name: "Marc D.", // TODO: replace with the real name
    handle: "marc.d", // TODO: replace with the real handle
    location: "Canada",
    postedAt: "3d", // TODO: replace with the real date
    quote:
      "Set it up in about a minute and it just appeared in Find My. Thin enough that I forget it's in my wallet — the day I left it on a café table I got the alert before I was even out the door.",
    role: "Verified buyer",
  },
  {
    id: "review-uk-1",
    platform: "facebook",
    name: "Sophie W.", // TODO: replace with the real name
    handle: "sophie.w", // TODO: replace with the real handle
    location: "United Kingdom",
    postedAt: "1w", // TODO: replace with the real date
    quote:
      "Bought the padlock for the gym so I could stop carrying a key around and stop forgetting combinations. Fingerprint reads first try, even with damp hands.",
    role: "Verified buyer",
  },
  {
    id: "review-australia-1",
    platform: "instagram",
    name: "Liam T.", // TODO: replace with the real name
    handle: "liam.t", // TODO: replace with the real handle
    location: "Australia",
    postedAt: "5d", // TODO: replace with the real date
    quote:
      'Carry-on only through three airports and the laptop sleeve actually fits a 17" without me forcing it. The charging port meant one less adapter in the bag.',
    role: "Verified buyer",
  },
  {
    id: "review-canada-2",
    platform: "facebook",
    name: "Priya S.", // TODO: replace with the real name
    handle: "priya.s", // TODO: replace with the real handle
    location: "Canada",
    postedAt: "2w", // TODO: replace with the real date
    quote:
      "Got one for my dad, who loses his keys about once a week. He set it up himself without calling me, which says more than I could.",
    role: "Verified buyer",
  },
  {
    id: "review-us-1",
    platform: "instagram",
    name: "Jessica R.", // TODO: replace with the real name
    handle: "jess.r", // TODO: replace with the real handle
    location: "United States",
    postedAt: "6d", // TODO: replace with the real date
    quote:
      "Was sceptical about the pop-up mechanism but it has held up to months of daily use. Cards stay put, nothing slides out, and it kills the bulge in my front pocket.",
    role: "Verified buyer",
  },
  {
    id: "review-us-2",
    platform: "facebook",
    name: "Daniel K.", // TODO: replace with the real name
    handle: "dan.k", // TODO: replace with the real handle
    location: "United States",
    postedAt: "3w", // TODO: replace with the real date
    quote:
      "My first unit had a pairing issue and support replied the same day and sent a replacement. That is the part I tell people about, more than the product itself.",
    role: "Verified buyer",
  },
];
