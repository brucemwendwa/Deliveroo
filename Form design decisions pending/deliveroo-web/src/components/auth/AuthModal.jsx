import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  backToIdentify,
  requestOtp,
  resetAuthFlow,
  selectUser,
  setChannel,
  setIdentifier,
  setMode,
  setName,
  signOut,
  verifyOtp
} from '../../store/authSlice';
import { closeAuthModal, selectAuthModal, showToast } from '../../store/uiSlice';
import { color, ease, font, radius } from '../../theme';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Field from '../ui/Field';
import Icon from '../Icon';
import AuthAside from './AuthAside';
import {
  CODE_LENGTH,
  readableError,
  validateCode,
  validateIdentifier,
  validateName
} from './validate';

// §12 — a modal, never a form bolted onto the landing page. Two steps: identify, then
// verify. On success the caller's flow resumes exactly where it was.
//
// There is no password anywhere in this product: the account is the address, and the
// code is the proof. So there is no password field, no strength meter and no reset
// flow — the honest equivalents are "resend the code" and "use a different address",
// both of which are below. Sign in and Create account run the same exchange; the only
// real difference is that creating an account also collects a name, which verifyOtp
// stores on the record.

/** How long the resend button stays held after a code goes out. */
const RESEND_SECONDS = 30;

const TABS = [
  { id: 'signin', label: 'Sign in' },
  { id: 'signup', label: 'Create account' }
];

const CHANNELS = [
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' }
];

export default function AuthModal() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { open, returnTo } = useSelector(selectAuthModal);
  const { stage, mode, identifier, name, channel, status, error, hint, codeSentAt } = useSelector(
    (state) => state.auth
  );
  const user = useSelector(selectUser);

  const [code, setCode] = useState('');
  const [touched, setTouched] = useState({});
  const [consented, setConsented] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resent, setResent] = useState(false);

  const codeRef = useRef(null);
  const identifierRef = useRef(null);
  const closeTimer = useRef(null);

  const isEmail = channel === 'email';
  const isSignUp = mode === 'signup';
  const busy = status === 'loading';

  // --- resend cooldown ------------------------------------------------------
  useEffect(() => {
    if (!codeSentAt) {
      setSecondsLeft(0);
      return undefined;
    }
    const tick = () =>
      setSecondsLeft(Math.max(0, RESEND_SECONDS - Math.floor((Date.now() - codeSentAt) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [codeSentAt]);

  // Modal only moves focus when it opens, so the step change has to place it itself —
  // otherwise the code arrives on screen with focus still on the button that asked
  // for it, and a keyboard visitor has to hunt for the field.
  useEffect(() => {
    if (!open) return;
    if (stage === 'verify') codeRef.current?.focus();
    else identifierRef.current?.focus();
  }, [stage, open]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const close = () => {
    clearTimeout(closeTimer.current);
    dispatch(closeAuthModal());
    dispatch(resetAuthFlow());
    setCode('');
    setTouched({});
    setConsented(false);
    setSucceeded(false);
    setResent(false);
  };

  // --- validation -----------------------------------------------------------
  // Errors only surface once a field has been left or the form submitted, so nobody
  // is told they are wrong while still halfway through typing (§10).
  const nameError = isSignUp ? validateName(name) : null;
  const identifierError = validateIdentifier(identifier, channel);
  const codeError = validateCode(code);

  const serverError = error ? readableError(error, 'Something went wrong. Please try again.') : null;
  // A connection or 5xx failure is not the field's fault, so it gets its own banner
  // rather than hanging an accusation off the input the visitor just filled in.
  const systemError = serverError && /reach the server|on our side/i.test(serverError) ? serverError : null;
  const attachedError = systemError ? null : serverError;

  const show = (key, clientError) => (touched[key] ? clientError : null);
  const markTouched = (key) => setTouched((prev) => ({ ...prev, [key]: true }));

  const identifyReady = !nameError && !identifierError && (!isSignUp || consented);

  // --- submit ---------------------------------------------------------------
  const submitIdentify = async (event) => {
    event?.preventDefault();
    setTouched({ name: true, identifier: true, consent: true });
    if (!identifyReady || busy) return;
    setResent(false);
    await dispatch(requestOtp({ identifier: identifier.trim(), channel }));
  };

  const resend = async () => {
    if (secondsLeft > 0 || busy) return;
    const result = await dispatch(requestOtp({ identifier: identifier.trim(), channel }));
    if (requestOtp.fulfilled.match(result)) {
      setResent(true);
      setCode('');
      setTouched((prev) => ({ ...prev, code: false }));
      codeRef.current?.focus();
    }
  };

  const submitVerify = async (event) => {
    event?.preventDefault();
    setTouched((prev) => ({ ...prev, code: true }));
    if (codeError || busy) return;

    const result = await dispatch(
      verifyOtp({ identifier: identifier.trim(), code, name: isSignUp ? name.trim() : undefined })
    );

    if (verifyOtp.fulfilled.match(result)) {
      setCode('');
      setSucceeded(true);
      dispatch(
        showToast({
          message: isSignUp
            ? `Welcome aboard, ${result.payload.name}.`
            : `Signed in as ${result.payload.name}.`,
          tone: 'success'
        })
      );
      // A beat on the success panel so the visitor sees the outcome, then the flow is
      // handed back to whatever asked for the sign-in.
      closeTimer.current = setTimeout(() => {
        dispatch(closeAuthModal());
        setSucceeded(false);
        if (returnTo) navigate(returnTo);
      }, 850);
    }
  };

  // --- pieces ---------------------------------------------------------------
  const headline = succeeded
    ? isSignUp
      ? 'Account created'
      : "You're in"
    : stage === 'verify'
      ? 'Check your messages'
      : isSignUp
        ? 'Create your account'
        : 'Welcome back';

  const subcopy = succeeded
    ? 'Taking you back to what you were doing…'
    : stage === 'verify'
      ? `We sent a ${CODE_LENGTH}-digit code to ${identifier}.`
      : isSignUp
        ? 'One code and you are set up. There is no password to choose or remember.'
        : 'Enter your email or phone and we will send you a single-use code.';

  const segmented = (items, active, onPick, label) => (
    <div
      role="tablist"
      aria-label={label}
      style={{
        display: 'flex',
        gap: '5px',
        padding: '5px',
        borderRadius: radius.pill,
        background: 'rgba(28,32,31,.06)'
      }}
    >
      {items.map((item) => {
        const selected = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onPick(item.id)}
            style={{
              flex: 1,
              height: '42px',
              borderRadius: radius.pill,
              border: 'none',
              cursor: 'pointer',
              fontFamily: font.body,
              fontSize: '13.5px',
              fontWeight: 600,
              background: selected ? color.card : 'transparent',
              color: selected ? color.ink : color.muted,
              boxShadow: selected ? '0 6px 14px -8px rgba(28,32,31,.5)' : 'none',
              transition: `background .2s ${ease.out}, color .2s ${ease.out}, box-shadow .2s ${ease.out}`
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );

  const banner = systemError && (
    <p
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '9px',
        margin: '0 0 16px',
        padding: '13px 15px',
        borderRadius: radius.field,
        border: `1px solid rgba(173,84,21,.35)`,
        background: 'rgba(173,84,21,.07)',
        fontSize: '13.5px',
        lineHeight: 1.5,
        color: color.orangeDeep,
        animation: 'fadeIn .2s ease both'
      }}
    >
      <Icon name="cloud_off" size={17} color={color.orangeDeep} style={{ marginTop: '1px' }} />
      {systemError}
    </p>
  );

  const submitting = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '9px' }}>
      <span
        aria-hidden="true"
        style={{
          width: '15px',
          height: '15px',
          borderRadius: '50%',
          border: '2px solid rgba(28,32,31,.28)',
          borderTopColor: color.ink,
          animation: 'authSpin .7s linear infinite'
        }}
      />
      {stage === 'verify' ? 'Verifying…' : 'Sending…'}
    </span>
  );

  // --- panels ---------------------------------------------------------------
  const alreadySignedIn = (
    <>
      <h2 style={titleStyle}>You are already signed in</h2>
      <p style={subStyle}>
        Signed in as <strong style={{ color: color.ink }}>{user?.name}</strong>
        {user?.email || user?.phone ? ` · ${user.email || user.phone}` : ''}.
      </p>
      <div style={{ display: 'grid', gap: '10px' }}>
        <Button full size="lg" onClick={close} icon="arrow_forward">
          Continue
        </Button>
        <Button
          full
          variant="ghost"
          onClick={async () => {
            await dispatch(signOut());
            dispatch(showToast({ message: 'Signed out.', tone: 'info' }));
          }}
        >
          Sign out
        </Button>
      </div>
    </>
  );

  const successPanel = (
    <div style={{ padding: '10px 0 4px' }}>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '58px',
          height: '58px',
          marginBottom: '22px',
          borderRadius: radius.pill,
          background: 'rgba(36,75,66,.1)',
          animation: 'popIn .3s cubic-bezier(.34,1.5,.5,1) both'
        }}
      >
        <Icon name="check_circle" size={30} color={color.green} />
      </span>
      <h2 style={titleStyle}>{headline}</h2>
      <p style={{ ...subStyle, marginBottom: 0 }}>{subcopy}</p>
    </div>
  );

  const identifyPanel = (
    <form onSubmit={submitIdentify} noValidate>
      {banner}

      {isSignUp && (
        <div style={{ marginBottom: '16px' }}>
          <Field
            label="Full name"
            name="name"
            autoComplete="name"
            placeholder="Ada Lovelace"
            value={name}
            valid={!nameError}
            error={show('name', nameError)}
            onChange={(value) => dispatch(setName(value))}
            onBlur={() => markTouched('name')}
          />
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        {segmented(CHANNELS, channel, (id) => dispatch(setChannel(id)), 'Sign in method')}
      </div>

      <Field
        label={isEmail ? 'Email address' : 'Phone number'}
        name={isEmail ? 'email' : 'tel'}
        type={isEmail ? 'email' : 'tel'}
        inputMode={isEmail ? 'email' : 'tel'}
        autoComplete={isEmail ? 'email' : 'tel'}
        placeholder={isEmail ? 'you@example.com' : '+254 700 000 000'}
        value={identifier}
        inputRef={identifierRef}
        valid={!identifierError}
        error={show('identifier', identifierError) || attachedError}
        onChange={(value) => dispatch(setIdentifier(value))}
        onBlur={() => markTouched('identifier')}
      />

      {isSignUp && (
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '11px',
            margin: '18px 0 0',
            fontSize: '13px',
            lineHeight: 1.5,
            color: color.body,
            cursor: 'pointer'
          }}
        >
          <input
            type="checkbox"
            checked={consented}
            onChange={(event) => {
              setConsented(event.target.checked);
              markTouched('consent');
            }}
            aria-describedby="auth-consent-note"
            style={{
              flex: 'none',
              width: '19px',
              height: '19px',
              marginTop: '1px',
              accentColor: color.green,
              cursor: 'pointer'
            }}
          />
          <span id="auth-consent-note">
            I agree to the{' '}
            <a href="/#footer" style={legalLinkStyle}>
              Terms
            </a>{' '}
            and the{' '}
            <a href="/#footer" style={legalLinkStyle}>
              Privacy Policy
            </a>
            .
          </span>
        </label>
      )}

      {isSignUp && touched.consent && !consented && (
        <p role="alert" style={inlineErrorStyle}>
          <Icon name="error" size={15} color={color.orangeDeep} />
          Tick the box to continue.
        </p>
      )}

      <div style={{ marginTop: '20px' }}>
        <Button type="submit" full size="lg" disabled={busy} icon={busy ? undefined : 'arrow_forward'}>
          {busy ? submitting : `Continue with ${isEmail ? 'email' : 'phone'}`}
        </Button>
      </div>

      <p style={switchLineStyle}>
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          type="button"
          onClick={() => {
            dispatch(setMode(isSignUp ? 'signin' : 'signup'));
            setTouched({});
          }}
          style={switchButtonStyle}
        >
          {isSignUp ? 'Sign in' : 'Create one'}
        </button>
      </p>
    </form>
  );

  const verifyPanel = (
    <form onSubmit={submitVerify} noValidate>
      {banner}

      <Field
        label={`${CODE_LENGTH}-digit code`}
        name="one-time-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="000000"
        maxLength={CODE_LENGTH}
        value={code}
        inputRef={codeRef}
        error={show('code', codeError) || attachedError}
        hint={hint || (resent ? 'A fresh code is on its way.' : undefined)}
        onChange={(value) => setCode(value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
        onBlur={() => markTouched('code')}
        inputStyle={{
          height: '64px',
          textAlign: 'center',
          fontSize: '27px',
          fontWeight: 600,
          letterSpacing: '.42em',
          // The tracking pushes the run of digits right by one gap; pull it back so
          // the group stays optically centred in the box.
          textIndent: '.42em',
          fontVariantNumeric: 'tabular-nums'
        }}
      />

      <div style={{ marginTop: '20px', display: 'grid', gap: '10px' }}>
        <Button
          type="submit"
          full
          size="lg"
          disabled={busy || code.length !== CODE_LENGTH}
          icon={busy ? undefined : 'arrow_forward'}
        >
          {busy ? submitting : 'Verify and continue'}
        </Button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <button
            type="button"
            onClick={() => {
              dispatch(backToIdentify());
              setCode('');
              setTouched({});
            }}
            style={{ ...switchButtonStyle, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <Icon name="arrow_back" size={16} color={color.orangeDeep} />
            Use a different {isEmail ? 'email' : 'number'}
          </button>

          <button
            type="button"
            onClick={resend}
            disabled={secondsLeft > 0 || busy}
            style={{
              ...switchButtonStyle,
              color: secondsLeft > 0 ? color.muted : color.orangeDeep,
              cursor: secondsLeft > 0 ? 'default' : 'pointer',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend code'}
          </button>
        </div>
      </div>
    </form>
  );

  let body;
  if (user && !succeeded) body = alreadySignedIn;
  else if (succeeded) body = successPanel;
  else if (stage === 'verify') body = verifyPanel;
  else body = identifyPanel;

  const showTabs = !user && !succeeded && stage === 'identify';

  return (
    <Modal open={open} onClose={close} title="Sign in" maxWidth="920px" bleed>
      <div className="auth-grid">
        <AuthAside />

        <div className="auth-form">
          {showTabs && (
            <div style={{ marginBottom: '26px' }}>
              {segmented(TABS, mode, (id) => {
                dispatch(setMode(id));
                setTouched({});
              }, 'Sign in or create an account')}
            </div>
          )}

          {!user && !succeeded && (
            <>
              <h2 style={titleStyle}>{headline}</h2>
              <p style={subStyle}>{subcopy}</p>
            </>
          )}

          {body}

          {!user && !succeeded && (
            <p
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                margin: '24px 0 0',
                fontSize: '12.5px',
                lineHeight: 1.5,
                color: color.muted
              }}
            >
              <Icon name="lock" size={15} color={color.muted} style={{ marginTop: '1px' }} />
              We use your details only to arrange and track your deliveries.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

const titleStyle = {
  margin: '0 0 10px',
  fontFamily: font.display,
  fontWeight: 600,
  fontSize: 'clamp(26px,3vw,34px)',
  lineHeight: 1.08,
  letterSpacing: '-.02em',
  color: color.ink
};

const subStyle = {
  margin: '0 0 24px',
  fontSize: '14.5px',
  lineHeight: 1.55,
  color: color.body,
  textWrap: 'pretty'
};

const switchLineStyle = {
  margin: '20px 0 0',
  fontSize: '13.5px',
  lineHeight: 1.5,
  color: color.body,
  textAlign: 'center'
};

const switchButtonStyle = {
  padding: 0,
  border: 'none',
  background: 'none',
  fontFamily: font.body,
  fontSize: '13.5px',
  fontWeight: 600,
  color: color.orangeDeep,
  cursor: 'pointer',
  textDecoration: 'underline',
  textUnderlineOffset: '3px'
};

const legalLinkStyle = {
  color: color.orangeDeep,
  fontWeight: 600,
  textDecoration: 'underline',
  textUnderlineOffset: '2px'
};

const inlineErrorStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  margin: '8px 0 0',
  fontSize: '13px',
  color: color.orangeDeep
};
