import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loadSession } from '../store/authSlice';
import { seedIfEmpty } from '../api';
import { color, font } from '../theme';
import Nav from '../components/Nav';
import MobileMenu from '../components/MobileMenu';
import SiteFooter from '../components/SiteFooter';
import GooFilter from '../components/GooFilter';
import AuthModal from '../components/auth/AuthModal';
import Toast from '../components/ui/Toast';

/** Anchor links carry a hash across routes; this does the scrolling on arrival. */
function ScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    // Wait a frame so the target section exists after a route change.
    const timer = setTimeout(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
    return () => clearTimeout(timer);
  }, [pathname, hash]);

  return null;
}

export default function AppLayout() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadSession());
    seedIfEmpty();
  }, [dispatch]);

  return (
    <div style={{ background: color.paper, fontFamily: font.body, color: color.inkSoft, overflowX: 'hidden' }}>
      <GooFilter />
      <ScrollToHash />
      <Nav />
      <MobileMenu />
      <Outlet />
      <SiteFooter brand="Deliveroo" />
      <AuthModal />
      <Toast />
    </div>
  );
}
