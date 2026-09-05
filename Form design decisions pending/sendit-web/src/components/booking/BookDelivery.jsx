import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  goToStep,
  nextStep,
  resetBooking,
  resolveRoute,
  selectCanSubmit,
  selectDefaultMode,
  selectQuote,
  selectStepComplete,
  selectTransportOptions,
  setDescription,
  setDestination,
  setDimension,
  setPackageType,
  setPickup,
  setPriority,
  setRecipientField,
  setSenderField,
  setTransportMode,
  setWeight,
  submitBooking
} from '../../store/bookingSlice';
import { selectIsSignedIn, selectUser } from '../../store/authSlice';
import { fetchFleet } from '../../store/fleetSlice';
import { selectSettings } from '../../store/adminSlice';
import { openAuthModal, showToast } from '../../store/uiSlice';
import { reverseGeocode } from '../../api/geo';
import { formatDuration, formatKes, formatKm } from '../../lib/pricing';
import { PACKAGE_TYPES, modeMeta, volumetricWeightKg } from '../../lib/transport';
import { color, eyebrow, font, layout, shadow } from '../../theme';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import Field from '../ui/Field';
import Icon from '../Icon';
import TransportGlyph from '../transport/TransportGlyph';
import PlaceSearch from './PlaceSearch';
import RouteMap from './RouteMap';
import PriceCard from './PriceCard';
import OrderSummary from './OrderSummary';
import TransportOptions from './TransportOptions';
import StepShell from './StepShell';

/** The fixed nav sits over the top of the page, so an auto-scrolled block has to clear it. */
const SCROLL_OFFSET = 108;
/** Breathing room under a revealed block, and clearance for the phone's fixed price bar. */
const BOTTOM_GAP = 28;

/** Every control Enter should be able to walk through, in document order. */
const FOCUSABLE = 'input:not([type="hidden"]):not([disabled]), textarea, select';

const stillPage = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

/** Walk the page down so `node` sits just below the nav. */
const scrollToBlock = (node) => {
  const top = node.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
  window.scrollTo({ top: Math.max(top, 0), behavior: stillPage() ? 'auto' : 'smooth' });
};

/**
 * Answering one question should put the next one in front of the customer — but only
 * when it isn't already. Chip rows sit close together, and yanking the page around a
 * block that was fully on screen anyway reads as a glitch rather than as help.
 */
const revealBlock = (node, bottomInset = 0) => {
  if (!node) return;
  const { top, bottom } = node.getBoundingClientRect();
  const alreadyVisible = top >= SCROLL_OFFSET && bottom <= window.innerHeight - bottomInset - BOTTOM_GAP;
  if (alreadyVisible) return;
  scrollToBlock(node);
};

const WEIGHTS = [0.5, 1, 2, 5, 10];
const DIMENSIONS = [
  { field: 'lengthCm', label: 'Length' },
  { field: 'widthCm', label: 'Width' },
  { field: 'heightCm', label: 'Height' }
];

/**
 * §5–§11, §25 — the delivery request.
 *
 * Deliberately not a courier form: it asks where, where, what and how, one question
 * at a time, and everything else (route, distance, price, eligible vehicles, ETA) is
 * worked out rather than asked for.
 */
export default function BookDelivery() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const booking = useSelector((state) => state.booking);
  const quote = useSelector(selectQuote);
  const complete = useSelector(selectStepComplete);
  const canSubmit = useSelector(selectCanSubmit);
  const options = useSelector(selectTransportOptions);
  const defaultMode = useSelector(selectDefaultMode);
  const signedIn = useSelector(selectIsSignedIn);
  const user = useSelector(selectUser);
  const { acceptingOrders } = useSelector(selectSettings);
  const narrow = useSelector((state) => state.ui.narrow);

  const { step, pickup, destination, route, routeStatus, parcel, transport, sender, recipient, submitStatus } = booking;
  const [customWeight, setCustomWeight] = useState('');
  const [showDimensions, setShowDimensions] = useState(false);
  /** Set when the customer hit Confirm while signed out (§12). */
  const awaitingAuth = useRef(false);
  /** One entry per StepShell, so the wizard can bring the open step to the customer. */
  const stepRefs = useRef([]);
  const lastStep = useRef(step);
  /**
   * The package and transport steps ask several things in a row, so their blocks are
   * addressable too: choosing a weight should bring up the package types, and choosing
   * a type should bring up the description, without anyone reaching for the scrollbar.
   */
  const packageTypeRef = useRef(null);
  const packageDetailsRef = useRef(null);
  const transportActionRef = useRef(null);

  /** The phone's fixed quote bar covers the bottom of the viewport (§23). */
  const bottomInset = narrow && route ? 84 : 0;
  const reveal = (node) => revealBlock(node, bottomInset);

  // The wizard is taller than the viewport, so answering one question used to leave
  // the next one somewhere below the fold. Opening a step now walks the page down to
  // it and puts the cursor in the field it asks for, so the question and the typing
  // are in the same place. The initial render is skipped on purpose: landing on /book
  // should show the heading, not a page already scrolled past it with a keyboard up.
  useEffect(() => {
    if (lastStep.current === step) return;
    lastStep.current = step;

    const node = stepRefs.current[step];
    if (!node) return;

    // Unconditional here, unlike reveal(): a new step's heading belongs at the top of
    // the page whether or not it happened to be on screen already.
    scrollToBlock(node);

    // The step's controls mount with it, so wait a frame before reaching for one, and
    // only take a field that asked for the cursor — steps that open on a row of chips
    // have nothing worth typing into. preventScroll keeps the browser's own
    // scroll-into-view from fighting the smooth scroll above.
    const frame = requestAnimationFrame(() => {
      node.querySelector('[data-autofocus] input, [data-autofocus] textarea')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [step]);

  // Enter moves down the step rather than doing nothing: to the next field, or from the
  // last one to the same Continue button a mouse would press — which reopens the effect
  // above on the next step. Nothing here is inside a <form>, so no submit to suppress.
  const onFieldEnter = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const container = event.currentTarget.closest('[data-step]');
    if (!container) return;
    const fields = Array.from(container.querySelectorAll(FOCUSABLE));
    const next = fields[fields.indexOf(event.currentTarget) + 1];
    if (next) {
      next.focus();
      return;
    }
    container.querySelector('[data-continue]:not(:disabled)')?.click();
  };

  // §6 — the route redraws itself whenever either endpoint changes.
  useEffect(() => {
    if (pickup && destination && !route && routeStatus !== 'loading') dispatch(resolveRoute());
  }, [dispatch, pickup, destination, route, routeStatus]);

  // §26 — which modes dispatch can actually book today.
  useEffect(() => {
    dispatch(fetchFleet());
  }, [dispatch]);

  // Pre-fill the sender from the signed-in account rather than asking twice.
  useEffect(() => {
    if (user?.name && !sender.name) dispatch(setSenderField({ field: 'name', value: user.name }));
    if (user?.phone && !sender.phone) dispatch(setSenderField({ field: 'phone', value: user.phone }));
  }, [dispatch, user, sender.name, sender.phone]);

  // §25 — arriving at the transport step with nothing chosen lands on the cheapest
  // option that can actually run the route, so there is always something to price.
  useEffect(() => {
    if (step === 3 && !transport.mode && defaultMode) dispatch(setTransportMode(defaultMode));
  }, [dispatch, step, transport.mode, defaultMode]);

  // A heavier parcel or a longer route can disqualify the vehicle already chosen.
  // Dropping it silently would leave a price on screen nobody can be held to.
  useEffect(() => {
    if (!transport.mode) return;
    const chosen = options.find((option) => option.mode === transport.mode);
    if (chosen && !chosen.available) {
      dispatch(setTransportMode(null));
      dispatch(showToast({ message: `${modeMeta(transport.mode).label} no longer fits this delivery.`, tone: 'info' }));
    }
  }, [dispatch, options, transport.mode]);

  const placeOrder = async () => {
    const result = await dispatch(submitBooking());
    if (submitBooking.fulfilled.match(result)) {
      dispatch(resetBooking());
      navigate(`/orders/${result.payload.id}/confirmation`);
    }
  };

  // §12 — sign-in interrupts the flow, then hands it straight back.
  useEffect(() => {
    if (signedIn && awaitingAuth.current) {
      awaitingAuth.current = false;
      placeOrder();
    }
    // placeOrder is stable enough for this guard; re-running on every render would resubmit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  const confirm = () => {
    if (!signedIn) {
      // Safety net for a session lapsing mid-form — /book already gates entry. No
      // returnTo: the effect above resumes the submit in place, and navigating
      // would throw away the filled-in form.
      awaitingAuth.current = true;
      dispatch(openAuthModal(null));
      return;
    }
    placeOrder();
  };

  const open = (index) => dispatch(goToStep(index));
  const advance = () => dispatch(nextStep());

  const volumetric = volumetricWeightKg(parcel);
  const selectedMeta = transport.mode ? modeMeta(transport.mode) : null;
  const dimensionsGiven = DIMENSIONS.some(({ field }) => parcel[field]);

  return (
    <section id="book" style={{ background: color.paperWarm, padding: 'clamp(76px,9vw,140px) 0', paddingBottom: narrow ? '132px' : undefined }}>
      <div style={{ maxWidth: layout.maxWidth, margin: '0 auto', padding: `0 ${layout.gutter}` }}>
        <div style={{ marginBottom: 'clamp(30px,4vw,56px)', maxWidth: '680px' }}>
          <div style={{ ...eyebrow, marginBottom: '18px' }}>Request a delivery</div>
          <h2
            data-reveal=""
            style={{
              margin: '0 0 18px',
              fontFamily: font.display,
              fontWeight: 600,
              fontSize: 'clamp(38px,6.6vw,104px)',
              lineHeight: 1.04,
              letterSpacing: '-.025em',
              color: color.ink
            }}
          >
            Send a package.
          </h2>
          <p style={{ margin: 0, maxWidth: '48ch', fontSize: 'clamp(15.5px,1.4vw,18px)', lineHeight: 1.6, color: color.body }}>
            Tell us where to pick it up, where to take it, and how fast you need it there.
            We&apos;ll come and collect it, so you don&apos;t need to work out the logistics.
          </p>

          {/* §27 — staff can pause bookings platform-wide. The backend refuses the
              request either way; this is so nobody fills in four steps to find out. */}
          {!acceptingOrders && (
            <p
              role="status"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                margin: '22px 0 0',
                padding: '14px 18px',
                borderRadius: '16px',
                border: `1px solid ${color.orangeDeep}`,
                background: 'rgba(173,84,21,.1)',
                fontSize: '14.5px',
                lineHeight: 1.55,
                color: color.ink
              }}
            >
              <Icon name="pause_circle" size={19} color={color.orangeDeep} style={{ flex: 'none', marginTop: '1px' }} />
              <span>
                We have paused new pickups for the moment. You can still work out a price here,
                but the request itself will be turned away until we are taking bookings again.
              </span>
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px,3.4vw,56px)', alignItems: 'flex-start' }}>
          {/* Steps */}
          <div style={{ flex: '1 1 440px', minWidth: 'min(100%,300px)' }}>
            <StepShell
              containerRef={(node) => { stepRefs.current[0] = node; }}
              index={0}
              title="Pickup"
              question="Where should we pick it up?"
              active={step === 0}
              complete={complete.pickup}
              summary={pickup?.label}
              onOpen={() => open(0)}
            >
              <div data-autofocus="">
                <PlaceSearch value={pickup} onChange={(place) => dispatch(setPickup(place))} placeholder="Enter pickup location" />
              </div>
              {pickup && (
                <div style={{ marginTop: '18px' }}>
                  <Button onClick={advance} icon="arrow_forward" data-continue="">
                    Continue
                  </Button>
                </div>
              )}
            </StepShell>

            <StepShell
              containerRef={(node) => { stepRefs.current[1] = node; }}
              index={1}
              title="Destination"
              question="Where should we deliver it?"
              active={step === 1}
              complete={complete.destination}
              summary={destination?.label}
              onOpen={() => open(1)}
            >
              <div data-autofocus="">
                <PlaceSearch
                  value={destination}
                  onChange={(place) => dispatch(setDestination(place))}
                  placeholder="Enter destination"
                />
              </div>
              {destination && (
                <div style={{ marginTop: '18px' }}>
                  <Button onClick={advance} icon="arrow_forward" disabled={routeStatus === 'loading'} data-continue="">
                    {routeStatus === 'loading' ? 'Working out the route…' : 'Continue'}
                  </Button>
                </div>
              )}
            </StepShell>

            <StepShell
              containerRef={(node) => { stepRefs.current[2] = node; }}
              index={2}
              title="Package"
              question="What are you sending?"
              active={step === 2}
              complete={complete.parcel}
              summary={`${parcel.weightKg} kg declared${parcel.description ? ` · ${parcel.description}` : ''}`}
              onOpen={() => open(2)}
            >
              <fieldset style={{ border: 'none', padding: 0, margin: '0 0 24px' }}>
                <legend style={{ ...eyebrow, marginBottom: '8px', padding: 0 }}>Roughly how heavy is it?</legend>
                {/* §9 — this figure only buys an estimate; the fare is settled on our
                    scale at pickup, so an optimistic guess here changes nothing. */}
                <p style={{ margin: '0 0 14px', fontSize: '13.5px', lineHeight: 1.5, color: color.muted }}>
                  A rough figure is fine. We weigh the package at pickup and the final price is
                  worked out from that.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {WEIGHTS.map((weight) => (
                    <Chip
                      key={weight}
                      active={parcel.weightKg === weight && !customWeight}
                      onClick={() => {
                        setCustomWeight('');
                        dispatch(setWeight(weight));
                        reveal(packageTypeRef.current);
                      }}
                    >
                      {weight} kg
                    </Chip>
                  ))}
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={customWeight}
                    placeholder="Custom"
                    aria-label="Custom weight in kilograms"
                    onKeyDown={onFieldEnter}
                    onChange={(event) => {
                      const next = event.target.value;
                      setCustomWeight(next);
                      const parsed = parseFloat(next);
                      if (Number.isFinite(parsed) && parsed > 0) dispatch(setWeight(parsed));
                    }}
                    style={{
                      width: '110px',
                      height: '46px',
                      padding: '0 14px',
                      borderRadius: '999px',
                      border: `1px solid ${customWeight ? color.ink : 'rgba(28,32,31,.14)'}`,
                      background: color.card,
                      boxShadow: shadow.card,
                      fontFamily: font.body,
                      fontSize: '15px',
                      fontWeight: 600,
                      color: color.ink,
                      outline: 'none'
                    }}
                  />
                </div>
              </fieldset>

              <fieldset ref={packageTypeRef} style={{ border: 'none', padding: 0, margin: '0 0 24px' }}>
                <legend style={{ ...eyebrow, marginBottom: '12px', padding: 0 }}>What kind of package?</legend>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {PACKAGE_TYPES.map((type) => (
                    <Chip
                      key={type.id}
                      active={parcel.packageType === type.id}
                      onClick={() => {
                        const next = parcel.packageType === type.id ? '' : type.id;
                        dispatch(setPackageType(next));
                        // The label doubles as the description unless one was typed.
                        if (!parcel.description || PACKAGE_TYPES.some((t) => t.label === parcel.description)) {
                          dispatch(setDescription(next ? type.label : ''));
                        }
                        reveal(packageDetailsRef.current);
                      }}
                      style={{ gap: '8px' }}
                    >
                      <Icon name={type.icon} size={17} />
                      {type.label}
                    </Chip>
                  ))}
                </div>
              </fieldset>

              {/* Description, dimensions and Continue travel together: once a package type
                  is chosen there is nothing left to answer, so the whole tail of the step
                  should come into view at once rather than a line at a time. */}
              <div ref={packageDetailsRef}>
                <Field
                  label="Description · optional"
                  value={parcel.description}
                  placeholder="Two laptops, handle with care"
                  onKeyDown={onFieldEnter}
                  onChange={(value) => dispatch(setDescription(value))}
                />

                <div style={{ marginTop: '18px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDimensions((open_) => !open_);
                      // Opening the boxes grows the step downwards, past the fold on a
                      // short window. Reveal after the browser has laid the new rows out.
                      requestAnimationFrame(() => reveal(packageDetailsRef.current));
                    }}
                    aria-expanded={showDimensions || dimensionsGiven}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      height: '44px',
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                      fontFamily: font.body,
                      fontSize: '14px',
                      fontWeight: 600,
                      color: color.ink,
                      cursor: 'pointer'
                    }}
                  >
                    <Icon name={showDimensions || dimensionsGiven ? 'expand_less' : 'straighten'} size={18} color={color.orange} />
                    Add dimensions · optional
                  </button>

                  {(showDimensions || dimensionsGiven) && (
                    <>
                      <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit,minmax(96px,1fr))', marginTop: '8px' }}>
                        {DIMENSIONS.map(({ field, label }) => (
                          <Field
                            key={field}
                            label={`${label} (cm)`}
                            type="number"
                            inputMode="decimal"
                            value={parcel[field]}
                            placeholder="0"
                            onKeyDown={onFieldEnter}
                            onChange={(value) => dispatch(setDimension({ field, value }))}
                          />
                        ))}
                      </div>
                      <p style={{ margin: '10px 0 0', fontSize: '12.5px', lineHeight: 1.5, color: color.muted }}>
                        {volumetric > 0
                          ? `A parcel this size prices as ${volumetric} kg volumetric. We charge the higher of that and its real weight, the way every carrier does.`
                          : 'Large, light parcels take up space that heavier ones would. Dimensions let us price that honestly, and tell us whether a drone can take it.'}
                      </p>
                    </>
                  )}
                </div>

                <div style={{ marginTop: '22px' }}>
                  <Button onClick={advance} icon="arrow_forward" disabled={!complete.parcel} data-continue="">
                    Continue
                  </Button>
                </div>
              </div>
            </StepShell>

            <StepShell
              containerRef={(node) => { stepRefs.current[3] = node; }}
              index={3}
              title="Transport"
              question="How should it be transported?"
              active={step === 3}
              complete={complete.transport}
              summary={
                selectedMeta && quote
                  ? `${selectedMeta.label} · ${formatKes(quote.total)} · ${formatDuration(quote.durationSeconds)}`
                  : undefined
              }
              onOpen={() => open(3)}
            >
              <TransportOptions
                options={options}
                selected={transport.mode}
                onSelect={(mode) => {
                  dispatch(setTransportMode(mode));
                  reveal(transportActionRef.current);
                }}
                priority={transport.priority}
                onPriority={(value) => dispatch(setPriority(value))}
                loading={routeStatus === 'loading' || !route}
              />

              <div ref={transportActionRef} style={{ marginTop: '22px' }}>
                <Button onClick={advance} icon="arrow_forward" disabled={!complete.transport} data-continue="">
                  Continue
                </Button>
              </div>
            </StepShell>

            <StepShell
              containerRef={(node) => { stepRefs.current[4] = node; }}
              index={4}
              title="Details"
              question="Who's sending and receiving?"
              active={step === 4}
              complete={complete.details}
              summary={`${sender.name} → ${recipient.name}`}
              onOpen={() => open(4)}
            >
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ ...eyebrow, marginBottom: '-4px' }}>Pickup details</div>
                <Field
                  data-autofocus=""
                  label="Your name"
                  value={sender.name}
                  autoComplete="name"
                  onKeyDown={onFieldEnter}
                  onChange={(value) => dispatch(setSenderField({ field: 'name', value }))}
                />
                <Field
                  label="Your phone number"
                  value={sender.phone}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+254 700 000 000"
                  onKeyDown={onFieldEnter}
                  onChange={(value) => dispatch(setSenderField({ field: 'phone', value }))}
                />

                <div style={{ ...eyebrow, marginTop: '10px', marginBottom: '-4px' }}>Recipient details</div>
                <Field
                  label="Recipient name"
                  value={recipient.name}
                  onKeyDown={onFieldEnter}
                  onChange={(value) => dispatch(setRecipientField({ field: 'name', value }))}
                />
                <Field
                  label="Recipient phone number"
                  value={recipient.phone}
                  type="tel"
                  inputMode="tel"
                  placeholder="+254 700 000 000"
                  onKeyDown={onFieldEnter}
                  onChange={(value) => dispatch(setRecipientField({ field: 'phone', value }))}
                />
              </div>

              <div style={{ marginTop: '22px' }}>
                <Button onClick={advance} icon="arrow_forward" disabled={!complete.details} data-continue="">
                  Review delivery
                </Button>
              </div>
            </StepShell>

            <StepShell
              containerRef={(node) => { stepRefs.current[5] = node; }}
              index={5}
              title="Confirm"
              question="Ready to send?"
              active={step === 5}
              complete={false}
              onOpen={() => open(5)}
            >
              <OrderSummary
                pickup={pickup}
                destination={destination}
                parcel={parcel}
                route={route}
                quote={quote}
                mode={transport.mode}
                priority={transport.priority}
              />
              {booking.error && (
                <p role="alert" style={{ margin: '14px 0 0', fontSize: '14px', color: color.orangeDeep }}>
                  {booking.error}
                </p>
              )}
              <div style={{ marginTop: '20px' }}>
                <Button
                  size="lg"
                  full
                  icon="arrow_forward"
                  onClick={confirm}
                  disabled={!canSubmit || submitStatus === 'loading'}
                >
                  {submitStatus === 'loading' ? 'Requesting…' : `Request Pickup · ${formatKes(quote.total)}`}
                </Button>
              </div>
              <p style={{ margin: '12px 0 0', fontSize: '12.5px', color: color.muted }}>
                We&apos;ll find you a pickup agent as soon as you request.
              </p>
            </StepShell>
          </div>

          {/* Map + price, sticky beside the steps on desktop (§23). */}
          <div
            style={{
              flex: '1 1 400px',
              minWidth: 'min(100%,300px)',
              position: 'sticky',
              top: '100px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px'
            }}
          >
            <RouteMap
              pickup={pickup}
              destination={destination}
              route={route}
              mode={transport.mode}
              onPick={
                // §6 — tapping the map fills whichever location step is open.
                step === 0 || step === 1
                  ? async (coords) => {
                      const place = await reverseGeocode(coords);
                      dispatch(step === 0 ? setPickup(place) : setDestination(place));
                    }
                  : undefined
              }
            />

            {route && (
              <div style={{ display: 'flex', gap: '12px' }}>
                {[
                  { label: 'Distance', value: formatKm(route.distanceKm) },
                  // Two different quantities, so they get two different names. Before a
                  // mode is chosen this is the router's driving time for the line on the
                  // map — a property of the route, like the distance beside it. After, it
                  // is that mode's door-to-door estimate, which is the figure the customer
                  // is actually promised and the one the quote prints.
                  //
                  // Calling the first one "estimated time" put 3 min next to the quote's
                  // 18 min with nothing to say why they differed: door to door also pays
                  // for handling — 15 minutes on Road — which the drive time never sees.
                  selectedMeta
                    ? { label: 'Door to door', value: formatDuration(quote.durationSeconds) }
                    : { label: 'Drive time', value: formatDuration(route.durationSeconds) }
                ].map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      flex: 1,
                      padding: '16px 18px',
                      borderRadius: '18px',
                      background: color.card,
                      boxShadow: shadow.card,
                      border: `1px solid ${color.border}`
                    }}
                  >
                    <div style={{ ...eyebrow, fontSize: '10px', marginBottom: '8px' }}>{stat.label}</div>
                    <div style={{ fontFamily: font.display, fontWeight: 600, fontSize: 'clamp(22px,2.4vw,30px)', lineHeight: 1, color: color.ink }}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <PriceCard
              quote={quote}
              route={route}
              parcel={parcel}
              mode={transport.mode}
              priority={transport.priority}
            />
          </div>
        </div>
      </div>

      {/* §23 — on a phone the quote and the next action stay in reach of a thumb
          instead of scrolling away above the fold. */}
      {narrow && route && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 880,
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: `12px ${layout.gutter} calc(12px + env(safe-area-inset-bottom,0px))`,
            background: 'rgba(28,32,31,.94)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderTop: '1px solid rgba(243,243,241,.14)'
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...eyebrow, fontSize: '9.5px', color: 'rgba(243,243,241,.55)', marginBottom: '3px' }}>
              {selectedMeta ? `${selectedMeta.label} · ${formatDuration(quote.durationSeconds)}` : 'Estimated'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: font.display, fontWeight: 600, fontSize: '24px', lineHeight: 1, color: color.paper }}>
              {selectedMeta && <TransportGlyph mode={selectedMeta.id} size={19} color={color.orange} />}
              {formatKes(quote.total)}
            </div>
          </div>
          {step === 5 ? (
            <Button onClick={confirm} disabled={!canSubmit || submitStatus === 'loading'} icon="arrow_forward">
              {submitStatus === 'loading' ? 'Requesting…' : 'Request pickup'}
            </Button>
          ) : (
            <Button
              onClick={advance}
              icon="arrow_forward"
              disabled={step === 3 ? !complete.transport : step === 4 ? !complete.details : false}
            >
              Continue
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
