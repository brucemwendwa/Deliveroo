import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from './PageShell';
import Field from '../components/ui/Field';
import Button from '../components/ui/Button';
import { color } from '../theme';

/** §21 "Track Delivery" — the entry point when you have an id but no link. */
export default function TrackLookup() {
  const navigate = useNavigate();
  const [id, setId] = useState('');

  const go = () => {
    const trimmed = id.trim().toUpperCase();
    if (trimmed) navigate(`/track/${trimmed}`);
  };

  return (
    <PageShell eyebrow="Track" title="Where is my package?">
      <div style={{ maxWidth: '460px' }}>
        <p style={{ margin: '0 0 22px', fontSize: '16px', lineHeight: 1.6, color: color.body }}>
          Enter the order number from your confirmation. It looks like DLV-10482.
        </p>
        <Field
          label="Order number"
          value={id}
          placeholder="DLV-10482"
          onChange={setId}
          onKeyDown={(event) => event.key === 'Enter' && go()}
        />
        <div style={{ marginTop: '18px' }}>
          <Button size="lg" onClick={go} disabled={!id.trim()} icon="arrow_forward">
            Track delivery
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
