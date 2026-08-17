import type { Metadata } from 'next';
import Link from 'next/link';

import { blogRepository } from '@/lib/catalog/blog';
import { JsonLd, breadcrumbSchema } from '@/lib/seo/jsonld';
import { absoluteUrl, siteOpenGraphImage } from '@/lib/seo/metadata';
import { Breadcrumb, EmptyState } from '@/components/ui/primitives';
import { ButtonLink } from '@/components/ui/button';
import { GridIcon } from '@/components/ui/icons';
import { ArticleGrid } from '@/components/blog/article-card';

export const revalidate = 3600;

const TITLE = 'Blog';
const DESCRIPTION = 'News, guides and updates.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/blogs' },
  openGraph: {
    ...siteOpenGraphImage,
    type: 'website',
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl('/blogs'),
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default async function BlogsIndexPage() {
  const [blogs, recentArticles] = await Promise.all([
    blogRepository.getAllBlogs(),
    blogRepository.getRecentArticles(24),
  ]);

  if (recentArticles.length === 0) {
    return (
      <div className="container-page">
        <EmptyState
          icon={<GridIcon size={24} />}
          title="Nothing published yet"
          // Names the commerce platform, so it stays development-only.
          description={
            process.env.NODE_ENV !== 'production'
              ? 'Run `npm run shopify:sync-blog` to bring your Shopify blog posts into the storefront.'
              : 'Check back soon for news and updates.'
          }
          action={<ButtonLink href="/">Back home</ButtonLink>}
        />
      </div>
    );
  }

  // The common case is one storefront blog — skip the topic switcher and go
  // straight to that blog's own title and articles.
  const singleBlog = blogs.length === 1 ? blogs[0] : null;

  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Blog', url: '/blogs' }])} />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumb items={[{ href: '/', label: 'Home' }, { label: 'Blog' }]} />
        </div>

        <header className="max-w-2xl pb-8">
          <h1 className="text-4xl">{singleBlog?.title ?? 'Blog'}</h1>
          <p className="mt-3 text-base text-ink-muted">
            {recentArticles.length} article{recentArticles.length === 1 ? '' : 's'}
          </p>
        </header>

        {!singleBlog && blogs.length > 1 && (
          <nav aria-label="Blogs" className="mb-10 flex flex-wrap gap-2">
            {blogs.map((blog) => (
              <Link
                key={blog.id}
                href={`/blogs/${blog.handle}`}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-sunken"
              >
                {blog.title}
              </Link>
            ))}
          </nav>
        )}

        <ArticleGrid articles={recentArticles} />
      </div>
    </>
  );
}
