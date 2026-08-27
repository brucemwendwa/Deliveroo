# Deliveroo — on-demand multi-modal delivery (React + Redux Toolkit)

Vite + React (JavaScript), Redux Toolkit for state, inline style objects kept 1:1 with the
approved design.

Tell Deliveroo where to collect a parcel and where it's going; it works out how it travels —
**motorbike, road, air, sea or drone** — what each option costs, and how long each takes, then
sends a rider or an agent to come and get it.

```
WHERE? → WHAT? → HOW? → PRICE → REQUEST PICKUP → AGENT ASSIGNED → PICKED UP → TRANSPORTING → TRACK → DELIVERED
```

Covers the whole customer journey — request, price, dispatch, track — plus an admin dispatch
console with transport availability.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Jest + React Testing Library
npm run build      # production bundle to dist/
```

Node 18+.

### Try the full journey

1. `/` → **Request a delivery** → pick a pickup and destination (type 3+ characters, use the
   location button, or tap the map).
2. The route, distance and duration draw themselves. Say what you're sending — weight, type,
   optionally dimensions.
3. **Choose how it travels.** Four cards, priced live against this route and this parcel.
   Anything that can't serve the route is disabled *and says why* ("Sea freight starts at
   200 km"). Try Nairobi → Westlands (motorbike, road, drone) against Nairobi → Mombasa
   (road, air, sea).
4. **Request Pickup — KES x** → sign in with any email or phone; the verification code is
   `000000`.
5. The confirmation screen goes looking for an agent, then shows who is coming, in what, how
   far out and their ETA. **Track pickup** opens the live map.
6. Open `/admin` in a second tab and sign in as `admin@deliveroo.co` (code `000000`). Change
   the order's status, drag the vehicle marker, or set where the parcel currently is — **the
   tracking tab updates without a reload**. Take drone capacity offline and it disappears from
   the customer's options.

## Multi-modal transport (`src/lib/transport.js`)

One pure module owns the catalogue: what can carry a parcel, whether it may carry it on a
given route, what it costs and how long it takes. `pricing.js` imports it — never the other
way round.

| Mode | Base | Per km | Per kg | Floor | Eligible when |
| --- | --- | --- | --- | --- | --- |
| 🚐 Road | — | 40 (first 50 km), then 6 | 50 | 200 | route ≤ 1,500 km, ≤ 2,000 kg |
| 🏍️ Motorbike | 60 | 28 | 22 | 150 | route ≤ 45 km, ≤ 20 kg, ≤ 70 cm longest side |
| ✈️ Air | 1,500 | 11 | 240 | 2,000 | route ≥ 120 km, ≤ 250 kg |
| 🚢 Ship | 900 | 4.5 | 28 | 1,400 | route ≥ 200 km **and** one end within 90 km of a port |
| 🚁 Drone | 350 | 60 | 110 | 700 | route ≤ 30 km, ≤ 5 kg, ≤ 45 cm longest side |

Road keeps the tariff the app has always charged, so **every existing quote is unchanged** —
`quote({ weightKg: 3, distanceKm: 12.4 })` is still KES 650. It gains one thing: a line-haul
band, because 40/km is a cross-town rate and absurd over 400 km.

Motorbike is the other road-network vehicle and undercuts the van on every count that matters
in a city — less fuel, one rider, no loading bay — so a small local parcel defaults to it: the
same 12.4 km hop is KES 480 rather than 650, and twenty minutes quicker. It takes a
flag-fall like any other on-demand ride, and it is capped hard on distance, weight and bulk,
because past roughly an hour in the saddle a parcel belongs in a van.

The other three are flat per-km shared-capacity freight, which is why sea undercuts road over
distance while taking a day, and air costs multiples of both.

Other rules that live here:

- **Priority** is a multiplier pair (`STANDARD`, `EXPRESS` at ×1.45 price, ×0.72 time), applied
  to whichever vehicle was chosen rather than being a tariff of its own.
- **Volumetric weight** (L×W×H ÷ 5000) — a big light parcel is charged on the space it takes,
  and dimensions are what tell us a drone can't take it.
- **Duration** is time in motion plus each mode's handling at either end. Road and motorbike
  prefer OSRM's measured driving time — the bike then scales it by a traffic factor, because it
  filters past the queue the van joins — while a flight does not care how long the drive would
  have been.
- **The word for the person collecting the parcel follows the vehicle** (`agentNoun`): a
  motorbike delivery sends a *rider*, everything else a *pickup agent*. The dispatch screen, the
  tracking timeline, the console and the notifications all read that one definition.
- **Ineligible modes come back with a reason**, never dropped. §25: a greyed-out card with no
  explanation is a dead end.
- **Availability** (`FLEET_STATUS`) — the console can mark a mode Available / Busy / Offline.
  Offline withdraws it from quotes; Busy still books but adds to the ETA.

## The journey, in two levels of detail

`STATUS` is unchanged — `PENDING → ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED`, plus
`CANCELLED`. What a customer watching a parcel wants is finer than that, so `journeyStages()`
*derives* seven rows (requested, agent assigned, picked up, dispatched, in transit, arriving,
delivered) from the status and how far through the journey the parcel is. One vocabulary for
the API, one for the human. `progressFor()` moves with the clock once a parcel is in transit,
which is what makes the ETA count down and the timeline reach "Arriving" on its own.

## Data layer

There is no backend yet. `src/api/index.js` picks an implementation:

| `VITE_API_URL` | Implementation | Where data lives |
| --- | --- | --- |
| unset (default) | `src/api/mockBackend.js` | `localStorage` |
| set | `src/api/client.js` | Flask, via `/api/*` |

Both expose the same functions with the same shapes, so pointing at the real API is a
config change, not a rewrite. **Import from `src/api`, never from `mockBackend` or `client`
directly.** The endpoints the Flask side needs to expose are listed in `src/api/index.js`.

### What the backend has to add for multi-modal

Three new endpoints and three new fields. Nothing existing changes shape.

| Endpoint | Purpose |
| --- | --- |
| `POST /orders/:id/assign` | Dispatch matches a pickup agent. **Must be idempotent** — the confirmation screen may retry, and two tabs may both ask. Returns the order with `courier` attached and status `ASSIGNED`; an order that has already moved on comes back untouched. |
| `PATCH /orders/:id/location` | Staff-only. `{ label, lat, lng }` → where the parcel is *in words*. |
| `GET /transport/availability` · `PATCH /admin/transport/availability` | Read/write a status per mode — `AVAILABLE`, `BUSY` or `OFFLINE`. The PATCH is staff-only. |

New fields on an order:

```jsonc
{
  "transport": { "mode": "AIR", "priority": "STANDARD" },   // absent ⇒ road/standard
  "presentLocation": { "label": "Voi", "lat": …, "lng": …, "at": "…" } | null,
  "parcel": { "packageType": "ELECTRONICS", "lengthCm": 40, "widthCm": 30, "heightCm": 20, … },
  "courier": { "plate": "KDA 123A", "rating": 4.9, "distanceKm": 2.4, "etaMinutes": 7, … }
}
```

Every reader defaults a missing `transport` to road at standard priority, so orders written
before this change price and render exactly as they did.

**Pricing must be mirrored server-side.** `quoteTransport()` in `src/lib/transport.js` is the
whole rule, and it is deliberately free of React and of the store so it can be ported
directly. The client's figure is an estimate either way — the fare is settled from the weight
recorded on the scale at pickup.

**Two rules are enforced in the mock backend, not just the UI**, and the Flask routes must do
the same: only staff may record a measured weight or change transport availability, and only
the account that booked a delivery may cancel or re-route it.

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
    AppLayout         nav + bottom nav + footer + auth modal + toast + hash scrolling
    LandingPage       §2: Hero · ModesBand · Services
    Confirmation      §13/§25 the live request: finding an agent → agent assigned
    TrackOrder §14    live map, ETA, distance remaining, journey timeline
    MyOrders §15      customer dashboard: active delivery, stats, search + filters
    OrderDetails      §15–17 details, change destination, cancel
    TrackLookup       AdminDashboard §18/§26
  lib/
    transport.js      §25 mode catalogue, eligibility, tariffs, ETAs, availability
    pricing.js        priceOrder()/quote() and the money/distance/duration formatters
    orderStatus.js    status vocabulary, §16/§17 guards, derived journey stages
    notifications.js  §19 templates and a local outbox (not surfaced in the UI)
  api/                index (selector) · mockBackend · client · geo · viteEnv
  store/              ui · auth · booking · orders · fleet
  hooks/              useScrollEffects · useNarrowViewport · useReveal · useHover
                      useOrder · useOrderSync · useNow · useStartBooking
  components/
    booking/          BookDelivery · TransportOptions · PlaceSearch · RouteMap
                      StepShell · PriceCard · OrderSummary
    transport/        TransportGlyph · TransportBadge
    orders/           ActiveDelivery · DeliveryCard · StatusPill
    tracking/         EtaPanel · CourierCard · FindingAgent · StatusTimeline
    admin/            WeighParcel · DeliveryTable · FleetPanel · LocationUpdater · TrackingHistory
    auth/             AuthModal
    ui/               Button · Field · Chip · Modal · Toast · StatTile · EmptyState · Skeleton
    Nav · MobileMenu · BottomNav · Hero · ModesBand · Services · SiteFooter
    Wordmark · WorldMap · Icon · HoverLink
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
(<980px, owned by `useNarrowViewport` in AppLayout) switches the four things that cannot
simply reflow: the nav becomes the hamburger, the bottom navigation appears, the dispatch
table becomes cards, and dialogs dock to the bottom edge as sheets. Everything else reflows.

**Icons for transport modes go through `<TransportGlyph>`.** Road, motorbike, air and sea are Material
Symbols like everything else; the quadcopter is inline SVG, because the icon set has no
dependable drone glyph and a missing ligature renders as the literal word "drone".

**Motion is small and purposeful** — a card acknowledging a tap, a route drawing itself, the
live stage of a timeline breathing, skeletons while a quote is worked out. Keyframes live in
`global.css`, and a `prefers-reduced-motion` block turns all of it off.

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

Ten suites: `pricing` · `transport` · `orderStatus` · `mockBackend` (the rules that are
actually enforced) and `App` · `routes` · `booking` · `adminWeight` · `experience` · `uiSlice`
(what the screens do with them). `experience.test.jsx` covers the two things that are hard to
eyeball — the dispatch wait resolving into an assigned agent, and the narrow-viewport layout.
It also covers the customer dashboard, whose active-delivery panel is otherwise only reachable
with a signed-in session and a live order. It sets `window.innerWidth` rather than dispatching
`setNarrow`, because AppLayout reads the real viewport on mount and would overwrite it.

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

The transport availability console is a **prototype interface over partner capacity Deliveroo
would book into** — it does not imply owned aircraft, ships or drones, and the wording on that
panel is deliberate. Air and sea routes are drawn as schematic arcs rather than real flight or
shipping lanes, because the road polyline OSRM returns would be a lie on the one screen that
has to be true. Prices are illustrative rates, not a published tariff.
