import { useEffect, useRef } from 'react';
import { subscribe } from '../api';

/**
 * Re-runs `onChange` whenever order data changes — including from another browser tab.
 * This is what makes an admin status update appear on the customer's tracking screen
 * without a reload (§18). The callback is held in a ref so callers can pass an inline
 * function without resubscribing on every render.
 */
export default function useOrderSync(onChange) {
  const handler = useRef(onChange);
  handler.current = onChange;

  useEffect(() => subscribe(() => handler.current?.()), []);
}
