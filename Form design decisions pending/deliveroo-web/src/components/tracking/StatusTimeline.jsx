import { STATUS, journeyStages } from '../../lib/orderStatus';
import { color, font } from '../../theme';
import Icon from '../Icon';

/**
 * §13/§25 — requested → delivered. The seven rows are derived from the order's status
 * and how far through the journey it is (see journeyStages), so "dispatched", "in
 * transit" and "arriving" can be distinct steps for the customer without inventing
 * three more statuses for the API to carry.
 *
 * Cancelled orders leave the chain rather than extending it, so the timeline is
 * replaced by a single terminal row.
 */
export default function StatusTimeline({ status, order, tone = 'light' }) {
  const onDark = tone === 'dark';
  const dim = onDark ? 'rgba(243,243,241,.45)' : color.muted;
  const strong = onDark ? color.paper : color.ink;
  const rail = onDark ? 'rgba(243,243,241,.2)' : 'rgba(28,32,31,.16)';

  const subject = order || { status };

  if (subject.status === STATUS.CANCELLED) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: strong }}>
        <Icon name="cancel" size={22} color={color.orangeDeep} />
        <span style={{ fontSize: '16px', fontWeight: 600 }}>This delivery was cancelled.</span>
      </div>
    );
  }

  const stages = journeyStages(subject);

  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {stages.map((stage, index) => {
        const done = stage.state === 'done';
        const current = stage.state === 'current';
        const last = index === stages.length - 1;

        return (
          <li key={stage.key} style={{ display: 'flex', gap: '14px', minHeight: last ? 'auto' : '46px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
              <span
                aria-hidden="true"
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '999px',
                  background: done ? color.orange : current ? color.orange : 'transparent',
                  border: done || current ? 'none' : `2px solid ${rail}`,
                  color: color.ink,
                  transition: 'background .4s ease'
                }}
              >
                {/* The live stage keeps a soft ring going; everything behind it is a tick. */}
                {current && (
                  <span
                    style={{
                      position: 'absolute',
                      inset: '-6px',
                      borderRadius: '999px',
                      border: `2px solid ${color.orange}`,
                      opacity: 0.5,
                      animation: 'livePulse 1.8s ease-in-out infinite'
                    }}
                  />
                )}
                {done ? <Icon name="check" size={15} /> : current ? <span style={{ width: '8px', height: '8px', borderRadius: '99px', background: color.greenDeep }} /> : null}
              </span>
              {!last && (
                <span
                  aria-hidden="true"
                  style={{
                    flex: 1,
                    width: '2px',
                    minHeight: '20px',
                    margin: '4px 0',
                    background: done ? color.orange : rail,
                    transition: 'background .4s ease'
                  }}
                />
              )}
            </div>

            <div style={{ paddingBottom: '14px' }}>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: current ? 800 : 600,
                  letterSpacing: '-.02em',
                  color: done || current ? strong : dim
                }}
              >
                {stage.label}
              </div>
              {current && (
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
                  Now
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
