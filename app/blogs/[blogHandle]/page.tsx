import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { blogRepository } from '@/lib/catalog/blog';
import { blogMetadata } from '@/lib/seo/metadata';
import { JsonLd, breadcrumbSchema } from '@/lib/seo/jsonld';
import { Breadcrumb, EmptyState } from '@/components/ui/primitives';
import { ButtonLink } from '@/components/ui/button';
import { GridIcon } from '@/components/ui/icons';
import { ArticleGrid } from '@/components/blog/article-card';
import { Pagination } from '@/components/collection/pagination';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ blogHandle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { blogHandle } = await params;
  const blog = await blogRepository.getBlogByHandle(blogHandle);
  if (!blog) return { title: 'Blog not found', robots: { index: false, follow: false } };
  return blogMetadata(blog);
}

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function BlogPage({ params, searchParams }: PageProps) {
  const { blogHandle } = await params;
  const resolvedSearchParams = await searchParams;

  const blog = await blogRepository.getBlogByHandle(blogHandle);
  if (!blog) notFound();

  const page = await blogRepository.getArticlesByBlog(blogHandle, { page: parsePage(resolvedSearchParams.page) });

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: '/' },
          { name: 'Blog', url: '/blogs' },
          { name: blog.title, url: `/blogs/${blog.handle}` },
        ])}
      />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumb items={[{ href: '/', label: 'Home' }, { href: '/blogs', label: 'Blog' }, { label: blog.title }]} />
        </div>

        <header className="max-w-2xl pb-8">
          <h1 className="text-4xl">{blog.title}</h1>
          <p className="mt-3 text-base text-ink-muted">
            {page.total} article{page.total === 1 ? '' : 's'}
          </p>
        </header>

        {page.articles.length === 0 ? (
          <EmptyState
            icon={<GridIcon size={24} />}
            title="Nothing published yet"
            description="Check back soon for news and updates."
            action={<ButtonLink href="/blogs">Back to blog</ButtonLink>}
          />
        ) : (
          <>
            <ArticleGrid articles={page.articles} />
            <Pagination
              page={page.page}
              totalPages={page.totalPages}
              basePath={`/blogs/${blog.handle}`}
              searchParams={resolvedSearchParams}
            />
          </>
        )}
      </div>
    </>
  );
}
