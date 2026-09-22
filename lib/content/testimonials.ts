/**
 * PLACEHOLDER COPY — replace before launch.
 *
 * No review provider is wired up yet (see components/product/reviews.tsx),
 * so there is no real customer-quote source to pull from. These entries hold
 * the homepage testimonial section's layout and tone; swap the array
 * contents for real quotes (or wire this section to a review provider) once
 * you have them. Shipping this file unedited puts invented quotes in front
 * of shoppers.
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
 * comfortably. Keep it at six (or a multiple of two) when replacing these
 * with real quotes, so both rows stay even.
 */
export const testimonials: Testimonial[] = [
  {
    id: 'sample-1',
    quote:
      'Replace this with a real customer quote — e.g. what convinced them to buy, or how the product performed day to day.',
    author: 'Sample customer',
    role: 'Verified buyer',
  },
  {
    id: 'sample-2',
    quote:
      'A second placeholder quote. Two or three short, specific sentences read better here than long paragraphs.',
    author: 'Sample customer',
    role: 'Verified buyer',
  },
  {
    id: 'sample-3',
    quote:
      'Third placeholder — vary the angle (delivery speed, build quality, support) so the section does not read as repetitive once real quotes replace these.',
    author: 'Sample customer',
    role: 'Verified buyer',
  },
  {
    id: 'sample-4',
    quote:
      'Fourth placeholder — a shipping or packaging angle reads well here once you have a real quote to swap in.',
    author: 'Sample customer',
    role: 'Verified buyer',
  },
  {
    id: 'sample-5',
    quote:
      'Fifth placeholder — something about repeat purchase or gifting the product works well in this slot.',
    author: 'Sample customer',
    role: 'Verified buyer',
  },
  {
    id: 'sample-6',
    quote:
      'Sixth placeholder — a quote about customer support or the return process rounds out the set.',
    author: 'Sample customer',
    role: 'Verified buyer',
  },
];
