import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { backToIdentify, requestOtp, resetAuthFlow, setChannel, setIdentifier, verifyOtp } from '../../store/authSlice';
import { closeAuthModal, selectAuthModal, showToast } from '../../store/uiSlice';
import { color, font, radius } from '../../theme';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Field from '../ui/Field';
import Icon from '../Icon';

// §12 — a modal, never a form bolted onto the landing page. Two steps: identify, then
// verify. On success the caller's flow resumes exactly where it was.
export default function AuthModal() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { open, returnTo } = useSelector(selectAuthModal);
  const { stage, identifier, channel, status, error, hint } = useSelector((state) => state.auth);
  const [code, setCode] = useState('');

  const close = () => {
    dispatch(closeAuthModal());
    dispatch(resetAuthFlow());
    setCode('');
  };

  const sendCode = async () => {
    await dispatch(requestOtp({ identifier, channel }));
  };

  const verify = async () => {
    const result = await dispatch(verifyOtp({ identifier, code }));
    if (verifyOtp.fulfilled.match(result)) {
      dispatch(closeAuthModal());
      dispatch(showToast({ message: `Signed in as ${result.payload.name}.`, tone: 'success' }));
      setCode('');
      // §12 — hand the flow back to whatever asked for the sign-in.
      if (returnTo) navigate(returnTo);
    }
  };

  const isEmail = channel === 'email';

  return (
    <Modal open={open} onClose={close} title="Sign in">
      <h2
        style={{
          margin: '0 0 10px',
          fontFamily: font.display,
          fontWeight: 600,
          fontSize: 'clamp(28px,4vw,40px)',
          lineHeight: 1.04,
          color: color.ink
        }}
      >
        {stage === 'identify' ? 'Sign in to send' : 'Check your messages'}
      </h2>
      <p style={{ margin: '0 0 26px', fontSize: '14.5px', lineHeight: 1.55, color: color.body, textWrap: 'pretty' }}>
        {stage === 'identify'
          ? 'We only need one detail. No password to remember.'
          : `We sent a 6-digit code to ${identifier}.`}
      </p>

      {stage === 'identify' ? (
        <>
          <div
            role="tablist"
            aria-label="Sign in method"
            style={{
              display: 'flex',
              gap: '6px',
              padding: '5px',
              marginBottom: '20px',
              borderRadius: radius.pill,
              background: 'rgba(28,32,31,.06)'
            }}
          >
            {[
              { id: 'email', label: 'Continue with email' },
              { id: 'phone', label: 'Continue with phone' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={channel === tab.id}
                onClick={() => dispatch(setChannel(tab.id))}
                style={{
                  flex: 1,
                  height: '44px',
                  borderRadius: radius.pill,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: font.body,
                  fontSize: '13.5px',
                  fontWeight: 600,
                  background: channel === tab.id ? color.card : 'transparent',
                  color: channel === tab.id ? color.ink : color.muted,
                  boxShadow: channel === tab.id ? '0 6px 14px -8px rgba(28,32,31,.5)' : 'none'
                }}
              >
                {tab.label.replace('Continue with ', '')}
              </button>
            ))}
          </div>

          <Field
            label={isEmail ? 'Email address' : 'Phone number'}
            type={isEmail ? 'email' : 'tel'}
            inputMode={isEmail ? 'email' : 'tel'}
            autoComplete={isEmail ? 'email' : 'tel'}
            placeholder={isEmail ? 'you@example.com' : '+254 700 000 000'}
            value={identifier}
            error={error}
            onChange={(value) => dispatch(setIdentifier(value))}
            onKeyDown={(event) => event.key === 'Enter' && identifier && sendCode()}
          />

          <div style={{ marginTop: '20px' }}>
            <Button full size="lg" onClick={sendCode} disabled={!identifier.trim() || status === 'loading'} icon="arrow_forward">
              {status === 'loading' ? 'Sending…' : `Continue with ${isEmail ? 'email' : 'phone'}`}
            </Button>
          </div>
        </>
      ) : (
        <>
          <Field
            label="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            value={code}
            error={error}
            hint={hint}
            onChange={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(event) => event.key === 'Enter' && code.length === 6 && verify()}
          />
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Button full size="lg" onClick={verify} disabled={code.length !== 6 || status === 'loading'} icon="arrow_forward">
              {status === 'loading' ? 'Verifying…' : 'Verify and continue'}
            </Button>
            <Button full variant="ghost" onClick={() => dispatch(backToIdentify())}>
              Use a different {isEmail ? 'email' : 'number'}
            </Button>
          </div>
        </>
      )}

      <p
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          margin: '22px 0 0',
          fontSize: '12.5px',
          lineHeight: 1.5,
          color: color.muted
        }}
      >
        <Icon name="lock" size={15} color={color.muted} />
        We use your details only to arrange and track this delivery.
      </p>
    </Modal>
  );
}
