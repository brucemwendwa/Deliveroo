import useHover from '../hooks/useHover';

/**
 * Link that merges a hover style object, since inline styles have no :hover.
 * Renders <a> by default; pass `as={Link}` (and `to`) for in-app routes. Remaining
 * props flow straight through, so href/to are the caller's choice.
 */
export default function HoverLink({ as: Component = 'a', style, hoverStyle, children, ...rest }) {
  const [hovered, bind] = useHover();
  return (
    <Component {...bind} {...rest} style={{ ...style, ...(hovered ? hoverStyle : null) }}>
      {children}
    </Component>
  );
}
