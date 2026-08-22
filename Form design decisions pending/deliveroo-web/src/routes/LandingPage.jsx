import useScrollEffects from '../hooks/useScrollEffects';
import useReveal from '../hooks/useReveal';
import Hero from '../components/Hero';
import Services from '../components/Services';

// Hero, services, footer. Booking used to sit here as a fourth section; it now has
// its own route (/book) so the CTAs navigate rather than scroll. The footer lives in
// AppLayout because every route shares it.
export default function LandingPage() {
  useScrollEffects({ parallax: true });
  useReveal(true);

  return (
    <>
      <Hero />
      <Services />
    </>
  );
}
