import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';

/**
 * Lenis smooth scroll, driven by GSAP's ticker so both share one rAF loop.
 * Mount once, near the root. Add `data-lenis-prevent` to inner scroll areas
 * (dialogs, the board, the AI drawer) so they keep native scrolling.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({ lerp: 0.1 });
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return null;
}
