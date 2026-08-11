'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { AlertIcon, ChevronDownIcon } from './icons';

/**
 * Form fields.
 *
 * Rules enforced here rather than left to each caller:
 *  - a visible label always exists (placeholders are never the label)
 *  - errors sit next to the field and are wired via aria-describedby
 *  - invalid fields set aria-invalid so assistive tech agrees with the visuals
 */

type FieldShellProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (ids: { describedBy: string | undefined; invalid: boolean }) => React.ReactNode;
};

function FieldShell({ id, label, hint, error, required, className, children }: FieldShellProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>

      {children({ describedBy, invalid: Boolean(error) })}

      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-center gap-1.5 text-xs font-medium text-danger">
          <AlertIcon size={14} className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

const CONTROL_BASE =
  'w-full rounded-md border bg-surface px-3.5 text-base text-ink transition-colors duration-150 ' +
  'placeholder:text-ink-subtle ' +
  'focus:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 ' +
  'disabled:cursor-not-allowed disabled:opacity-55';

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  inputClassName?: string;
};

export function Input({ id, label, hint, error, className, inputClassName, ...props }: InputProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={props.required} className={className}>
      {({ describedBy, invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(
            CONTROL_BASE,
            'h-11',
            invalid ? 'border-danger' : 'border-line-strong',
            inputClassName,
          )}
          {...props}
        />
      )}
    </FieldShell>
  );
}

export type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
};

export function Textarea({ id, label, hint, error, className, ...props }: TextareaProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={props.required} className={className}>
      {({ describedBy, invalid }) => (
        <textarea
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(CONTROL_BASE, 'min-h-24 py-2.5', invalid ? 'border-danger' : 'border-line-strong')}
          {...props}
        />
      )}
    </FieldShell>
  );
}

export type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className'> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  options: { value: string; label: string }[];
};

export function Select({ id, label, hint, error, className, options, ...props }: SelectProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={props.required} className={className}>
      {({ describedBy, invalid }) => (
        <div className="relative">
          <select
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(
              CONTROL_BASE,
              'h-11 appearance-none pr-10',
              invalid ? 'border-danger' : 'border-line-strong',
            )}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            size={16}
            className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-subtle"
          />
        </div>
      )}
    </FieldShell>
  );
}

/* ── Quantity stepper ──────────────────────────────────────────────────── */

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  label = 'Quantity',
  size = 'md',
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const clamp = (next: number) => Math.max(min, Math.min(max, next));
  const buttonSize = size === 'sm' ? 'size-9' : 'size-11';

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border border-line-strong bg-surface',
        disabled && 'opacity-55',
      )}
    >
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= min}
        aria-label={`Decrease ${label.toLowerCase()}`}
        className={cn(
          buttonSize,
          'grid place-items-center rounded-l-md text-ink transition-colors hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-40',
        )}
      >
        <span aria-hidden="true">−</span>
      </button>

      <span
        // A live region so screen readers hear the new quantity after a tap.
        aria-live="polite"
        aria-label={`${label}: ${value}`}
        className={cn(
          'min-w-9 text-center text-sm font-medium tabular-nums',
          size === 'sm' && 'min-w-8 text-xs',
        )}
      >
        {value}
      </span>

      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || value >= max}
        aria-label={`Increase ${label.toLowerCase()}`}
        className={cn(
          buttonSize,
          'grid place-items-center rounded-r-md text-ink transition-colors hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-40',
        )}
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}
