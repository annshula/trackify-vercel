import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

import { blogRepository } from '@/lib/catalog/blog';
import { articleMetadata, absoluteUrl } from '@/lib/seo/metadata';
import { JsonLd, articleSchema, breadcrumbSchema } from '@/lib/seo/jsonld';
import { Breadcrumb } from '@/components/ui/primitives';
import { BLUR_DATA_URL } from '@/lib/utils/image';
import { ChevronRightIcon } from '@/components/ui/icons';
import { ArticleGrid, formatArticleDate } from '@/components/blog/article-card';
import { CopyLinkButton } from '@/components/blog/copy-link-button';
import { ReadingProgress } from '@/components/blog/reading-progress';
import type { BlogArticle } from '@/types/blog';

export const revalidate = 3600;

type PageProps = { params: Promise<{ blogHandle: string; articleHandle: string }> };

export async function generateStaticParams() {
  const articles = await blogRepository.getAllArticles();
  return articles.map((article) => ({
    blogHandle: article.blogHandle,
    articleHandle: article.handle,
  }));
}

const WORDS_PER_MINUTE = 200;

/** Rough estimate from the article body — same convention as Medium/Substack. */
function readingTime(article: BlogArticle): string {
  const words = article.bodyHtml
    .replace(/<[^>]+>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return `${Math.max(1, Math.round(words / WORDS_PER_MINUTE))} min read`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

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

  const [blog, blogs] = await Promise.all([
    blogRepository.getBlogByHandle(blogHandle),
    blogRepository.getAllBlogs(),
  ]);
  const date = formatArticleDate(article);
  // The store's one-and-only blog is usually titled something like "Blogs" or
  // "News" — stacking that title right after the generic "Blog" hub crumb
  // reads as a duplicate ("Blog > Blogs"). Collapse to one crumb in that case;
  // with multiple blogs the two are genuinely different pages, so keep both.
  const showBlogTitleCrumb = blogs.length > 1;

  const related = (await blogRepository.getArticlesByBlog(blogHandle, { perPage: 4 })).articles.filter(
    (candidate) => candidate.id !== article.id,
  );

  const url = absoluteUrl(`/blogs/${article.blogHandle}/${article.handle}`);

  return (
    <>
      <ReadingProgress />

      <JsonLd
        data={[
          breadcrumbSchema([
            { name: 'Home', url: '/' },
            { name: 'Blog', url: '/blogs' },
            ...(showBlogTitleCrumb
              ? [{ name: blog?.title ?? article.blogTitle, url: `/blogs/${article.blogHandle}` }]
              : []),
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
              ...(showBlogTitleCrumb
                ? [{ href: `/blogs/${article.blogHandle}`, label: blog?.title ?? article.blogTitle }]
                : []),
              { label: article.title },
            ]}
          />
        </div>

        <article className="mx-auto max-w-3xl pb-14">
          <header className="pt-2 pb-6">
            {article.tags[0] && (
              <p className="text-2xs font-semibold tracking-[0.14em] text-accent uppercase">{article.tags[0]}</p>
            )}
            <h1 className="mt-2 text-3xl sm:text-4xl">{article.title}</h1>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-sm text-ink-muted">
                {article.authorName && (
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-2xs font-semibold text-canvas">
                    {initials(article.authorName)}
                  </span>
                )}
                <span className="flex flex-wrap items-center gap-x-1.5">
                  {article.authorName && <span className="font-medium text-ink">{article.authorName}</span>}
                  {article.authorName && <span aria-hidden="true">·</span>}
                  {date && <time dateTime={article.publishedAt ?? article.createdAt}>{date}</time>}
                  <span aria-hidden="true">·</span>
                  <span>{readingTime(article)}</span>
                </span>
              </div>

              <CopyLinkButton url={url} />
            </div>
          </header>

          {article.image && (
            <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-xl bg-surface-sunken">
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
            <ul className="mt-8 flex flex-wrap gap-2 border-t border-line pt-6">
              {article.tags.map((tag) => (
                <li key={tag} className="rounded-full bg-surface-sunken px-3 py-1 text-xs font-medium text-ink-muted">
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </article>

        {related.length > 0 && (
          <section aria-labelledby="related-articles-heading" className="border-t border-line pt-10 pb-16">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 id="related-articles-heading" className="text-xl">
                More from {blog?.title ?? article.blogTitle}
              </h2>
              <Link
                href={`/blogs/${article.blogHandle}`}
                className="group hidden shrink-0 items-center gap-1 text-sm font-medium text-ink underline-offset-4 hover:underline sm:inline-flex"
              >
                View all
                <ChevronRightIcon size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <ArticleGrid articles={related} />
          </section>
        )}
      </div>
    </>
  );
}
