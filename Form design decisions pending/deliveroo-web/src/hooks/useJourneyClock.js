import { useEffect, useState } from 'react';

/**
 * A clock for the moving vehicle marker (§25).
 *
 * useNow ticks every 20–30 seconds, which is right for an ETA and useless for motion:
 * the marker would jump across a block and then sit still. This runs off animation
 * frames instead, throttled to something a map marker cannot tell apart from 60fps but
 * that costs a fraction of the renders.
 *
 * When the journey is not moving — or the visitor has asked for less of it — it falls
 * back to a slow interval. The marker still lands in the right place, it simply gets
 * there without the glide.
 */
const FRAME_MS = 120;
const RESTING_MS = 15_000;

export default function useJourneyClock(running) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const still =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!running || still) {
      const timer = setInterval(() => setNow(Date.now()), RESTING_MS);
      return () => clearInterval(timer);
    }

    let frame;
    let painted = 0;
    const tick = (time) => {
      frame = requestAnimationFrame(tick);
      if (time - painted < FRAME_MS) return;
      painted = time;
      setNow(Date.now());
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  return now;
}
