import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { STATIC_PAGES, getStaticPage } from "@/lib/content/pages";
import { shopRepository } from "@/lib/catalog/shop";
import type { ShopPolicies, ShopAddress } from "@/types/shop";
import { absoluteUrl, siteOpenGraphImage } from "@/lib/seo/metadata";
import { JsonLd, breadcrumbSchema } from "@/lib/seo/jsonld";
import { Breadcrumb, Alert } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { InfoIcon, MailIcon, PhoneIcon, MapPinIcon } from "@/components/ui/icons";

export const revalidate = 86400;

/** Handles that have a real Shopify Shop Policy counterpart — see lib/catalog/shop.ts. */
const SHOPIFY_POLICY_HANDLES: Partial<Record<string, keyof ShopPolicies>> = {
  terms: "termsOfService",
  privacy: "privacyPolicy",
  returns: "refundPolicy",
  shipping: "shippingPolicy",
};

function formatAddress(address: ShopAddress): string {
  const street = [address.address1, address.address2].filter(Boolean).join(", ");
  const region = [address.city, [address.province, address.zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [street, region, address.country].filter(Boolean).join(" · ");
}

type PageProps = { params: Promise<{ handle: string }> };

export function generateStaticParams() {
  return STATIC_PAGES.map((page) => ({ handle: page.handle }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const page = getStaticPage(handle);
  if (!page)
    return { title: "Page not found", robots: { index: false, follow: false } };

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/pages/${page.handle}` },
    openGraph: {
      ...siteOpenGraphImage,
      type: "article",
      title: page.title,
      description: page.description,
      url: absoluteUrl(`/pages/${page.handle}`),
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
    },
  };
}

export default async function StaticContentPage({ params }: PageProps) {
  const { handle } = await params;
  const page = getStaticPage(handle);
  if (!page) notFound();

  const policyKey = SHOPIFY_POLICY_HANDLES[handle];
  const policies = policyKey ? await shopRepository.getPolicies() : null;
  const shopifyPolicy = policyKey ? (policies?.[policyKey] ?? null) : null;
  const contact = handle === "contact" ? await shopRepository.getContact() : null;
  const hasContactDetails = Boolean(contact?.email || contact?.phone || contact?.address);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: page.title, url: `/pages/${page.handle}` },
        ])}
      />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumb
            items={[{ href: "/", label: "Home" }, { label: page.title }]}
          />
        </div>

        <article className="mx-auto max-w-2xl py-6 pb-16">
          <header className="mb-9">
            <h1 className="text-4xl">{page.title}</h1>
            <p className="mt-3 text-base text-ink-muted">{page.description}</p>
          </header>

          {!shopifyPolicy &&
            page.requiresMerchantReview &&
            process.env.NODE_ENV !== "production" && (
              <Alert
                tone="info"
                icon={<InfoIcon size={18} />}
                title="Review before launch"
                className="mb-8"
              >
                This page holds placeholder copy that describes how the
                storefront actually behaves. It is not legal advice — replace it
                with your own policy in{" "}
                <code className="rounded-xs bg-surface px-1 py-0.5 text-xs">
                  lib/content/pages.ts
                </code>{" "}
                before going live. This notice is hidden in production.
              </Alert>
            )}

          {shopifyPolicy ? (
            // Real, merchant-authored policy from Shopify Admin → Settings → Policies.
            // Shopify sanitizes this HTML on ingest, same as product descriptions.
            <div
              className="prose-product"
              dangerouslySetInnerHTML={{ __html: shopifyPolicy.body }}
            />
          ) : (
            <div className="space-y-8">
              {page.sections.map((section, index) => (
                <section key={section.heading ?? `section-${index}`}>
                  {section.heading && (
                    <h2 className="mb-3 text-xl">{section.heading}</h2>
                  )}
                  <div className="space-y-3.5">
                    {section.body.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="leading-relaxed text-ink-muted"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {page.handle === "contact" && (
            <div className="mt-10 rounded-lg border border-line bg-surface p-6">
              <h2 className="text-lg">Reach us</h2>

              {hasContactDetails && contact ? (
                <ul className="mt-4 space-y-1">
                  {contact.email && (
                    <li>
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-3 rounded-md py-2 text-sm text-ink transition-colors hover:text-ink-muted"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-canvas text-ink-muted">
                          <MailIcon size={17} />
                        </span>
                        {contact.email}
                      </a>
                    </li>
                  )}
                  {contact.phone && (
                    <li>
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-3 rounded-md py-2 text-sm text-ink transition-colors hover:text-ink-muted"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-canvas text-ink-muted">
                          <PhoneIcon size={17} />
                        </span>
                        {contact.phone}
                      </a>
                    </li>
                  )}
                  {contact.address && (
                    <li className="flex items-start gap-3 py-2 text-sm text-ink-muted">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-canvas text-ink-muted">
                        <MapPinIcon size={17} />
                      </span>
                      <span className="pt-1.5">{formatAddress(contact.address)}</span>
                    </li>
                  )}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-ink-muted">
                  Contact details are configured in your store admin under
                  Settings → Store details. Add them there so customers can
                  reach you directly.
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <ButtonLink href="/account/orders" variant="outline">
                  Find your order number
                </ButtonLink>
              </div>
            </div>
          )}
        </article>
      </div>
    </>
  );
}
