import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setNarrow, setScrolled } from '../store/uiSlice';

const BREAKPOINT = 980;

/**
 * Owns the two pieces of scroll/viewport state the layout reacts to, plus the
 * parallax transforms. Elements opt into parallax with data-parallax="0.02"
 * (the number is the shift factor); the element is moved within its parent,
 * clamped so its edges never enter the frame.
 */
export default function useScrollEffects({ parallax = true } = {}) {
  const dispatch = useDispatch();

  useEffect(() => {
    const onResize = () => dispatch(setNarrow(window.innerWidth < BREAKPOINT));
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [dispatch]);

  useEffect(() => {
    const layers = Array.from(document.querySelectorAll('[data-parallax]'));
    let frame = 0;
    let lastScrolled = null;

    const tick = () => {
      frame = 0;
      const top = document.getElementById('top');
      const probeTop = top ? top.getBoundingClientRect().top : -(window.scrollY || 0);
      const isScrolled = probeTop < -24;
      if (isScrolled !== lastScrolled) {
        lastScrolled = isScrolled;
        dispatch(setScrolled(isScrolled));
      }
      if (!parallax) return;
      const vh = window.innerHeight;
      for (const el of layers) {
        const rect = el.getBoundingClientRect();
        const speed = parseFloat(el.dataset.parallax) || 0.1;
        const frameHeight = el.parentElement ? el.parentElement.offsetHeight : rect.height;
        const max = Math.max(0, (el.offsetHeight - frameHeight) / 2 - 1);
        let offset = (rect.top + rect.height / 2 - vh / 2) * -speed;
        offset = Math.max(-max, Math.min(max, offset));
        el.style.transform = `translate3d(0,${offset.toFixed(1)}px,0)`;
      }
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(tick);
    };

    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [dispatch, parallax]);
}
