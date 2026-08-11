import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'accent' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover active:scale-[0.985]',
  accent: 'bg-accent text-on-accent hover:bg-accent-hover active:scale-[0.985]',
  secondary: 'bg-surface-sunken text-ink hover:bg-line active:scale-[0.985]',
  outline:
    'border border-line-strong bg-transparent text-ink hover:bg-surface-sunken active:scale-[0.985]',
  ghost: 'bg-transparent text-ink hover:bg-surface-sunken',
  danger: 'bg-danger text-white hover:opacity-90 active:scale-[0.985]',
};

/* Every size clears the 44px minimum touch target except `sm`, which is only
   used inside an already-large tap area (e.g. a card that is itself a link). */
const SIZES: Record<Size, string> = {
  sm: 'h-9 gap-1.5 rounded-sm px-3.5 text-sm',
  md: 'h-11 gap-2 rounded-md px-5 text-sm',
  lg: 'h-13 gap-2.5 rounded-md px-7 text-base',
  icon: 'size-11 rounded-md',
};

const BASE =
  'relative inline-flex items-center justify-center font-medium tracking-tight ' +
  'transition-[background-color,color,transform,opacity,box-shadow] duration-200 ease-out-soft ' +
  'select-none whitespace-nowrap ' +
  'disabled:pointer-events-none disabled:opacity-45 ' +
  'aria-disabled:pointer-events-none aria-disabled:opacity-45';

type CommonProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export type ButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'>;

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      // Announce the pending state instead of silently swapping the label.
      aria-busy={loading || undefined}
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {loading && <Spinner />}
      <span className={cn('inline-flex items-center gap-2', loading && 'opacity-0')}>{children}</span>
    </button>
  );
}

export type ButtonLinkProps = CommonProps &
  Omit<React.ComponentProps<typeof Link>, 'children' | 'className'>;

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)} {...props}>
      {children}
    </Link>
  );
}

function Spinner() {
  return (
    <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="size-4 animate-spin" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}
