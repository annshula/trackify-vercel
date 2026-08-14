import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';

import { blogRepository } from '@/lib/catalog/blog';
import { articleMetadata } from '@/lib/seo/metadata';
import { JsonLd, articleSchema, breadcrumbSchema } from '@/lib/seo/jsonld';
import { Breadcrumb } from '@/components/ui/primitives';
import { BLUR_DATA_URL } from '@/lib/utils/image';
import { ArticleGrid, formatArticleDate } from '@/components/blog/article-card';

export const revalidate = 3600;

type PageProps = { params: Promise<{ blogHandle: string; articleHandle: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { blogHandle, articleHandle } = await params;
  const article = await blogRepository.getArticleByHandle(blogHandle, articleHandle);
  if (!article) return { title: 'Article not found', robots: { index: false, follow: false } };
  return articleMetadata(article);
}

export default async function ArticlePage({ params }: PageProps) {
  const { blogHandle, articleHandle } = await params;

  const article = await blogRepository.getArticleByHandle(blogHandle, articleHandle);
  if (!article) notFound();

  const blog = await blogRepository.getBlogByHandle(blogHandle);
  const date = formatArticleDate(article);

  const related = (await blogRepository.getArticlesByBlog(blogHandle, { perPage: 4 })).articles.filter(
    (candidate) => candidate.id !== article.id,
  );

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: 'Home', url: '/' },
            { name: 'Blog', url: '/blogs' },
            { name: blog?.title ?? article.blogTitle, url: `/blogs/${article.blogHandle}` },
            { name: article.title, url: `/blogs/${article.blogHandle}/${article.handle}` },
          ]),
          articleSchema(article),
        ]}
      />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumb
            items={[
              { href: '/', label: 'Home' },
              { href: '/blogs', label: 'Blog' },
              { href: `/blogs/${article.blogHandle}`, label: blog?.title ?? article.blogTitle },
              { label: article.title },
            ]}
          />
        </div>

        <article className="mx-auto max-w-3xl py-6 pb-16">
          <header className="mb-8">
            <h1 className="text-4xl">{article.title}</h1>
            <p className="mt-3 text-sm text-ink-muted">
              {article.authorName && <span>{article.authorName}</span>}
              {article.authorName && date && <span> · </span>}
              {date && <time dateTime={article.publishedAt ?? article.createdAt}>{date}</time>}
            </p>
          </header>

          {article.image && (
            <div className="relative mb-10 aspect-video w-full overflow-hidden rounded-xl bg-surface-sunken">
              <Image
                src={article.image.url}
                alt={article.image.altText ?? article.title}
                fill
                sizes="(min-width: 1024px) 768px, 100vw"
                priority
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                className="object-cover"
              />
            </div>
          )}

          <div
            className="prose-product"
            // Shopify sanitizes article body HTML on ingest, same as product descriptions.
            dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
          />

          {article.tags.length > 0 && (
            <ul className="mt-10 flex flex-wrap gap-2 border-t border-line pt-6">
              {article.tags.map((tag) => (
                <li key={tag} className="rounded-full bg-surface-sunken px-3 py-1 text-xs text-ink-muted">
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </article>

        {related.length > 0 && (
          <section aria-labelledby="related-articles-heading" className="border-t border-line pt-12 pb-16">
            <h2 id="related-articles-heading" className="mb-6 text-xl">
              More from {blog?.title ?? article.blogTitle}
            </h2>
            <ArticleGrid articles={related} />
          </section>
        )}
      </div>
    </>
  );
}
