import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPresentLocation } from '../../store/ordersSlice';
import { showToast } from '../../store/uiSlice';
import { currentLocationLabel, isTerminal } from '../../lib/orderStatus';
import { color, control, eyebrow, font } from '../../theme';
import Button from '../ui/Button';

/**
 * §26 — where the parcel actually is, in words.
 *
 * The courier marker answers "where on the map"; this answers "where would you tell
 * someone it is" — Voi, JKIA, the Mombasa depot — which is what the customer's
 * tracking screen prints and what a phone call asks for. Long-haul legs have one
 * without the other.
 */
export default function LocationUpdater({ order }) {
  const dispatch = useDispatch();
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);

  const locked = isTerminal(order.status);

  const submit = async () => {
    setBusy(true);
    const result = await dispatch(
      setPresentLocation({ id: order.id, label, lat: order.courier?.lat, lng: order.courier?.lng })
    );
    setBusy(false);
    if (setPresentLocation.fulfilled.match(result)) {
      setLabel('');
      dispatch(showToast({ message: `${order.id} is now at ${result.payload.presentLocation.label}.`, tone: 'success' }));
    }
  };

  return (
    <div>
      <div style={{ ...eyebrow, marginBottom: '8px' }}>Present location</div>
      <p style={{ margin: '0 0 12px', fontSize: '13.5px', color: color.body }}>
        Currently reported as <strong style={{ color: color.ink }}>{currentLocationLabel(order)}</strong>.
      </p>

      {locked ? (
        <p style={{ margin: 0, fontSize: '13.5px', color: color.muted }}>
          This delivery is closed — its location no longer changes.
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <input
            type="text"
            value={label}
            aria-label="Present location"
            placeholder="e.g. Voi · en route"
            onChange={(event) => setLabel(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(event) => event.key === 'Enter' && label.trim() && submit()}
            style={{
              ...control.field,
              flex: '1 1 200px',
              height: '50px',
              fontFamily: font.body,
              ...(focused ? control.fieldFocus : null)
            }}
          />
          <Button variant="dark" onClick={submit} disabled={!label.trim() || busy} icon="near_me" iconPosition="left">
            {busy ? 'Saving…' : 'Update location'}
          </Button>
        </div>
      )}
    </div>
  );
}
