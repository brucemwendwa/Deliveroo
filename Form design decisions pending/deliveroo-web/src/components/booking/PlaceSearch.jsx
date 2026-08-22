import { useEffect, useId, useRef, useState } from 'react';
import { currentPosition, reverseGeocode, searchPlaces } from '../../api/geo';
import { color, control, ease, font, radius } from '../../theme';
import Icon from '../Icon';

const DEBOUNCE_MS = 350;

/**
 * Address autocomplete (§6). Shared by pickup, destination and the §16 change-destination
 * modal. Keystrokes are debounced and superseded requests aborted, so a fast typist never
 * sees results from an earlier query overwrite a later one.
 *
 * Implemented as an ARIA combobox: arrow keys move, Enter selects, Escape closes (§24).
 */
export default function PlaceSearch({ value, onChange, placeholder = 'Search an address', autoFocus = false }) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!query || query.length < 3) {
      setResults([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const found = await searchPlaces(query, { signal: controller.signal });
        setResults(found);
        setOpen(true);
        setActive(-1);
      } catch {
        /* aborted — a newer keystroke is already in flight */
      } finally {
        setBusy(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const choose = (place) => {
    onChange(place);
    setQuery('');
    setResults([]);
    setOpen(false);
    setActive(-1);
    setError(null);
  };

  const useMyLocation = async () => {
    setBusy(true);
    setError(null);
    try {
      const coords = await currentPosition();
      choose(await reverseGeocode(coords));
    } catch (locationError) {
      setError(locationError.message);
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (event) => {
    if (!open || !results.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      choose(results[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  // A chosen place replaces the search box entirely — one clear state, not a filled input.
  if (value) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 16px',
          borderRadius: radius.field,
          border: `1.5px solid ${color.ink}`,
          background: color.white
        }}
      >
        <Icon name="location_on" size={20} color={color.orange} />
        <span style={{ flex: 1, minWidth: 0, fontSize: '15.5px', fontWeight: 600, color: color.ink }}>{value.label}</span>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          style={{
            flex: 'none',
            height: '44px',
            padding: '0 14px',
            borderRadius: radius.pill,
            border: 'none',
            background: 'transparent',
            fontFamily: font.body,
            fontSize: '13.5px',
            fontWeight: 700,
            color: color.muted,
            cursor: 'pointer'
          }}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          value={query}
          placeholder={placeholder}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            // Let a click on an option land before the list unmounts.
            setTimeout(() => setOpen(false), 140);
          }}
          onKeyDown={onKeyDown}
          style={{
            ...control.field,
            paddingLeft: '46px',
            paddingRight: '52px',
            ...(focused ? control.fieldFocus : null)
          }}
        />
        <Icon
          name="search"
          size={20}
          color={color.muted}
          style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
        <button
          type="button"
          onClick={useMyLocation}
          aria-label="Use my current location"
          title="Use my current location"
          style={{
            position: 'absolute',
            right: '6px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '44px',
            height: '44px',
            borderRadius: radius.pill,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Icon name={busy ? 'progress_activity' : 'my_location'} size={20} color={color.ink} />
        </button>
      </div>

      {error && (
        <p role="alert" style={{ margin: '8px 0 0', fontSize: '13px', color: color.orangeDeep }}>
          {error}
        </p>
      )}

      {!error && (
        <p style={{ margin: '8px 0 0', fontSize: '13px', color: color.muted }}>
          Type at least 3 characters, use your location, or tap the map.
        </p>
      )}

      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          style={{
            position: 'absolute',
            zIndex: 20,
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            margin: 0,
            padding: '6px',
            listStyle: 'none',
            background: color.white,
            border: '1px solid rgba(17,17,17,.1)',
            borderRadius: '18px',
            boxShadow: '0 28px 54px -28px rgba(17,17,17,.55)',
            maxHeight: '280px',
            overflowY: 'auto',
            animation: `riseIn .2s ${ease.out} both`
          }}
        >
          {results.map((place, index) => (
            <li key={place.id} id={`${listId}-${index}`} role="option" aria-selected={index === active}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(place)}
                onMouseEnter={() => setActive(index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '11px',
                  width: '100%',
                  minHeight: '48px',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: index === active ? 'rgba(245,145,30,.16)' : 'transparent',
                  fontFamily: font.body,
                  fontSize: '14.5px',
                  color: color.ink
                }}
              >
                <Icon name="location_on" size={18} color={color.muted} />
                <span style={{ flex: 1, minWidth: 0 }}>{place.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
