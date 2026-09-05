import { useEffect, useState } from 'react';

/**
 * True when the visitor has asked for less movement. global.css already flattens the
 * keyframes; this is for the motion CSS cannot reach — chiefly the hero carousel
 * advancing on its own, which stops rather than flickers through slides instantly.
 *
 * jsdom has no matchMedia, so the guard is load-bearing for the test suite.
 */
export default function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener?.('change', sync);
    return () => query.removeEventListener?.('change', sync);
  }, []);

  return reduced;
}
