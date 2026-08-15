'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { LinkIcon, CheckIcon } from '@/components/ui/icons';

/** Copies the current article URL — the lightest possible "share" affordance. */
export function CopyLinkButton({ url, className }: { url: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard access can be denied — the button simply stays in its default state.
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink',
        className,
      )}
    >
      {copied ? <CheckIcon size={14} className="text-accent" /> : <LinkIcon size={14} />}
      {copied ? 'Copied' : 'Copy link'}
    </button>
  );
}
