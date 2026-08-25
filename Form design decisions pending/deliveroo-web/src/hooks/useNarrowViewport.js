import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setNarrow } from '../store/uiSlice';

/** Below this the nav collapses to the hamburger and the bottom bar appears. */
export const BREAKPOINT = 980;

/**
 * Tracks the one viewport question the layout asks. It lives in AppLayout rather than
 * on the landing page, because the hamburger and the bottom navigation are needed on
 * every route — not only the one that happens to run the parallax.
 */
export default function useNarrowViewport() {
  const dispatch = useDispatch();

  useEffect(() => {
    const onResize = () => dispatch(setNarrow(window.innerWidth < BREAKPOINT));
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [dispatch]);
}
