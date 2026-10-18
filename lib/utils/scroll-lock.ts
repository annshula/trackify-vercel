"use client";

import { useEffect } from "react";

/**
 * One scroll lock for every overlay. Locks are counted, so closing one overlay
 * while another is still open never releases the page early; scrolling resumes
 * only when the last lock goes. The scrollbar's width is reserved so the page
 * (and the fixed header) don't jump sideways when it disappears.
 */

let locks = 0;
let restore: { overflow: string; paddingRight: string } | null = null;

function lock() {
  locks += 1;
  if (locks > 1) return;
  const root = document.documentElement;
  const scrollbar = window.innerWidth - root.clientWidth;
  restore = {
    overflow: document.body.style.overflow,
    paddingRight: document.body.style.paddingRight,
  };
  root.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
}

function unlock() {
  locks = Math.max(0, locks - 1);
  if (locks > 0) return;
  document.documentElement.style.overflow = "";
  document.body.style.overflow = restore?.overflow ?? "";
  document.body.style.paddingRight = restore?.paddingRight ?? "";
  restore = null;
}

/** Freezes the page while `active`; released by the effect cleanup on close or unmount. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
