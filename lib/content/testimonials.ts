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
};

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
];
