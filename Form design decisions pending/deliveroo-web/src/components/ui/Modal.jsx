import { useEffect, useRef } from 'react';
import { color, ease, layout, radius } from '../../theme';
import Icon from '../Icon';

/**
 * Accessible dialog (§24): Escape closes, focus moves in on open and returns to the
 * trigger on close, and Tab is trapped inside. Used by auth (§12) and the cancel
 * confirmation (§17).
 */
export default function Modal({ open, onClose, title, labelledBy, children, maxWidth = '460px' }) {
  const panelRef = useRef(null);
  const restoreRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    restoreRef.current = document.activeElement;
    const panel = panelRef.current;
    panel?.querySelector('input,button,[href],select,textarea')?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;

      const focusable = [...panel.querySelectorAll('input,button,[href],select,textarea')].filter(
        (el) => !el.disabled && el.offsetParent !== null
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(10,10,10,.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: layout.gutter,
        animation: 'fadeIn .2s ease both'
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : title}
        aria-labelledby={labelledBy}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth,
          maxHeight: '92vh',
          overflowY: 'auto',
          background: color.paper,
          borderRadius: radius.card,
          padding: 'clamp(24px,3.5vw,38px)',
          boxShadow: '0 50px 90px -40px rgba(10,10,10,.75)',
          animation: `riseIn .3s ${ease.out} both`
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
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
          <Icon name="close" size={22} color={color.muted} />
        </button>
        {children}
      </div>
    </div>
  );
}
