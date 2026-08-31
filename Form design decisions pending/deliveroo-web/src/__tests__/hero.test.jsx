import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeStore } from '../store';
import Hero, { HERO_COPY, HERO_PHOTO } from '../components/Hero';
import { setNarrow } from '../store/uiSlice';

const renderHero = (store = makeStore()) => ({
  store,
  ...render(
    <Provider store={store}>
      <MemoryRouter>
        <Hero />
      </MemoryRouter>
    </Provider>
  )
});

const headline = () => screen.getByRole('heading', { level: 1 }).textContent;

// §2 — the hero is a single full-bleed photograph with one set of words over it.
describe('hero', () => {
  it('shows the eyebrow, the headline, the copy and both CTAs', () => {
    renderHero();

    expect(screen.getByText(HERO_COPY.eyebrow)).toBeInTheDocument();
    expect(headline()).toBe('The future ofdelivery is here');
    expect(screen.getByText(HERO_COPY.body)).toBeInTheDocument();
    expect(screen.getByText('Request a Delivery')).toBeInTheDocument();
    expect(screen.getByText('Explore Delivery Options')).toBeInTheDocument();
  });

  it('sends the primary CTA into the existing booking flow', () => {
    const { container } = renderHero();

    expect(container.querySelector('a[href="/book"]')).not.toBeNull();
    // The secondary one goes to the modes band, which is the list of options.
    expect(container.querySelector('a[href="/#modes"]')).not.toBeNull();
  });

  it('carries exactly one photograph, as a described cover image', () => {
    const { container } = renderHero();
    const images = container.querySelectorAll('img');

    expect(images).toHaveLength(1);
    expect(images[0].getAttribute('src')).toBe(HERO_PHOTO.src);
    expect(images[0].style.objectFit).toBe('cover');
    expect(images[0].alt).toBe(HERO_PHOTO.alt);
  });

  it('carries no carousel furniture — no mode tabs, arrows or slide count', () => {
    renderHero();

    for (const tab of ['Drone', 'Moto', 'Road', 'Air', 'Sea']) {
      expect(screen.queryByText(tab)).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Next slide' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Previous slide' })).not.toBeInTheDocument();
    expect(screen.queryByText('/ 05')).not.toBeInTheDocument();
  });

  it('re-anchors the crop and stacks the CTAs on a phone', () => {
    const store = makeStore();
    store.dispatch(setNarrow(true));
    const { container } = renderHero(store);

    expect(container.querySelector('img').style.objectPosition).toBe(HERO_PHOTO.focusNarrow);
    const ctaRow = container.querySelector('a[href="/book"]').parentElement;
    expect(ctaRow.style.flexDirection).toBe('column');
  });
});

// The words are content, not a lookup table — but a typo in one would ship a blank
// headline, so the shape is checked once.
describe('hero content', () => {
  it('names one photograph, with alt text and both crop anchors', () => {
    expect(HERO_PHOTO.src).toMatch(/^\/photos\/hero-.+\.(jpeg|jpg|webp|png)$/);
    expect(HERO_PHOTO.alt).toBeTruthy();
    expect(HERO_PHOTO.focus).toBeTruthy();
    expect(HERO_PHOTO.focusNarrow).toBeTruthy();
  });

  it('gives the hero an eyebrow, a headline and copy', () => {
    expect(HERO_COPY.eyebrow).toBeTruthy();
    expect(HERO_COPY.headline.length).toBeGreaterThan(0);
    expect(HERO_COPY.body).toBeTruthy();
  });
});
