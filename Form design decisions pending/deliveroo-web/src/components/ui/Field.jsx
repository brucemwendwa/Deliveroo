import { useId, useState } from 'react';
import { color, control, font } from '../../theme';

/**
 * Labelled text input. Inline styles have no :focus, so focus is tracked in state —
 * the same reason useHover exists. Errors are wired with aria-describedby (§24).
 */
export default function Field({
  label,
  value,
  onChange,
  error,
  hint,
  type = 'text',
  inputMode,
  placeholder,
  autoComplete,
  onKeyDown,
  inputRef,
  ...rest
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);

  return (
    <label htmlFor={id} style={{ display: 'block' }} {...rest}>
      {label && <span style={control.label}>{label}</span>}
      <input
        id={id}
        ref={inputRef}
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onKeyDown={onKeyDown}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        style={{
          ...control.field,
          ...(focused ? control.fieldFocus : null),
          ...(error ? control.fieldInvalid : null)
        }}
      />
      {(error || hint) && (
        <span
          id={`${id}-note`}
          role={error ? 'alert' : undefined}
          style={{
            display: 'block',
            marginTop: '7px',
            fontSize: '13px',
            fontFamily: font.body,
            color: error ? color.orangeDeep : color.muted
          }}
        >
          {error || hint}
        </span>
      )}
    </label>
  );
}
