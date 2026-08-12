import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { STATIC_PAGES, getStaticPage } from '@/lib/content/pages';
import { absoluteUrl } from '@/lib/seo/metadata';
import { JsonLd, breadcrumbSchema } from '@/lib/seo/jsonld';
import { Breadcrumb, Alert } from '@/components/ui/primitives';
import { ButtonLink } from '@/components/ui/button';
import { InfoIcon } from '@/components/ui/icons';

export const revalidate = 86400;

type PageProps = { params: Promise<{ handle: string }> };

export function generateStaticParams() {
  return STATIC_PAGES.map((page) => ({ handle: page.handle }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const page = getStaticPage(handle);
  if (!page) return { title: 'Page not found', robots: { index: false, follow: false } };

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/pages/${page.handle}` },
    openGraph: {
      type: 'article',
      title: page.title,
      description: page.description,
      url: absoluteUrl(`/pages/${page.handle}`),
    },
  };
}

export default async function StaticContentPage({ params }: PageProps) {
  const { handle } = await params;
  const page = getStaticPage(handle);
  if (!page) notFound();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: '/' },
          { name: page.title, url: `/pages/${page.handle}` },
        ])}
      />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumb items={[{ href: '/', label: 'Home' }, { label: page.title }]} />
        </div>

        <article className="mx-auto max-w-2xl py-6 pb-16">
          <header className="mb-9">
            <h1 className="text-4xl">{page.title}</h1>
            <p className="mt-3 text-base text-ink-muted">{page.description}</p>
          </header>

          {page.requiresMerchantReview && process.env.NODE_ENV !== 'production' && (
            <Alert tone="info" icon={<InfoIcon size={18} />} title="Review before launch" className="mb-8">
              This page holds placeholder copy that describes how the storefront actually behaves. It
              is not legal advice — replace it with your own policy in{' '}
              <code className="rounded-xs bg-surface px-1 py-0.5 text-xs">lib/content/pages.ts</code>{' '}
              before going live. This notice is hidden in production.
            </Alert>
          )}

          <div className="space-y-8">
            {page.sections.map((section, index) => (
              <section key={section.heading ?? `section-${index}`}>
                {section.heading && <h2 className="mb-3 text-xl">{section.heading}</h2>}
                <div className="space-y-3.5">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="leading-relaxed text-ink-muted">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {page.handle === 'contact' && (
            <div className="mt-10 rounded-lg border border-line bg-surface p-6">
              <h2 className="text-lg">Reach us</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Contact details are configured in your store admin under Settings → Store details.
                Add them here so customers can reach you directly.
              </p>
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
