import { useState } from 'react';

/**
 * Inline styles can't express :hover, so components merge a hover style object
 * themselves: const [hovered, bind] = useHover();
 * <a {...bind} style={{ ...base, ...(hovered ? hoverStyle : null) }} />
 */
export default function useHover() {
  const [hovered, setHovered] = useState(false);
  return [
    hovered,
    {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      onFocus: () => setHovered(true),
      onBlur: () => setHovered(false)
    }
  ];
}
