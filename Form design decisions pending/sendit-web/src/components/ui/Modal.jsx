import { useEffect, useRef } from 'react';
import { color, ease, layout, radius } from '../../theme';
import Icon from '../Icon';

/**
 * Accessible dialog (§24): Escape closes, focus moves in on open and returns to the
 * trigger on close, and Tab is trapped inside. Used by auth (§12) and the cancel
 * confirmation (§17).
 */
export default function Modal({
  open,
  onClose,
  title,
  labelledBy,
  children,
  maxWidth = '460px',
  /** 'sheet' docks the panel to the bottom edge — the phone-native shape (§23). */
  placement = 'center',
  /**
   * Drops the panel's own padding and clips its corners, so a dialog can lay out
   * full-bleed columns of its own (§12 auth). Everything else — the trap, Escape,
   * focus restore — is unchanged.
   */
  bleed = false
}) {
  const sheet = placement === 'sheet';
  const panelRef = useRef(null);
  const restoreRef = useRef(null);

  // Callers write onClose inline, so its identity changes on every render of theirs.
  // The effect below must not re-run for that: tearing it down and setting it up again
  // moves focus out of the panel and back in, which on a keystroke-driven re-render
  // means the field loses focus after every character typed. The handler is read from
  // a ref instead, and `open` is the only thing the effect actually depends on.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    restoreRef.current = document.activeElement;
    const panel = panelRef.current;
    // The field first, if the dialog has one — querySelector would otherwise hand back
    // the close button, which is rendered above the children.
    const target =
      panel?.querySelector('input,select,textarea') ||
      panel?.querySelector('button,[href]');
    target?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeRef.current();
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
  }, [open]);

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
        background: 'rgba(15,26,23,.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: sheet ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: sheet ? 0 : layout.gutter,
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
          maxWidth: sheet ? 'none' : maxWidth,
          maxHeight: sheet ? '90vh' : '92vh',
          overflowY: 'auto',
          background: color.paper,
          borderRadius: sheet ? '26px 26px 0 0' : radius.card,
          overflowX: bleed ? 'hidden' : undefined,
          padding: bleed
            ? 0
            : sheet
              ? `26px ${layout.gutter} calc(26px + env(safe-area-inset-bottom,0px))`
              : 'clamp(24px,3.5vw,38px)',
          boxShadow: '0 50px 90px -40px rgba(15,26,23,.75)',
          animation: sheet ? `sheetUp .32s ${ease.out} both` : `riseIn .3s ${ease.out} both`
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
            background: bleed ? 'rgba(250,250,248,.9)' : 'transparent',
            boxShadow: bleed ? '0 6px 18px -10px rgba(15,26,23,.5)' : 'none',
            zIndex: 2,
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
