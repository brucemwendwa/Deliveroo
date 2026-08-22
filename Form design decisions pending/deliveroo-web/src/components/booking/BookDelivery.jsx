import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  goToStep,
  nextStep,
  resetBooking,
  resolveRoute,
  selectCanSubmit,
  selectQuote,
  selectStepComplete,
  setDescription,
  setDestination,
  setPickup,
  setRecipientField,
  setSenderField,
  setWeight,
  submitBooking
} from '../../store/bookingSlice';
import { selectIsSignedIn, selectUser } from '../../store/authSlice';
import { openAuthModal, showToast } from '../../store/uiSlice';
import { reverseGeocode } from '../../api/geo';
import { formatDuration, formatKm } from '../../lib/pricing';
import { color, eyebrow, font, layout } from '../../theme';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import Field from '../ui/Field';
import PlaceSearch from './PlaceSearch';
import RouteMap from './RouteMap';
import PriceCard from './PriceCard';
import OrderSummary from './OrderSummary';
import StepShell from './StepShell';

const WEIGHTS = [0.5, 1, 2, 5, 10];
const DESCRIPTIONS = ['Documents', 'Clothes', 'Electronics', 'Food', 'Other'];

export default function BookDelivery() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const booking = useSelector((state) => state.booking);
  const quote = useSelector(selectQuote);
  const complete = useSelector(selectStepComplete);
  const canSubmit = useSelector(selectCanSubmit);
  const signedIn = useSelector(selectIsSignedIn);
  const user = useSelector(selectUser);

  const { step, pickup, destination, route, routeStatus, parcel, sender, recipient, submitStatus } = booking;
  const [customWeight, setCustomWeight] = useState('');
  /** Set when the customer hit Confirm while signed out (§12). */
  const awaitingAuth = useRef(false);

  // §6 — the route redraws itself whenever either endpoint changes.
  useEffect(() => {
    if (pickup && destination && !route && routeStatus !== 'loading') dispatch(resolveRoute());
  }, [dispatch, pickup, destination, route, routeStatus]);

  // Pre-fill the sender from the signed-in account rather than asking twice.
  useEffect(() => {
    if (user?.name && !sender.name) dispatch(setSenderField({ field: 'name', value: user.name }));
    if (user?.phone && !sender.phone) dispatch(setSenderField({ field: 'phone', value: user.phone }));
  }, [dispatch, user, sender.name, sender.phone]);

  const placeOrder = async () => {
    const result = await dispatch(submitBooking());
    if (submitBooking.fulfilled.match(result)) {
      dispatch(resetBooking());
      dispatch(showToast({ message: 'Delivery confirmed.', tone: 'success' }));
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

  return (
    <section id="book" style={{ background: color.paperWarm, padding: 'clamp(76px,9vw,140px) 0' }}>
      <div style={{ maxWidth: layout.maxWidth, margin: '0 auto', padding: `0 ${layout.gutter}` }}>
        <div style={{ marginBottom: 'clamp(36px,4.5vw,64px)', maxWidth: '680px' }}>
          <div style={{ ...eyebrow, marginBottom: '18px' }}>Book a delivery</div>
          <h2
            data-reveal=""
            style={{
              margin: '0 0 18px',
              fontFamily: font.display,
              fontWeight: 700,
              fontSize: 'clamp(38px,6.6vw,104px)',
              lineHeight: 0.9,
              letterSpacing: '-.015em',
              textTransform: 'uppercase',
              color: color.ink
            }}
          >
            Send a package.
          </h2>
          <p style={{ margin: 0, maxWidth: '46ch', fontSize: 'clamp(15.5px,1.4vw,18px)', lineHeight: 1.6, color: color.body }}>
            Tell us where it is and where it needs to go. We&apos;ll handle the rest.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px,3.4vw,56px)', alignItems: 'flex-start' }}>
          {/* Steps */}
          <div style={{ flex: '1 1 440px', minWidth: 'min(100%,300px)' }}>
            <StepShell
              index={0}
              title="Pickup"
              question="Where are we picking up from?"
              active={step === 0}
              complete={complete.pickup}
              summary={pickup?.label}
              onOpen={() => open(0)}
            >
              <PlaceSearch value={pickup} onChange={(place) => dispatch(setPickup(place))} placeholder="Pickup address" />
              {pickup && (
                <div style={{ marginTop: '18px' }}>
                  <Button onClick={advance} icon="arrow_forward">
                    Continue
                  </Button>
                </div>
              )}
            </StepShell>

            <StepShell
              index={1}
              title="Destination"
              question="Where should we take it?"
              active={step === 1}
              complete={complete.destination}
              summary={destination?.label}
              onOpen={() => open(1)}
            >
              <PlaceSearch
                value={destination}
                onChange={(place) => dispatch(setDestination(place))}
                placeholder="Destination address"
              />
              {destination && (
                <div style={{ marginTop: '18px' }}>
                  <Button onClick={advance} icon="arrow_forward" disabled={routeStatus === 'loading'}>
                    {routeStatus === 'loading' ? 'Working out the route…' : 'Continue'}
                  </Button>
                </div>
              )}
            </StepShell>

            <StepShell
              index={2}
              title="Package"
              question="What are we carrying?"
              active={step === 2}
              complete={complete.parcel}
              summary={`${parcel.weightKg} kg${parcel.description ? ` · ${parcel.description}` : ''}`}
              onOpen={() => open(2)}
            >
              <fieldset style={{ border: 'none', padding: 0, margin: '0 0 22px' }}>
                <legend style={{ ...eyebrow, marginBottom: '12px', padding: 0 }}>Package weight</legend>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {WEIGHTS.map((weight) => (
                    <Chip
                      key={weight}
                      active={parcel.weightKg === weight && !customWeight}
                      onClick={() => {
                        setCustomWeight('');
                        dispatch(setWeight(weight));
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
                      border: `1.5px solid ${customWeight ? color.ink : 'rgba(17,17,17,.14)'}`,
                      background: color.white,
                      fontFamily: font.body,
                      fontSize: '15px',
                      fontWeight: 600,
                      color: color.ink,
                      outline: 'none'
                    }}
                  />
                </div>
              </fieldset>

              <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                <legend style={{ ...eyebrow, marginBottom: '12px', padding: 0 }}>Description · optional</legend>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {DESCRIPTIONS.map((item) => (
                    <Chip
                      key={item}
                      active={parcel.description === item}
                      onClick={() => dispatch(setDescription(parcel.description === item ? '' : item))}
                    >
                      {item}
                    </Chip>
                  ))}
                </div>
              </fieldset>

              <div style={{ marginTop: '22px' }}>
                <Button onClick={advance} icon="arrow_forward" disabled={!complete.parcel}>
                  Continue
                </Button>
              </div>
            </StepShell>

            <StepShell
              index={3}
              title="Details"
              question="Who's sending and receiving?"
              active={step === 3}
              complete={complete.details}
              summary={`${sender.name} → ${recipient.name}`}
              onOpen={() => open(3)}
            >
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ ...eyebrow, marginBottom: '-4px' }}>Pickup details</div>
                <Field
                  label="Your name"
                  value={sender.name}
                  autoComplete="name"
                  onChange={(value) => dispatch(setSenderField({ field: 'name', value }))}
                />
                <Field
                  label="Your phone number"
                  value={sender.phone}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+254 700 000 000"
                  onChange={(value) => dispatch(setSenderField({ field: 'phone', value }))}
                />

                <div style={{ ...eyebrow, marginTop: '10px', marginBottom: '-4px' }}>Recipient details</div>
                <Field
                  label="Recipient name"
                  value={recipient.name}
                  onChange={(value) => dispatch(setRecipientField({ field: 'name', value }))}
                />
                <Field
                  label="Recipient phone number"
                  value={recipient.phone}
                  type="tel"
                  inputMode="tel"
                  placeholder="+254 700 000 000"
                  onChange={(value) => dispatch(setRecipientField({ field: 'phone', value }))}
                />
              </div>

              <div style={{ marginTop: '22px' }}>
                <Button onClick={advance} icon="arrow_forward" disabled={!complete.details}>
                  Review delivery
                </Button>
              </div>
            </StepShell>

            <StepShell
              index={4}
              title="Confirm"
              question="Ready to send?"
              active={step === 4}
              complete={false}
              onOpen={() => open(4)}
            >
              <OrderSummary pickup={pickup} destination={destination} parcel={parcel} route={route} quote={quote} />
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
                  {submitStatus === 'loading' ? 'Confirming…' : 'Confirm Delivery'}
                </Button>
              </div>
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
                  { label: 'Estimated time', value: formatDuration(route.durationSeconds) }
                ].map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      flex: 1,
                      padding: '16px 18px',
                      borderRadius: '18px',
                      background: color.white,
                      border: '1px solid rgba(17,17,17,.1)'
                    }}
                  >
                    <div style={{ ...eyebrow, fontSize: '10px', marginBottom: '8px' }}>{stat.label}</div>
                    <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 'clamp(22px,2.4vw,30px)', lineHeight: 1, color: color.ink }}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <PriceCard quote={quote} route={route} weightKg={parcel.weightKg} />
          </div>
        </div>
      </div>
    </section>
  );
}
