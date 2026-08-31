import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { resetDemoData, selectSettings, updateSettings } from '../../store/adminSlice';
import { fetchAllOrders } from '../../store/ordersSlice';
import { fetchFleet } from '../../store/fleetSlice';
import { showToast } from '../../store/uiSlice';
import { MOCK_OTP, usingMockBackend } from '../../api';
import { color, control, ease, font, radius } from '../../theme';
import Panel from '../../components/admin/Panel';
import Button from '../../components/ui/Button';
import Field from '../../components/ui/Field';
import Modal from '../../components/ui/Modal';
import Icon from '../../components/Icon';

/** A labelled switch. Inline styles have no :checked, so the state is drawn here. */
function Switch({ on, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        height: '46px',
        padding: '0 18px',
        borderRadius: radius.pill,
        border: `1px solid ${on ? color.ink : 'rgba(28,32,31,.16)'}`,
        background: on ? color.green : 'transparent',
        color: on ? color.paper : color.muted,
        fontFamily: font.body,
        fontSize: '14px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: `background .18s ${ease.out}, color .18s, border-color .18s`
      }}
    >
      <Icon name={on ? 'toggle_on' : 'toggle_off'} size={20} />
      {on ? 'On' : 'Off'}
    </button>
  );
}

/**
 * §27 — platform settings. Administrator-only, and short on purpose: the levers that
 * change what the product does for everyone, and nothing that is really a preference.
 */
export default function AdminSettings() {
  const dispatch = useDispatch();
  const settings = useSelector(selectSettings);

  const [notice, setNotice] = useState(settings.noticeToStaff);
  const [email, setEmail] = useState(settings.supportEmail);
  const [phone, setPhone] = useState(settings.supportPhone);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  // The settings arrive a moment after the screen does, and another administrator
  // may change them in the next tab; the draft follows unless it is being edited.
  useEffect(() => {
    setNotice(settings.noticeToStaff);
    setEmail(settings.supportEmail);
    setPhone(settings.supportPhone);
  }, [settings]);

  const save = async (patch, message) => {
    const result = await dispatch(updateSettings(patch));
    if (updateSettings.fulfilled.match(result)) {
      dispatch(showToast({ message, tone: 'success' }));
    }
  };

  const reset = async () => {
    setBusy(true);
    const result = await dispatch(resetDemoData());
    setBusy(false);
    setConfirming(false);
    if (resetDemoData.fulfilled.match(result)) {
      dispatch(fetchAllOrders());
      dispatch(fetchFleet());
      dispatch(showToast({ message: 'Demo data is back to how it shipped.', tone: 'success' }));
    }
  };

  const contactsChanged = email !== settings.supportEmail || phone !== settings.supportPhone;

  return (
    <div style={{ display: 'grid', gap: 'clamp(16px,2vw,22px)' }}>
      <Panel
        title="Taking bookings"
        note="Off refuses every new delivery request across the site, immediately and in every open tab. Deliveries already on the board are untouched — they still need finishing."
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <Switch
            on={settings.acceptingOrders}
            label="Accepting new bookings"
            onChange={(next) =>
              save(
                { acceptingOrders: next },
                next ? 'Deliveroo is taking bookings again.' : 'New bookings are paused.'
              )
            }
          />
          <span style={{ fontSize: '14px', color: settings.acceptingOrders ? color.body : color.orangeDeep }}>
            {settings.acceptingOrders
              ? 'Customers can request a delivery.'
              : 'Customers requesting a delivery are being turned away.'}
          </span>
        </div>
      </Panel>

      <Panel
        title="Notice to staff"
        note="One line at the top of every portal screen. For the things a shift needs to know and an email would miss."
      >
        <div style={{ display: 'grid', gap: '12px' }}>
          <textarea
            value={notice}
            onChange={(event) => setNotice(event.target.value)}
            aria-label="Notice to staff"
            rows={2}
            maxLength={240}
            placeholder="e.g. Drone capacity is grounded until 14:00 — route small local parcels to bikes."
            style={{ ...control.field, height: 'auto', padding: '14px 16px', resize: 'vertical', lineHeight: 1.55 }}
          />
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button
              variant="dark"
              size="sm"
              onClick={() => save({ noticeToStaff: notice.trim() }, notice.trim() ? 'Notice posted.' : 'Notice cleared.')}
              disabled={notice === settings.noticeToStaff}
            >
              {notice.trim() ? 'Post notice' : 'Clear notice'}
            </Button>
            {settings.noticeToStaff && (
              <Button variant="ghost" size="sm" onClick={() => save({ noticeToStaff: '' }, 'Notice cleared.')}>
                Take it down
              </Button>
            )}
          </div>
        </div>
      </Panel>

      <Panel title="Support contacts" note="What the platform gives customers when a delivery needs a human.">
        <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
          <Field label="Support email" value={email} onChange={setEmail} type="email" autoComplete="off" />
          <Field label="Support phone" value={phone} onChange={setPhone} type="tel" autoComplete="off" />
        </div>
        <div style={{ marginTop: '14px' }}>
          <Button
            variant="dark"
            size="sm"
            disabled={!contactsChanged}
            onClick={() => save({ supportEmail: email.trim(), supportPhone: phone.trim() }, 'Support contacts saved.')}
          >
            Save contacts
          </Button>
        </div>
      </Panel>

      <Panel title="Where this data lives">
        <dl style={{ margin: 0, display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
          {[
            ['Backend', usingMockBackend ? 'Local demo (browser storage)' : 'Flask API'],
            ['Sign-in', `One-time code${usingMockBackend ? ` · always ${MOCK_OTP}` : ''}`],
            ['Cross-tab updates', usingMockBackend ? 'Storage events, instant' : 'Polling every 5s'],
            ['Audit retention', usingMockBackend ? 'Last 300 actions' : 'Server-side']
          ].map(([term, value]) => (
            <div key={term} style={{ paddingTop: '12px', borderTop: `1px solid ${color.border}` }}>
              <dt
                style={{
                  fontFamily: font.mono,
                  fontSize: '9.5px',
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  color: color.muted,
                  marginBottom: '6px'
                }}
              >
                {term}
              </dt>
              <dd style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: color.ink }}>{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      {usingMockBackend && (
        <Panel
          title="Demo data"
          note="Puts the deliveries, capacity, roster, outbox and trail back to how they shipped. Accounts and your session are left alone."
        >
          <Button variant="danger" size="sm" icon="restart_alt" iconPosition="left" onClick={() => setConfirming(true)}>
            Reset demo data
          </Button>
        </Panel>
      )}

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Reset demo data?" maxWidth="420px">
        <h2 style={{ margin: '0 0 12px', fontSize: '22px', letterSpacing: '-.02em', color: color.ink }}>
          Reset demo data?
        </h2>
        <p style={{ margin: '0 0 22px', fontSize: '14.5px', lineHeight: 1.6, color: color.body }}>
          Every delivery on the board is deleted and replaced with the seven the demo starts with.
          Customers watching a tracking screen will lose it. This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button variant="danger" onClick={reset} disabled={busy}>
            {busy ? 'Resetting…' : 'Yes, reset it'}
          </Button>
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            Keep the data
          </Button>
        </div>
      </Modal>
    </div>
  );
}
