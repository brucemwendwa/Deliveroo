import { useId, useState } from 'react';
import { color, control, font } from '../../theme';
import Icon from '../Icon';

/**
 * Labelled text input. Inline styles have no :focus, so focus is tracked in state —
 * the same reason useHover exists. Errors are wired with aria-describedby (§24).
 *
 * `trailing` renders a control inside the right edge of the box — the show/hide eye
 * and the like. It sits outside the <input> in the DOM but inside it visually, so the
 * input reserves room for it rather than running its text underneath.
 */
export default function Field({
  label,
  value,
  onChange,
  error,
  hint,
  /** Ticks the field once it holds something the caller has checked (§10 valid state). */
  valid = false,
  type = 'text',
  inputMode,
  placeholder,
  autoComplete,
  onKeyDown,
  onBlur,
  onFocus,
  inputRef,
  name,
  required,
  autoFocus,
  maxLength,
  /** Node rendered inside the right edge — give it its own accessible name. */
  trailing,
  /** Extra styles for the <input> itself, e.g. the tracked-out code box. */
  inputStyle,
  ...rest
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);

  // The tick only shows when there is room for it: a trailing control owns that corner.
  const showTick = valid && !error && !trailing;
  const rightRoom = trailing ? 54 : showTick ? 44 : 0;

  // The label element wraps the label *text only*. Wrapping the whole control instead
  // would fold every decorative glyph inside it — the validity tick, the eye button —
  // into the input's accessible name, so it would be announced as
  // "Email address check_circle". htmlFor carries the association just as well.
  return (
    <div style={{ display: 'block' }} {...rest}>
      {label && (
        <label htmlFor={id} style={control.label}>
          {label}
        </label>
      )}
      <span style={{ position: 'relative', display: 'block' }}>
        <input
          id={id}
          ref={inputRef}
          name={name}
          type={type}
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          autoFocus={autoFocus}
          maxLength={maxLength}
          onKeyDown={onKeyDown}
          onChange={(event) => onChange(event.target.value)}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? `${id}-note` : undefined}
          style={{
            ...control.field,
            ...(focused ? control.fieldFocus : null),
            ...(error ? control.fieldInvalid : null),
            ...(showTick && !focused ? { borderColor: color.sage } : null),
            paddingRight: rightRoom ? `${rightRoom}px` : undefined,
            ...inputStyle
          }}
        />
        {trailing && (
          <span
            style={{
              position: 'absolute',
              top: '50%',
              right: '8px',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {trailing}
          </span>
        )}
        {showTick && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '50%',
              right: '16px',
              transform: 'translateY(-50%)',
              display: 'flex',
              animation: 'popIn .22s cubic-bezier(.34,1.5,.5,1) both'
            }}
          >
            <Icon name="check_circle" size={19} color={color.green} />
          </span>
        )}
      </span>
      {(error || hint) && (
        <span
          id={`${id}-note`}
          role={error ? 'alert' : undefined}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
            marginTop: '7px',
            fontSize: '13px',
            lineHeight: 1.45,
            fontFamily: font.body,
            color: error ? color.orangeDeep : color.muted
          }}
        >
          {error && <Icon name="error" size={15} color={color.orangeDeep} style={{ marginTop: '1px' }} />}
          {error || hint}
        </span>
      )}
    </div>
  );
}
