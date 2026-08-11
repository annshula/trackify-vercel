'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { AlertIcon, CheckIcon, CloseIcon } from './icons';

/**
 * Toast notifications.
 *
 * Rendered in a polite live region so a screen reader announces the message
 * without stealing focus; errors escalate to assertive. Toasts never carry the
 * only copy of an important message — they confirm, they do not inform.
 */

export type ToastTone = 'success' | 'error' | 'info';

export type Toast = {
  id: string;
  tone: ToastTone;
  message: string;
  action?: { label: string; href: string };
};

type ToastContextValue = {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

const DURATION_MS = 4500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const timers = React.useRef(new Map<string, number>());

  const dismiss = React.useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = React.useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      // Cap the stack so a burst of actions cannot cover the screen.
      setToasts((current) => [...current.slice(-2), { ...toast, id }]);
      timers.current.set(id, window.setTimeout(() => dismiss(id), DURATION_MS));
    },
    [dismiss],
  );

  React.useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) window.clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const value = React.useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div
      // Sits above the mobile bottom bar so it never hides the primary nav.
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 sm:items-end sm:px-6 sm:pb-0"
    >
      <div aria-live="polite" aria-atomic="false" className="sr-only">
        {toasts.filter((toast) => toast.tone !== 'error').map((toast) => (
          <p key={toast.id}>{toast.message}</p>
        ))}
      </div>
      <div aria-live="assertive" aria-atomic="false" className="sr-only">
        {toasts.filter((toast) => toast.tone === 'error').map((toast) => (
          <p key={toast.id}>{toast.message}</p>
        ))}
      </div>

      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex w-full max-w-sm animate-fade-up items-center gap-3 rounded-md border px-4 py-3 shadow-e3',
            toast.tone === 'error'
              ? 'border-danger/30 bg-danger-soft text-danger'
              : 'border-line bg-surface-raised text-ink',
          )}
        >
          <span
            className={cn(
              'grid size-6 shrink-0 place-items-center rounded-full',
              toast.tone === 'error' ? 'bg-danger text-white' : 'bg-success text-white',
            )}
            aria-hidden="true"
          >
            {toast.tone === 'error' ? <AlertIcon size={14} /> : <CheckIcon size={14} />}
          </span>

          <p className="min-w-0 flex-1 text-sm font-medium">{toast.message}</p>

          {toast.action && (
            <a
              href={toast.action.href}
              className="shrink-0 text-sm font-semibold underline underline-offset-4"
            >
              {toast.action.label}
            </a>
          )}

          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="-mr-1 grid size-8 shrink-0 place-items-center rounded-sm opacity-60 transition-opacity hover:opacity-100"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
