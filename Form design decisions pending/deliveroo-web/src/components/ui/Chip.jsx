import useHover from '../../hooks/useHover';
import { control } from '../../theme';

/** Single-select pill — weight presets and package descriptions (§8). */
export default function Chip({ active = false, onClick, children, style, ...rest }) {
  const [hovered, bind] = useHover();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      {...bind}
      {...rest}
      style={{
        ...control.chip,
        ...(hovered && !active ? { borderColor: 'rgba(17,17,17,.4)' } : null),
        ...(active ? control.chipActive : null),
        ...style
      }}
    >
      {children}
    </button>
  );
}
