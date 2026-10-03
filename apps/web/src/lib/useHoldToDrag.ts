import { useEffect, useRef, type RefObject } from 'react';
import { hapticTick } from './haptics';

const HOLD_MS = 250; // how long a finger rests before a drag starts
const SLOP_PX = 8; // movement allowed during the hold; more than this is a scroll

interface HoldToDragOptions {
  enabled: boolean; // touch screens only; mouse dragging is handled by the component
  // The hold caught on `target`. Return false if it isn't something draggable (no drag starts).
  onHoldStart: (target: Element) => boolean;
  // The finger moved during a drag; `under` is whatever is beneath it now.
  onHoldMove?: (under: Element | null) => void;
  // A quick tap that never became a drag.
  onTap?: (target: Element) => void;
}

// Touch gesture for selecting in a grid without blocking scrolling:
// - swipe: scrolls the page as usual (the hold is abandoned once the finger moves);
// - tap: onTap;
// - rest the finger for 250ms: a haptic tick, then dragging selects (onHoldStart, onHoldMove)
//   and the page stops scrolling under the finger until it lifts.
// The component ends the drag on pointerup, as it does for the mouse.
export function useHoldToDrag(ref: RefObject<HTMLElement | null>, options: HoldToDragOptions) {
  // The latest callbacks, so listeners attached once always call the current ones.
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  const { enabled } = options;
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let press: { x: number; y: number; target: Element; id: number } | null = null;
    let holding = false;

    function reset() {
      clearTimeout(timer);
      press = null;
      holding = false;
    }

    function onPointerDown(e: PointerEvent) {
      // A second finger is ignored, so swapping fingers can't jump the selection.
      if (e.pointerType !== 'touch' || !e.isPrimary || press) return;
      press = { x: e.clientX, y: e.clientY, target: e.target as Element, id: e.pointerId };
      timer = setTimeout(() => {
        if (press && latest.current.onHoldStart(press.target)) {
          holding = true;
          hapticTick();
        } else {
          reset();
        }
      }, HOLD_MS);
    }

    function onPointerMove(e: PointerEvent) {
      if (!press || e.pointerId !== press.id) return;
      if (holding) {
        latest.current.onHoldMove?.(document.elementFromPoint(e.clientX, e.clientY));
      } else if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > SLOP_PX) {
        reset(); // it's a scroll
      }
    }

    function onPointerUp(e: PointerEvent) {
      if (!press || e.pointerId !== press.id) return;
      if (!holding) latest.current.onTap?.(press.target);
      reset();
    }

    // Once a drag has started, keep the page from scrolling under the finger. The first move
    // after a still hold can still be cancelled, so scrolling never begins.
    function onTouchMove(e: TouchEvent) {
      if (holding && e.cancelable) e.preventDefault();
    }

    // Long-pressing would otherwise open Android's context menu.
    function onContextMenu(e: Event) {
      if (press) e.preventDefault();
    }

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', reset);
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('contextmenu', onContextMenu);
    return () => {
      reset();
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', reset);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('contextmenu', onContextMenu);
    };
  }, [ref, enabled]);
}
