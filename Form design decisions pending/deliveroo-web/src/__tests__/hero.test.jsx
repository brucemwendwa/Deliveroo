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

// §2 — the hero is a three-slide carousel over full-bleed photography.
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

  it('carries all three photos as cover images, one layer each', () => {
    const { container } = renderHero();
    const images = container.querySelectorAll('img');

    expect(images).toHaveLength(HERO_SLIDES.length);
    for (const image of images) {
      expect(image.style.objectFit).toBe('cover');
    }
    // Only the visible slide describes itself; the two behind it are decorative.
    expect([...images].filter((image) => image.alt !== '')).toHaveLength(1);
  });

  it('jumps to the slide an indicator names', async () => {
    renderHero();

    await userEvent.click(screen.getByRole('button', { name: /Show slide 3 of 3: Air Delivery/ }));

    expect(headline()).toBe('When speedmatters.');
    expect(screen.getByText('Get your parcels where they need to be, faster.')).toBeInTheDocument();
  });

  it('steps forward and wraps backwards on the arrows', async () => {
    renderHero();

    await userEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(headline()).toBe('Move more.Go further.');

    await userEvent.click(screen.getByRole('button', { name: 'Previous slide' }));
    await userEvent.click(screen.getByRole('button', { name: 'Previous slide' }));
    expect(headline()).toBe('When speedmatters.');
  });

  it('counts the slides for anyone who wants the position', async () => {
    renderHero();

    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('/ 03')).toBeInTheDocument();

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
      expect(headline()).toBe('Move more.Go further.');

      // Someone reading the slide stops the clock until they leave.
      act(() => {
        region.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      });
      act(() => {
        jest.advanceTimersByTime(SLIDE_MS * 3);
      });
      expect(headline()).toBe('Move more.Go further.');

      act(() => {
        region.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      });
      act(() => {
        jest.advanceTimersByTime(SLIDE_MS + 50);
      });
      expect(headline()).toBe('When speedmatters.');
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
    expect(screen.getByRole('button', { name: /Show slide 2 of 3: Sea Delivery/ })).toBeInTheDocument();
  });
});

// The three slides are content, not a lookup table — but a typo in one would ship a
// blank headline, so the shape is checked once.
describe('hero slide data', () => {
  it('gives every slide a photo, a label, a headline and copy', () => {
    expect(HERO_SLIDES).toHaveLength(3);
    for (const slide of HERO_SLIDES) {
      expect(slide.photo).toMatch(/^\/photos\/hero-.+\.(jpeg|jpg|webp|png)$/);
      expect(slide.label).toBeTruthy();
      expect(slide.alt).toBeTruthy();
      expect(slide.headline.length).toBeGreaterThan(0);
      expect(slide.copy).toBeTruthy();
    }
  });
});
