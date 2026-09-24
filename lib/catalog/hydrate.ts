import type { Catalog, CatalogPdpContent, CatalogProduct } from "@/types/catalog";

const list = <T,>(value: T[] | undefined): T[] => (Array.isArray(value) ? value : []);

/**
 * Storage → memory coercion for the synchronized catalog.
 *
 * The catalog document is written by whichever deployment last ran the sync, so
 * a build can read a `products.json` (seed file or Blob) that predates the code
 * reading it. A field added to `CatalogProduct` after that write is simply
 * absent from every record in the document — which is how `product.specs.length`
 * threw `Cannot read properties of undefined (reading 'length')` and failed the
 * build on the first product page prerendered. Reading storage must not assume
 * the document matches the current shape.
 *
 * Only fields whose absence has exactly one meaning are filled. A record with no
 * `specs` key means the sync that wrote it had no spec metaobjects to record,
 * which is what an empty array says — so this stays faithful to the document
 * instead of inventing content. Write paths persist the objects they were
 * handed, so hydration never rewrites storage: the next sync is what brings the
 * document itself up to date.
 */
export function hydrateCatalogProduct(product: CatalogProduct): CatalogProduct {
  return {
    ...product,
    specs: Array.isArray(product.specs) ? product.specs : [],
    featureHighlights: Array.isArray(product.featureHighlights)
      ? product.featureHighlights
      : [],
    comparisonTable: Array.isArray(product.comparisonTable)
      ? product.comparisonTable
      : [],
    pdp: hydratePdp(product.pdp),
  };
}

/** Same rule as above: a missing section means "no content", never invented copy. */
function hydratePdp(pdp: Partial<CatalogPdpContent> | undefined): CatalogPdpContent {
  return {
    benefits: list(pdp?.benefits),
    story: list(pdp?.story),
    howItWorks: list(pdp?.howItWorks),
    useCases: list(pdp?.useCases),
    whatsIncluded: list(pdp?.whatsIncluded),
    faq: list(pdp?.faq),
    demoVideo: pdp?.demoVideo ?? null,
  };
}

/** Hydrates every record in a stored catalog document. */
export function hydrateCatalog(catalog: Catalog): Catalog {
  return { ...catalog, products: catalog.products.map(hydrateCatalogProduct) };
}
