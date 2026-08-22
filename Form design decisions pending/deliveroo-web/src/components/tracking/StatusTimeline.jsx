import { STATUS, STATUS_FLOW, TIMELINE_LABEL, isComplete, stepIndex } from '../../lib/orderStatus';
import { color, font } from '../../theme';
import Icon from '../Icon';

/**
 * §13 — order received → delivered. Cancelled orders leave the chain rather than
 * extending it, so the timeline is replaced by a single terminal row.
 */
export default function StatusTimeline({ status, tone = 'light' }) {
  const onDark = tone === 'dark';
  const dim = onDark ? 'rgba(243,241,237,.45)' : color.muted;
  const strong = onDark ? color.paper : color.ink;
  const rail = onDark ? 'rgba(243,241,237,.2)' : 'rgba(17,17,17,.16)';

  if (status === STATUS.CANCELLED) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: strong }}>
        <Icon name="cancel" size={22} color={color.orangeDeep} />
        <span style={{ fontSize: '16px', fontWeight: 700 }}>This delivery was cancelled.</span>
      </div>
    );
  }

  const current = stepIndex(status);

  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {STATUS_FLOW.map((step, index) => {
        const done = isComplete(status, step);
        const isCurrent = index === current;
        return (
          <li key={step} style={{ display: 'flex', gap: '14px', minHeight: index === STATUS_FLOW.length - 1 ? 'auto' : '58px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
              <span
                aria-hidden="true"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '999px',
                  background: done ? color.orange : 'transparent',
                  border: done ? 'none' : `2px solid ${rail}`,
                  color: color.ink,
                  transition: 'background .4s ease'
                }}
              >
                {done && <Icon name="check" size={15} />}
              </span>
              {index < STATUS_FLOW.length - 1 && (
                <span
                  aria-hidden="true"
                  style={{
                    flex: 1,
                    width: '2px',
                    minHeight: '26px',
                    margin: '4px 0',
                    background: isComplete(status, STATUS_FLOW[index + 1]) ? color.orange : rail,
                    transition: 'background .4s ease'
                  }}
                />
              )}
            </div>
            <div style={{ paddingBottom: '18px' }}>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: isCurrent ? 800 : 600,
                  letterSpacing: '-.02em',
                  color: done ? strong : dim
                }}
              >
                {TIMELINE_LABEL[step]}
              </div>
              {isCurrent && (
                <div
                  style={{
                    marginTop: '4px',
                    fontFamily: font.mono,
                    fontSize: '10.5px',
                    letterSpacing: '.14em',
                    textTransform: 'uppercase',
                    color: color.orange
                  }}
                >
                  Current
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
