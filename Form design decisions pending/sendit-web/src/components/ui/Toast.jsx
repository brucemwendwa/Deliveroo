import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { dismissToast, selectToast } from '../../store/uiSlice';
import { color, ease, font, radius } from '../../theme';
import Icon from '../Icon';

/** §22 — confirmations that shouldn't interrupt. Auto-dismisses; announced politely. */
export default function Toast() {
  const dispatch = useDispatch();
  const toast = useSelector(selectToast);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => dispatch(dismissToast()), 4200);
    return () => clearTimeout(timer);
  }, [toast, dispatch]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'clamp(20px,4vh,40px)',
        transform: 'translateX(-50%)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        gap: '11px',
        maxWidth: 'min(92vw,460px)',
        padding: '14px 20px',
        borderRadius: radius.pill,
        background: color.greenDeep,
        color: color.paper,
        fontFamily: font.body,
        fontSize: '14.5px',
        fontWeight: 600,
        boxShadow: '0 26px 50px -24px rgba(15,26,23,.8)',
        animation: `riseIn .3s ${ease.out} both`
      }}
    >
      <Icon
        name={toast.tone === 'error' ? 'error' : toast.tone === 'success' ? 'check_circle' : 'info'}
        size={19}
        color={color.orange}
      />
      {toast.message}
    </div>
  );
}
