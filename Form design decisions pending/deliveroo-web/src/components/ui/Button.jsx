import useHover from '../../hooks/useHover';
import { color, ease, font, hover as hoverStyles, radius } from '../../theme';
import Icon from '../Icon';

// Variants map onto the palette already in use: the orange pill is the primary
// action everywhere, `dark` is its inverse on light surfaces, `ghost` is secondary.
const VARIANTS = {
  primary: { base: { background: color.orange, color: color.ink }, hover: hoverStyles.yellow },
  dark: { base: { background: color.greenDeep, color: color.paper }, hover: hoverStyles.dark },
  ghost: {
    base: { background: 'transparent', color: color.ink, border: `1px solid ${color.border}` },
    hover: hoverStyles.ghost
  },
  ghostLight: {
    base: { background: 'transparent', color: color.paper, border: '1px solid rgba(243,243,241,.28)' },
    hover: { background: 'rgba(243,243,241,.08)', borderColor: 'rgba(243,243,241,.5)' }
  },
  danger: {
    base: { background: 'transparent', color: color.orangeDeep, border: `1px solid ${color.orangeDeep}` },
    hover: { background: 'rgba(173,84,21,.08)' }
  }
};

/**
 * The one button in the app. Renders <button> by default and <a> when given href,
 * so nav pills and form actions stay visually identical without duplicating styles.
 */
export default function Button({
  as: Component,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'right',
  href,
  full = false,
  disabled = false,
  style,
  children,
  ...rest
}) {
  const [hovered, bind] = useHover();
  const tone = VARIANTS[variant] || VARIANTS.primary;
  const height = size === 'lg' ? 'clamp(56px,6vw,64px)' : size === 'sm' ? '44px' : '52px';

  const styles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '9px',
    height,
    // 44px minimum tap target (§24) is guaranteed by the smallest height above.
    padding: size === 'lg' ? '0 clamp(24px,3vw,34px)' : '0 24px',
    borderRadius: radius.pill,
    border: 'none',
    fontFamily: font.body,
    fontSize: size === 'lg' ? 'clamp(15px,1.3vw,17px)' : '15.5px',
    fontWeight: 600,
    letterSpacing: '-.01em',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    width: full ? '100%' : undefined,
    whiteSpace: 'nowrap',
    transition: `transform .2s ${ease.out}, box-shadow .2s, background .2s, border-color .2s`,
    ...tone.base,
    ...(hovered && !disabled ? tone.hover : null),
    ...style
  };

  const content = (
    <>
      {icon && iconPosition === 'left' && <Icon name={icon} size={18} />}
      {children}
      {icon && iconPosition === 'right' && <Icon name={icon} size={18} />}
    </>
  );

  // `as={Link}` for in-app routes, `href` for plain anchors, otherwise a <button>.
  if (Component && !disabled) {
    return (
      <Component {...bind} {...rest} style={styles}>
        {content}
      </Component>
    );
  }

  if (href && !disabled) {
    return (
      <a href={href} {...bind} {...rest} style={styles}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" disabled={disabled} {...bind} {...rest} style={styles}>
      {content}
    </button>
  );
}
