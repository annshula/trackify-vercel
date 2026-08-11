import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { StarIcon, ChevronRightIcon } from './icons';
import { discountPercent, formatMoney } from '@/lib/utils/money';

/* ── Badge ─────────────────────────────────────────────────────────────── */

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'inverse';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunken text-ink-muted',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  inverse: 'bg-primary text-on-primary',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-2xs font-semibold tracking-wide uppercase',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── Price ─────────────────────────────────────────────────────────────── */

export function Price({
  amount,
  compareAt,
  currencyCode,
  size = 'md',
  className,
}: {
  amount: number;
  compareAt?: number | null;
  currencyCode: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const percent = discountPercent(amount, compareAt);
  const sizes = {
    sm: { price: 'text-sm', compare: 'text-xs' },
    md: { price: 'text-base', compare: 'text-sm' },
    lg: { price: 'text-2xl', compare: 'text-base' },
    // Editorial scale for the product page's headline price.
    xl: { price: 'text-3xl tracking-tight', compare: 'text-base' },
  }[size];

  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      <span className={cn('font-medium tabular-nums text-ink', sizes.price)}>
        {formatMoney(amount, currencyCode, { trimZeroCents: true })}
      </span>
      {percent !== null && compareAt ? (
        <>
          <span className={cn('tabular-nums text-ink-subtle line-through', sizes.compare)}>
            {formatMoney(compareAt, currencyCode, { trimZeroCents: true })}
          </span>
          <span className={cn('font-semibold text-danger', sizes.compare)}>−{percent}%</span>
          {/* Screen readers get the saving spelled out, not just a percentage. */}
          <span className="sr-only">
            , reduced from {formatMoney(compareAt, currencyCode)}, saving {percent} percent
          </span>
        </>
      ) : null}
    </span>
  );
}

/* ── Rating ────────────────────────────────────────────────────────────── */

export function Rating({
  value,
  count,
  size = 14,
  showValue = true,
  className,
}: {
  value: number;
  count?: number | null;
  size?: number;
  showValue?: boolean;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, value));
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="inline-flex text-accent" role="img" aria-label={`Rated ${clamped.toFixed(1)} out of 5`}>
        {[0, 1, 2, 3, 4].map((index) => (
          <StarIcon key={index} size={size} fillLevel={Math.max(0, Math.min(1, clamped - index))} />
        ))}
      </span>
      {showValue && <span className="text-xs font-medium text-ink-muted tabular-nums">{clamped.toFixed(1)}</span>}
      {typeof count === 'number' && count > 0 && (
        <span className="text-xs text-ink-subtle tabular-nums">({count})</span>
      )}
    </span>
  );
}

/* ── Skeleton ──────────────────────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-sm', className)} aria-hidden="true" />;
}

/* ── Section heading ───────────────────────────────────────────────────── */

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = 'left',
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' && 'sm:flex-col sm:items-center sm:text-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow && (
          <p className="mb-2 text-2xs font-semibold tracking-[0.18em] text-accent uppercase">{eyebrow}</p>
        )}
        <h2 className="text-2xl sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 text-sm text-ink-muted sm:text-base">{description}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-1 self-start text-sm font-medium text-ink underline-offset-4 hover:underline sm:self-auto"
        >
          {action.label}
          <ChevronRightIcon size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

/* ── Empty state ───────────────────────────────────────────────────────── */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-16 text-center sm:py-24', className)}>
      {icon && (
        <div className="mb-5 grid size-14 place-items-center rounded-full bg-surface-sunken text-ink-subtle">
          {icon}
        </div>
      )}
      <h2 className="text-xl">{title}</h2>
      {description && <p className="mt-2 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}

/* ── Breadcrumb ────────────────────────────────────────────────────────── */

export function Breadcrumb({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="hide-scrollbar flex items-center gap-1 overflow-x-auto text-xs whitespace-nowrap text-ink-subtle">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && <ChevronRightIcon size={13} className="shrink-0 opacity-50" />}
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-ink hover:underline underline-offset-4">
                  {item.label}
                </Link>
              ) : (
                <span className={cn(isLast && 'font-medium text-ink-muted')} aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ── Alert ─────────────────────────────────────────────────────────────── */

export function Alert({
  tone = 'warning',
  title,
  children,
  icon,
  className,
}: {
  tone?: 'warning' | 'danger' | 'success' | 'info';
  title?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  const tones = {
    warning: 'bg-warning-soft text-warning border-warning/25',
    danger: 'bg-danger-soft text-danger border-danger/25',
    success: 'bg-success-soft text-success border-success/25',
    info: 'bg-surface-sunken text-ink-muted border-line',
  } as const;

  return (
    <div
      // Errors interrupt; everything else waits for a pause in speech.
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-md border px-4 py-3 text-sm', tones[tone], className)}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
      </div>
    </div>
  );
}

/* ── Divider ───────────────────────────────────────────────────────────── */

export function Divider({ className, label }: { className?: string; label?: string }) {
  if (!label) return <hr className={cn('border-line', className)} />;
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <hr className="flex-1 border-line" />
      <span className="text-2xs font-semibold tracking-[0.16em] text-ink-subtle uppercase">{label}</span>
      <hr className="flex-1 border-line" />
    </div>
  );
}
