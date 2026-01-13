import Link from 'next/link';
import { Button, Card, Stack } from '@losiris/design-system';

export default function ViewerHome() {
  return (
    <main className="viewer-shell">
      <Card className="viewer-card">
        <Stack>
          <div>
            <div className="viewer-title">L-Osiris Viewer</div>
            <div className="viewer-subtitle">
              Quietly step into exhibitions crafted to unfold day by day.
            </div>
          </div>
          <Stack>
            <Link href="/gallery">
              <Button>Enter Gallery</Button>
            </Link>
            <Link href="/t/tg_test123">
              <Button variant="secondary">Try a test tag</Button>
            </Link>
          </Stack>
        </Stack>
      </Card>
    </main>
  );
}
