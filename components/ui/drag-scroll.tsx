'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { useDragScroll } from '@/hooks/use-drag-scroll';

/**
 * A horizontal scroller that a mouse can drag.
 *
 * Exists as a component rather than only a hook so server components can opt
 * in without becoming client components themselves — the children stay
 * server-rendered and only this wrapper ships to the browser.
 *
 * `cursor-grab` is applied from `lg` up: it is a mouse affordance, and showing
 * a grab cursor on a touch device is meaningless.
 */
export function DragScroll<T extends 'div' | 'ul' | 'ol'>({
  as,
  className,
  children,
  ...props
}: { as?: T; className?: string; children: React.ReactNode } & Omit<
  React.ComponentPropsWithoutRef<T>,
  'className' | 'children'
>) {
  const ref = useDragScroll<HTMLElement>();
  const Tag = (as ?? 'div') as React.ElementType;

  return (
    <Tag
      ref={ref}
      className={cn('lg:cursor-grab', className)}
      {...(props as Record<string, unknown>)}
    >
      {children}
    </Tag>
  );
}
