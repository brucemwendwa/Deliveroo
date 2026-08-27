import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeStore } from '../store';
import Hero, { HERO_SLIDES, SLIDE_MS } from '../components/Hero';
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

// §2 — the hero is a five-slide carousel over full-bleed photography.
describe('hero carousel', () => {
  it('shows the drone slide first, with the label, copy and both CTAs', () => {
    renderHero();

    expect(screen.getByText('Drone Delivery')).toBeInTheDocument();
    expect(headline()).toBe('The future ofdelivery is here');
    expect(screen.getByText('Fast, intelligent delivery for a connected world.')).toBeInTheDocument();
    expect(screen.getByText('Request a Delivery')).toBeInTheDocument();
    expect(screen.getByText('Explore Delivery Options')).toBeInTheDocument();
  });

  it('sends the primary CTA into the existing booking flow', () => {
    const { container } = renderHero();

    expect(container.querySelector('a[href="/book"]')).not.toBeNull();
    // The secondary one goes to the modes band, which is the list of options.
    expect(container.querySelector('a[href="/#modes"]')).not.toBeNull();
  });

  it('carries every photo as a cover image, one layer each', () => {
    const { container } = renderHero();
    const images = container.querySelectorAll('img');

    expect(images).toHaveLength(HERO_SLIDES.length);
    for (const image of images) {
      expect(image.style.objectFit).toBe('cover');
    }
    // Only the visible slide describes itself; the ones behind it are decorative.
    expect([...images].filter((image) => image.alt !== '')).toHaveLength(1);
  });

  it('jumps to the slide an indicator names', async () => {
    renderHero();

    await userEvent.click(screen.getByRole('button', { name: /Show slide 4 of 5: Air Delivery/ }));

    expect(headline()).toBe('When speedmatters.');
    expect(screen.getByText('Get your parcels where they need to be, faster.')).toBeInTheDocument();
  });

  it('carries the motorbike slide, its notes and its own side of the frame', async () => {
    const { container } = renderHero();

    await userEvent.click(screen.getByRole('button', { name: /Show slide 2 of 5: Motorbike Delivery/ }));

    expect(headline()).toBe('Fast. Local.At your door.');
    expect(screen.getByText(/Request a rider and we/)).toBeInTheDocument();
    // The at-a-glance chip the other slides do not carry.
    expect(screen.getByText('Motorbike')).toBeInTheDocument();
    expect(screen.getByText('Fast local delivery')).toBeInTheDocument();
    expect(screen.getByText(/ETA ~20/)).toBeInTheDocument();

    // The rider owns the left of that photo, so the copy sits on the right instead.
    const copy = container.querySelector('h1').parentElement;
    expect(copy.style.marginLeft).toBe('auto');
  });

  it('steps forward and wraps backwards on the arrows', async () => {
    renderHero();

    await userEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(headline()).toBe('Fast. Local.At your door.');

    await userEvent.click(screen.getByRole('button', { name: 'Previous slide' }));
    await userEvent.click(screen.getByRole('button', { name: 'Previous slide' }));
    expect(headline()).toBe('Move more.Go further.');
  });

  it('counts the slides for anyone who wants the position', async () => {
    renderHero();

    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('/ 05')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(screen.getByText('02')).toBeInTheDocument();
  });

  it('advances on its own, and holds while the pointer is on it', () => {
    jest.useFakeTimers();
    try {
      const { container } = renderHero();
      const region = container.querySelector('[aria-roledescription="carousel"]');

      act(() => {
        jest.advanceTimersByTime(SLIDE_MS + 50);
      });
      expect(headline()).toBe('Fast. Local.At your door.');

      // Someone reading the slide stops the clock until they leave.
      act(() => {
        region.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      });
      act(() => {
        jest.advanceTimersByTime(SLIDE_MS * 3);
      });
      expect(headline()).toBe('Fast. Local.At your door.');

      act(() => {
        region.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      });
      act(() => {
        jest.advanceTimersByTime(SLIDE_MS + 50);
      });
      expect(headline()).toBe('Every parcel.Every route.');
    } finally {
      jest.useRealTimers();
    }
  });

  it('stacks the CTAs and drops the arrows on a phone', () => {
    const store = makeStore();
    store.dispatch(setNarrow(true));
    renderHero(store);

    expect(screen.queryByRole('button', { name: 'Next slide' })).not.toBeInTheDocument();
    // The indicators stay: they are the only way through the slides on touch, short
    // of the swipe.
    expect(screen.getByRole('button', { name: /Show slide 5 of 5: Sea Delivery/ })).toBeInTheDocument();
  });
});

// The slides are content, not a lookup table — but a typo in one would ship a blank
// headline, so the shape is checked once.
describe('hero slide data', () => {
  it('plays drone, motorbike, road, air, sea — and gives each one a photo and words', () => {
    expect(HERO_SLIDES.map((slide) => slide.id)).toEqual(['DRONE', 'MOTORBIKE', 'ROAD', 'AIR', 'SHIP']);
  });

  it('gives every slide a photo, a label, a headline and copy', () => {
    expect(HERO_SLIDES).toHaveLength(5);
    for (const slide of HERO_SLIDES) {
      expect(slide.photo).toMatch(/^\/photos\/hero-.+\.(jpeg|jpg|webp|png)$/);
      expect(slide.label).toBeTruthy();
      expect(slide.alt).toBeTruthy();
      expect(slide.headline.length).toBeGreaterThan(0);
      expect(slide.copy).toBeTruthy();
    }
  });
});
