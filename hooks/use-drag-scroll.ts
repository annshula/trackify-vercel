'use client';

import * as React from 'react';

/**
 * Click-and-drag horizontal scrolling.
 *
 * Mouse only, by design. Touch and trackpad already scroll these containers
 * natively with momentum and rubber-banding; hijacking pointer events there
 * would replace good platform behaviour with a worse imitation. This exists
 * purely because a mouse has no horizontal gesture — a desktop user otherwise
 * has to find a scrollbar or hold Shift.
 *
 * Handles the three things a naive implementation gets wrong:
 *  - a drag that ends on a link must not navigate (click is swallowed once)
 *  - CSS scroll-snap fights a manual scrollLeft, so it is suspended mid-drag
 *  - text selection during the drag is suppressed, then restored
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let dragging = false;
    let startX = 0;
    let startScrollLeft = 0;
    let travelled = 0;
    let snapBefore = '';

    // Past this many pixels the gesture counts as a drag rather than a click.
    const DRAG_THRESHOLD = 4;

    const isScrollable = () => element.scrollWidth > element.clientWidth + 1;

    const onPointerDown = (event: PointerEvent) => {
      // Left button, real mouse, and only when there is somewhere to scroll.
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      if (!isScrollable()) return;

      dragging = true;
      travelled = 0;
      startX = event.clientX;
      startScrollLeft = element.scrollLeft;

      // Snap points quantise scrollLeft, which makes a drag feel like it is
      // sticking. Suspend snapping for the duration of the gesture.
      snapBefore = element.style.scrollSnapType;
      element.style.scrollSnapType = 'none';
      element.style.cursor = 'grabbing';
      element.style.userSelect = 'none';
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;

      const delta = event.clientX - startX;
      if (Math.abs(delta) > travelled) travelled = Math.abs(delta);

      // Capture the pointer only once the gesture is definitely a drag, so a
      // plain click still reaches the link or button underneath.
      if (travelled > DRAG_THRESHOLD && !element.hasPointerCapture(event.pointerId)) {
        element.setPointerCapture(event.pointerId);
      }

      element.scrollLeft = startScrollLeft - delta;
    };

    const endDrag = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;

      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }

      element.style.scrollSnapType = snapBefore;
      element.style.cursor = '';
      element.style.userSelect = '';
    };

    // Capture phase: swallow the click a drag would otherwise deliver to
    // whichever card happened to be under the cursor when the mouse came up.
    const onClickCapture = (event: MouseEvent) => {
      if (travelled <= DRAG_THRESHOLD) return;
      event.preventDefault();
      event.stopPropagation();
      travelled = 0;
    };

    // Suppress the native image/link drag so the browser does not start its own
    // drag-and-drop halfway through the gesture.
    const onDragStart = (event: DragEvent) => {
      if (dragging) event.preventDefault();
    };

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', endDrag);
    element.addEventListener('pointercancel', endDrag);
    element.addEventListener('click', onClickCapture, true);
    element.addEventListener('dragstart', onDragStart);

    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', endDrag);
      element.removeEventListener('pointercancel', endDrag);
      element.removeEventListener('click', onClickCapture, true);
      element.removeEventListener('dragstart', onDragStart);
    };
  }, []);

  return ref;
}
