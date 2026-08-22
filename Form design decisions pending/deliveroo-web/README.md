# Deliveroo — courier platform (React + Redux Toolkit)

Vite + React (JavaScript), Redux Toolkit for state, inline style objects kept 1:1 with the
approved design. Covers the whole customer journey — book, price, confirm, track — plus an
admin dispatch console.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Jest + React Testing Library
npm run build      # production bundle to dist/
```

Node 18+.

### Try the full journey

1. `/` → **Send a Package** → pick a pickup and destination (type 3+ characters, use the
   location button, or tap the map).
2. The route, distance and duration draw themselves; set a weight and watch the price update.
3. **Confirm Delivery** → sign in with any email or phone; the verification code is `000000`.
4. You land on the confirmation screen with an order number.
5. Open `/admin` in a second tab and sign in as `admin@deliveroo.co` (code `000000`). Change
   the order's status or drag the courier marker — **the tracking tab updates without a
   reload**.

## Data layer

There is no backend yet. `src/api/index.js` picks an implementation:

| `VITE_API_URL` | Implementation | Where data lives |
| --- | --- | --- |
| unset (default) | `src/api/mockBackend.js` | `localStorage` |
| set | `src/api/client.js` | Flask, via `/api/*` |

Both expose the same functions with the same shapes, so pointing at the real API is a
config change, not a rewrite. **Import from `src/api`, never from `mockBackend` or `client`
directly.** The endpoints the Flask side needs to expose are listed in `src/api/index.js`.

Cross-tab live updates come from `subscribe()`: the mock writes to `localStorage`, which
fires `storage` in other tabs, and dispatches a matching in-tab event. Swap it for SSE or a
websocket when the backend can push.

### Maps and geocoding

Photon (autocomplete) and OSRM (routing) via `src/api/geo.js` — free and keyless, chosen over
Google Maps so the project needs no billing account. Both are **public demo endpoints with
fair-use limits**; self-host or move to a paid provider before production. Only the two
`fetch` calls in that file need to change.

If OSRM is unreachable, `routeBetween` falls back to a straight line scaled by a detour
factor and flags the result `estimated: true`; the UI then labels the distance and price as
approximate rather than presenting a guess as measured.

## Structure

```
src/
  main.jsx            Provider + root render
  App.jsx             route table (AppRoutes is exported for tests)
  theme.js            colors, fonts, easings, status tones, form control styles
  routes/
    AppLayout         nav + footer + auth modal + toast + hash scrolling
    LandingPage       §2: Hero · Services · BookDelivery
    Confirmation      §13   TrackOrder §14   OrderDetails §15–17
    MyOrders §15      TrackLookup       AdminDashboard §18
  lib/
    pricing.js        quote() and the money/distance/duration formatters
    orderStatus.js    status vocabulary + the §16/§17 permission guards
    notifications.js  §19 templates and a local outbox (not surfaced in the UI)
  api/                index (selector) · mockBackend · client · geo · viteEnv
  store/              ui · auth · booking · orders
  hooks/              useScrollEffects · useReveal · useHover · useOrder · useOrderSync
  components/
    booking/          BookDelivery · PlaceSearch · RouteMap · StepShell · PriceCard · OrderSummary
    tracking/         EtaPanel · CourierCard · StatusTimeline
    auth/             AuthModal
    ui/               Button · Field · Chip · Modal · Toast
    Nav · MobileMenu · Hero · Services · SiteFooter · Wordmark · WorldMap · Icon · HoverLink
```

## Conventions worth keeping

**Styling is inline style objects.** No CSS modules, no Tailwind. `src/styles/global.css`
holds only what inline styles can't express: resets, `@keyframes`, focus rings, scrollbars.
Leaflet's stylesheet, imported in `main.jsx`, is the one third-party exception. Repeated
values live in `theme.js` — import them rather than retyping hexes.

**The palette is closed.** Order statuses reuse the existing nine colors via
`theme.statusTone`; don't add a traffic-light set.

**Hover and focus need JS**, since inline styles have no pseudo-classes. Use `<HoverLink>`,
`<Button>`, or the `useHover()` hook, and put the hover object in `theme.js`.

**Redux holds UI state and fetched data**, one slice per domain, `createAsyncThunk` calling
`src/api`. Selectors that build a new object or array must be `createSelector`-memoized —
`selectQuote` and `selectAllOrders` show the pattern.

**Responsive** is `clamp()` + flex/grid wrapping, no media queries. The `narrow` flag
(<980px) only switches the nav to the hamburger. Everything else reflows.

**The hero is fixed.** Its photo, crop maths, type and composition are approved and should
not be redesigned. The crop: the photo sits in a stage sized `width:max(100cqw,150cqh)` /
`height:max(100cqh,calc(100cqw / 1.5))`, reproducing `object-fit:cover` while keeping
image-percentage coordinates usable for pinned overlays. The negative `marginLeft` clamp
anchors the crop on the truck (27% across the image) so it stays framed on phones. Swapping
in a photo with a different aspect ratio means changing the `1.5` (width ÷ height) and the
`150cqh` (`1.5 × 100cqh`) to match.

**Icons** are Material Symbols ligatures via `<Icon name="arrow_outward" />`; the font is
loaded in `index.html`.

## Testing

Jest with jsdom and Babel (no ts-jest). `makeStore()` gives each test a fresh store:

```js
import { makeStore } from './store';
render(<Provider store={makeStore()}><MemoryRouter><Nav /></MemoryRouter></Provider>);
```

`jest.setup.cjs` stubs `IntersectionObserver`, `scrollTo` and `scrollIntoView`, which jsdom
lacks. Three `moduleNameMapper` entries matter:

- `viteEnv` → a stub, because Babel emits CJS for Jest and `import.meta` is a syntax error
  there. **That file is the only place `import.meta` may appear.**
- `react-leaflet` / `leaflet` → stubs, because Leaflet needs layout APIs jsdom doesn't have.

Full-app renders are slow, so `testTimeout` is 20s.

## Not included

Real payments, real email delivery (§19 is scaffolding only), Google sign-in, and courier-side
apps. Notification templates exist in `src/lib/notifications.js` and write to a local outbox,
ready to be pointed at a mail service.
