import { useEffect, useState } from 'react';

/**
 * A clock that re-renders on an interval. Tracking derives progress, the ETA and the
 * distance left from how long the parcel has been moving, so without this the screen
 * would sit still between admin updates and the countdown would never count.
 */
export default function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
