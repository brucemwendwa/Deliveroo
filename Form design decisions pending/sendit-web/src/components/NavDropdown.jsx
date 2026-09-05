import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useHover from '../hooks/useHover';
import { color, ease, font, hover, radius } from '../theme';
import Icon from './Icon';

/** How long the menu survives the pointer leaving it. */
const CLOSE_DELAY = 140;

function MenuItem({ item, onNavigate }) {
  const [hovered, bind] = useHover();

  const style = {
    display: 'block',
    width: '100%',
    padding: '11px 14px',
    borderRadius: '11px',
    fontFamily: font.body,
    fontSize: '14.5px',
    fontWeight: 600,
    letterSpacing: '-.012em',
    whiteSpace: 'nowrap',
    textAlign: 'left',
    color: item.tone === 'quiet' ? color.muted : color.ink,
    ...(hovered ? hover.drop : null)
  };

  // A phone number or an email address is not a route: it hands off to the dialler
  // or the mail client, so it stays a plain anchor rather than a router link.
  if (item.href) {
    return (
      <a href={item.href} role="menuitem" onClick={onNavigate} {...bind} style={style}>
        {item.label}
      </a>
    );
  }

  // The rest either go somewhere (a link) or do something (sign out).
  if (!item.to) {
    return (
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onNavigate();
          item.onSelect();
        }}
        {...bind}
        style={{ ...style, border: 'none', background: 'none', cursor: 'pointer' }}
      >
        {item.label}
      </button>
    );
  }

  return (
    <Link to={item.to} role="menuitem" onClick={onNavigate} {...bind} style={style}>
      {item.label}
    </Link>
  );
}

/**
 * Nav menu that opens on hover for mouse users. Two details make that usable:
 * the gap between trigger and panel is padding *inside* the hover area rather than
 * empty space (otherwise the menu closes as the cursor crosses it), and leaving is
 * on a short delay so clipping a corner on the way to an item doesn't snap it shut.
 *
 * Touch has no hover state, so taps fall through to the click toggle; a mouse click
 * is ignored because hover has already done the work.
 */
export default function NavDropdown({ label, items, triggerStyle, triggerContent, align = 'center' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const closeTimer = useRef(null);
  const pointerType = useRef('mouse');

  const cancelClose = () => clearTimeout(closeTimer.current);
  const openNow = () => {
    cancelClose();
    setOpen(true);
  };
  const closeSoon = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  };

  useEffect(() => cancelClose, []);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      cancelClose();
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative' }}
      onPointerEnter={(event) => event.pointerType === 'mouse' && openNow()}
      onPointerLeave={(event) => event.pointerType === 'mouse' && closeSoon()}
      // Focus does not open the menu — Escape restores focus to the trigger, and
      // reopening on that focus would make the menu impossible to dismiss. Keyboard
      // users open it with Enter/Space instead. Tabbing back out closes it.
      onBlur={(event) => {
        if (!wrapRef.current?.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onPointerDown={(event) => {
          pointerType.current = event.pointerType;
        }}
        onClick={(event) => {
          // event.detail === 0 means keyboard activation. A real mouse click is a
          // no-op: hover already opened the menu, so toggling would shut it again.
          if (event.detail !== 0 && pointerType.current === 'mouse') return;
          setOpen((value) => !value);
        }}
        style={{
          ...triggerStyle,
          gap: '5px',
          padding: 0,
          border: 'none',
          background: 'none',
          fontFamily: font.body,
          cursor: 'pointer'
        }}
      >
        {triggerContent ?? label}
        <Icon
          name="expand_more"
          size={18}
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: `transform .25s ${ease.out}`
          }}
        />
      </button>

      {open && (
        // The outer box carries the gap as padding so the pointer never leaves the
        // menu on its way from the trigger down to the items.
        <div
          style={{
            position: 'absolute',
            top: '100%',
            paddingTop: '16px',
            // The profile menu sits at the right edge of the page, so centring it
            // would push the panel off-screen.
            ...(align === 'right'
              ? { right: 0 }
              : { left: '50%', transform: 'translateX(-50%)' })
          }}
        >
          <div
            role="menu"
            aria-label={label}
            style={{
              minWidth: '212px',
              padding: '8px',
              borderRadius: radius.field,
              background: color.paper,
              border: `1px solid ${color.border}`,
              boxShadow: '0 26px 46px -22px rgba(28,32,31,.6)',
              animation: `riseIn .2s ${ease.out} both`
            }}
          >
            {items.map((item) => (
              <MenuItem key={item.label} item={item} onNavigate={() => setOpen(false)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
