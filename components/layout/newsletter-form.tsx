"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";

/**
 * Newsletter capture.
 *
 * Deliberately posts to Shopify's own customer-account signup rather than
 * inventing a list: this app keeps no customer database. Until a marketing
 * provider is configured, the form links out instead of pretending to store
 * an address it has nowhere to put.
 */
export function NewsletterForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<"idle" | "error">("idle");
  const inputId = React.useId();

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
    if (!valid) {
      setState("error");
      return;
    }
    setState("idle");
    // Shopify's hosted account creation owns the consent + storage of this.
    router.push(
      `/account/login?intent=signup&email=${encodeURIComponent(email.trim())}`,
    );
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-2xs font-semibold tracking-[0.16em] text-ink-subtle uppercase"
      >
        Get first access
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (state === "error") setState("idle");
          }}
          placeholder="you@example.com"
          autoComplete="email"
          aria-invalid={state === "error" || undefined}
          aria-describedby={
            state === "error" ? `${inputId}-error` : `${inputId}-hint`
          }
          className="h-11 min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-3.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 aria-invalid:border-danger"
        />
        <Button type="submit" size="md">
          Join
        </Button>
      </div>
      {state === "error" ? (
        <p id={`${inputId}-error`} className="text-xs font-medium text-danger">
          Enter a valid email address.
        </p>
      ) : (
        <p
          id={`${inputId}-hint`}
          className="flex items-center gap-1.5 text-xs text-ink-subtle"
        >
          <CheckIcon size={13} />
          New arrivals and restocks. Unsubscribe anytime.
        </p>
      )}
    </form>
  );
}
