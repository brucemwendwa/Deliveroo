import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { verifyWeight } from '../../store/ordersSlice';
import { showToast } from '../../store/uiSlice';
import { canVerifyWeight, weightLockedReason } from '../../lib/orderStatus';
import {
  MAX_WEIGHT_KG,
  formatDelta,
  formatKes,
  isWeightVerified,
  priceOrder,
  weightDiscrepancy
} from '../../lib/pricing';
import { color, control, eyebrow, font, radius } from '../../theme';
import Button from '../ui/Button';

const row = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '16px',
  padding: '9px 0',
  fontSize: '14px'
};

/**
 * §18 — the scale. The customer's weight is only ever a declaration, so the fare it
 * produces is an estimate; this is where the parcel is actually measured and the
 * price becomes real.
 *
 * The preview below the input re-prices as you type, so nobody confirms a figure
 * without first seeing what it does to the customer's bill.
 */
export default function WeighParcel({ order }) {
  const dispatch = useDispatch();
  const [entry, setEntry] = useState('');
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);

  const mayWeigh = canVerifyWeight(order);
  const locked = weightLockedReason(order);
  const verified = isWeightVerified(order.parcel);
  const discrepancy = weightDiscrepancy(order.parcel);

  const typed = parseFloat(entry);
  const valid = Number.isFinite(typed) && typed > 0 && typed <= MAX_WEIGHT_KG;
  // Priced against the order's own route, so the preview is the real new fare.
  const preview = valid ? priceOrder({ parcel: { ...order.parcel, verifiedWeightKg: typed }, route: order.route }) : null;
  const previewDelta = preview ? preview.total - order.pricing.total : 0;

  const submit = async () => {
    setBusy(true);
    const result = await dispatch(verifyWeight({ id: order.id, weightKg: typed }));
    setBusy(false);
    if (verifyWeight.fulfilled.match(result)) {
      setEntry('');
      dispatch(
        showToast({
          message: `${order.id} weighed at ${result.payload.parcel.verifiedWeightKg} kg — fee ${formatKes(result.payload.pricing.total)}.`,
          tone: 'success'
        })
      );
    }
  };

  return (
    <div
      style={{
        borderRadius: radius.card,
        border: '1px solid rgba(17,17,17,.12)',
        background: color.white,
        padding: 'clamp(18px,2.2vw,26px)'
      }}
    >
      <div style={{ ...eyebrow, marginBottom: '14px' }}>
        {verified ? 'Weight · verified' : 'Weigh the parcel'}
      </div>

      <div style={row}>
        <span style={{ color: color.muted }}>Declared by customer</span>
        <strong style={{ color: color.ink }}>{order.parcel.weightKg} kg</strong>
      </div>

      {verified ? (
        <>
          <div style={row}>
            <span style={{ color: color.muted }}>Measured at pickup</span>
            <strong style={{ color: color.ink }}>
              {order.parcel.verifiedWeightKg} kg{' '}
              <span style={{ fontWeight: 500, color: discrepancy?.flagged ? color.orangeDeep : color.muted }}>
                {formatDelta(discrepancy.deltaKg)}
              </span>
            </strong>
          </div>
          <div style={row}>
            <span style={{ color: color.muted }}>Billed fee</span>
            <strong style={{ color: color.ink }}>
              {formatKes(order.pricing.total)}{' '}
              {order.quotedPricing && order.quotedPricing.total !== order.pricing.total && (
                <span style={{ fontWeight: 500, color: color.muted }}>was {formatKes(order.quotedPricing.total)}</span>
              )}
            </strong>
          </div>
          {discrepancy?.flagged && (
            <p
              style={{
                margin: '10px 0 0',
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'rgba(196,112,15,.09)',
                fontSize: '13px',
                lineHeight: 1.5,
                color: color.orangeDeep
              }}
            >
              Under-declared by {formatDelta(discrepancy.deltaKg)}. The fare was re-priced on the measured
              weight and the customer has been notified.
            </p>
          )}
          <p style={{ margin: '12px 0 0', fontSize: '12.5px', color: color.muted, fontFamily: font.mono, letterSpacing: '.03em' }}>
            {order.parcel.weighedBy} · {new Date(order.parcel.weighedAt).toLocaleString('en-KE')}
          </p>
        </>
      ) : (
        <div style={row}>
          <span style={{ color: color.muted }}>Estimated fee</span>
          <strong style={{ color: color.ink }}>{formatKes(order.pricing.total)}</strong>
        </div>
      )}

      {mayWeigh ? (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(17,17,17,.1)' }}>
          <label htmlFor={`weight-${order.id}`} style={control.label}>
            {verified ? 'Correct the measured weight' : 'Weight from the scale'}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 150px', minWidth: '140px' }}>
              <input
                id={`weight-${order.id}`}
                type="number"
                min="0.1"
                max={MAX_WEIGHT_KG}
                step="0.1"
                inputMode="decimal"
                value={entry}
                placeholder={String(order.parcel.weightKg)}
                onChange={(event) => setEntry(event.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && valid && !busy) submit();
                }}
                // Both `padding` and `border` are written out in full rather than layered
                // over control.field's shorthands — mixing shorthand with longhand makes
                // React warn on every focus toggle.
                style={{
                  ...control.field,
                  padding: '0 42px 0 16px',
                  border: `1.5px solid ${focused ? color.orange : 'rgba(17,17,17,.14)'}`,
                  boxShadow: focused ? control.fieldFocus.boxShadow : 'none'
                }}
              />
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '14px',
                  color: color.muted
                }}
              >
                kg
              </span>
            </div>
            <Button onClick={submit} disabled={!valid || busy} icon="scale">
              {busy ? 'Recording…' : 'Confirm weight'}
            </Button>
          </div>

          {/* Re-prices as you type: never confirm a number without seeing the bill it writes. */}
          {preview && (
            <div
              aria-live="polite"
              style={{
                marginTop: '14px',
                padding: '14px 16px',
                borderRadius: '14px',
                background: 'rgba(17,17,17,.04)',
                border: '1px solid rgba(17,17,17,.1)'
              }}
            >
              <div style={{ ...eyebrow, fontSize: '9.5px', marginBottom: '8px' }}>Fee at {typed} kg</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 'clamp(24px,3vw,34px)', lineHeight: 1, color: color.ink }}>
                  {formatKes(preview.total)}
                </span>
                {previewDelta !== 0 && (
                  <span style={{ fontSize: '13.5px', color: previewDelta > 0 ? color.orangeDeep : color.body }}>
                    {previewDelta > 0 ? '+' : '−'}
                    {formatKes(Math.abs(previewDelta))} vs {verified ? 'billed' : 'estimate'}
                  </span>
                )}
              </div>
            </div>
          )}

          {entry && !valid && (
            <p role="alert" style={{ margin: '10px 0 0', fontSize: '13px', color: color.orangeDeep }}>
              Enter a weight between 0.1 and {MAX_WEIGHT_KG} kg.
            </p>
          )}
        </div>
      ) : (
        <p style={{ margin: '16px 0 0', paddingTop: '16px', borderTop: '1px solid rgba(17,17,17,.1)', fontSize: '13.5px', lineHeight: 1.5, color: color.muted }}>
          {locked}
        </p>
      )}
    </div>
  );
}
