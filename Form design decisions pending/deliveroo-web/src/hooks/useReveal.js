import { useEffect } from 'react';
import { ease } from '../theme';

/**
 * Fades + lifts every [data-reveal] element into place once as it enters the
 * viewport. Anything already on screen at mount is left visible.
 */
export default function useReveal(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof IntersectionObserver !== 'function') return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'none';
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px' }
    );

    for (const el of document.querySelectorAll('[data-reveal]')) {
      el.style.transition = `opacity .85s ${ease.out}, transform .85s ${ease.out}`;
      el.style.transitionDelay = el.dataset.revealDelay || '0ms';
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) continue;
      el.style.opacity = '0';
      el.style.transform = 'translateY(22px)';
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [enabled]);
}
