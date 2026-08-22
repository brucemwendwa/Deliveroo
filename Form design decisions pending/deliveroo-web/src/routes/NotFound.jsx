import { Link } from 'react-router-dom';
import PageShell from './PageShell';
import Button from '../components/ui/Button';
import { color } from '../theme';

export default function NotFound() {
  return (
    <PageShell eyebrow="404" title="That page has moved on.">
      <p style={{ margin: '0 0 24px', fontSize: '16px', color: color.body }}>
        The link may be out of date, or the delivery may have been removed.
      </p>
      <Button as={Link} to="/" icon="arrow_forward">
        Back to home
      </Button>
    </PageShell>
  );
}
