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
  it('shows the headline, the tagline and both CTAs — and no eyebrow', () => {
    renderHero();

    expect(headline()).toBe('From your door toanywhere on earth');
    expect(screen.queryByText('Moving Goods Worldwide')).not.toBeInTheDocument();
    expect(screen.getByText(HERO_COPY.body)).toBeInTheDocument();
    expect(screen.getByText('Request a Delivery')).toBeInTheDocument();
    // One CTA only: the explore pill is gone.
    expect(screen.queryByText('Explore Delivery Options')).not.toBeInTheDocument();
  });

  it('sends the primary CTA into the existing booking flow', () => {
    const { container } = renderHero();

    expect(container.querySelector('a[href="/book"]')).not.toBeNull();
    // It is the hero's only link — the modes-band pill was removed.
    expect(container.querySelector('a[href="/#modes"]')).toBeNull();
    expect(container.querySelectorAll('a')).toHaveLength(1);
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

  it('parks the CTA at the bottom left, below the copy', () => {
    const { container } = renderHero();
    const ctaRow = container.querySelector('a[href="/book"]').parentElement;

    expect(ctaRow.style.justifyContent).toBe('flex-start');
    // Last row of the content column, so it sits on the bottom padding edge.
    expect(ctaRow.parentElement.lastElementChild).toBe(ctaRow);
    // ...and below the copy, which is no longer its ancestor.
    expect(ctaRow.contains(container.querySelector('h1'))).toBe(false);
  });

  it('re-anchors the crop and keeps the CTA bottom left on a phone', () => {
    const store = makeStore();
    store.dispatch(setNarrow(true));
    const { container } = renderHero(store);

    expect(container.querySelector('img').style.objectPosition).toBe(HERO_PHOTO.focusNarrow);
    const ctaRow = container.querySelector('a[href="/book"]').parentElement;
    expect(ctaRow.style.justifyContent).toBe('flex-start');
    expect(ctaRow.parentElement.lastElementChild).toBe(ctaRow);
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

  it('gives the hero a headline and a tagline, and no eyebrow', () => {
    expect(HERO_COPY.headline.length).toBeGreaterThan(0);
    expect(HERO_COPY.body).toBeTruthy();
    expect(HERO_COPY.eyebrow).toBeUndefined();
  });
});
