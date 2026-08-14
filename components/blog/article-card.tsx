import Image from 'next/image';
import Link from 'next/link';
import type { BlogArticle } from '@/types/blog';
import { cn } from '@/lib/utils/cn';
import { BLUR_DATA_URL } from '@/lib/utils/image';

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

function formatArticleDate(article: BlogArticle): string | null {
  const raw = article.publishedAt ?? article.createdAt;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}

export function ArticleCard({
  article,
  priority = false,
  className,
}: {
  article: BlogArticle;
  priority?: boolean;
  className?: string;
}) {
  const date = formatArticleDate(article);

  return (
    <article className={cn('group flex flex-col', className)}>
      <div className="relative aspect-16/10 w-full overflow-hidden rounded-lg bg-surface-sunken">
        <Link href={`/blogs/${article.blogHandle}/${article.handle}`} className="block focus-visible:outline-none">
          {article.image ? (
            <Image
              src={article.image.url}
              alt={article.image.altText ?? article.title}
              fill
              sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
              priority={priority}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              className="object-cover transition-transform duration-500 ease-out-soft group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid h-full place-items-center text-xs text-ink-subtle">No image</div>
          )}
          <span
            className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-ink/5 ring-inset transition-shadow group-focus-within:ring-2 group-focus-within:ring-ring"
            aria-hidden="true"
          />
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 pt-3.5">
        {date && <p className="text-2xs font-medium tracking-[0.12em] text-ink-subtle uppercase">{date}</p>}

        <h3 className="font-sans text-base leading-snug font-medium text-ink">
          <Link href={`/blogs/${article.blogHandle}/${article.handle}`} className="hover:underline underline-offset-4">
            {article.title}
          </Link>
        </h3>

        {article.excerptHtml && (
          <div
            className="line-clamp-2 text-sm text-ink-muted [&_p]:inline"
            // Summary is Shopify-sanitized HTML, same as product descriptions.
            dangerouslySetInnerHTML={{ __html: article.excerptHtml }}
          />
        )}
      </div>
    </article>
  );
}

export function ArticleGrid({ articles, className }: { articles: BlogArticle[]; className?: string }) {
  return (
    <ul className={cn('grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {articles.map((article, index) => (
        <li key={article.id}>
          <ArticleCard article={article} priority={index < 3} />
        </li>
      ))}
    </ul>
  );
}

export { formatArticleDate };
