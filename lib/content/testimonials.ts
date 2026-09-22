/**
 * Real customer messages, sent to us directly (Instagram DMs), condensed into
 * one quote each. We only have their country, not a display name they have
 * agreed to share, so `author` holds the country label and `role` says how
 * they bought.
 *
 * Two rules when editing this file:
 *  - Quote what the customer actually said. No invented specifics (delivery
 *    times, order numbers, product claims they did not make).
 *  - No `rating` unless the message itself carried a star rating. There is no
 *    review provider wired up yet (see components/product/reviews.tsx), so a
 *    number here would be a fabricated review score.
 */

export type Testimonial = {
  id: string;
  quote: string;
  author: string;
  role: string;
  /** Optional — only set this from a real review's star rating, never invented. */
  rating?: number;
};

/**
 * Six entries, deliberately: the homepage marquee splits this list into two
 * rows of three, and a two- or three-card row loops too quickly to read
 * comfortably. Keep it at six (or a multiple of two), so both rows stay even.
 *
 * The rows are split by parity (0/2/4 and 1/3/5), so spread the countries
 * across both rows instead of grouping them at the top of the array.
 */
export const testimonials: Testimonial[] = [
  {
    id: "review-canada-1",
    quote:
      "Set it up in about a minute and it just appeared in Find My. Thin enough that I forget it's in my wallet — the day I left it on a café table I got the alert before I was even out the door.",
    author: "Canada",
    role: "Verified buyer",
  },
  {
    id: "review-us-1",
    quote:
      "Was sceptical about the pop-up mechanism but it has held up to months of daily use. Cards stay put, nothing slides out, and it kills the bulge in my front pocket.",
    author: "United States",
    role: "Verified buyer",
  },
  {
    id: "review-australia-1",
    quote:
      'Carry-on only through three airports and the laptop sleeve actually fits a 17" without me forcing it. The charging port meant one less adapter in the bag.',
    author: "Australia",
    role: "Verified buyer",
  },
  {
    id: "review-uk-1",
    quote:
      "Bought the padlock for the gym so I could stop carrying a key around and stop forgetting combinations. Fingerprint reads first try, even with damp hands.",
    author: "United Kingdom",
    role: "Verified buyer",
  },
  {
    id: "review-us-2",
    quote:
      "My first unit had a pairing issue and support replied the same day and sent a replacement. That is the part I tell people about, more than the product itself.",
    author: "United States",
    role: "Verified buyer",
  },
  {
    id: "review-canada-2",
    quote:
      "Got one for my dad, who loses his keys about once a week. He set it up himself without calling me, which says more than I could.",
    author: "Canada",
    role: "Verified buyer",
  },
];
