'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, Stack } from '@losiris/design-system';
import { apiFetch } from '../../../lib/api';

interface ViewerEntryResponse {
  sessionToken?: string | null;
  requiresActivate?: boolean;
  requiresGrant?: boolean;
  exhibition: {
    id: string;
    type: string;
    totalDays: number;
    status: string;
    visibility: string;
  };
  state?: {
    status: string;
    lastDayIndex: number;
  };
}

export default function TagEntryPage() {
  const params = useParams();
  const router = useRouter();
  const publicTagId = useMemo(
    () => (Array.isArray(params.public_tag_id) ? params.public_tag_id[0] : params.public_tag_id),
    [params.public_tag_id],
  );
  const [entry, setEntry] = useState<ViewerEntryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (!publicTagId) {
      return;
    }

    const token = window.localStorage.getItem('viewer:sessionToken');

    apiFetch<ViewerEntryResponse>(`/viewer/entry/${publicTagId}`, {}, token)
      .then((response) => {
        if (response.sessionToken) {
          window.localStorage.setItem('viewer:sessionToken', response.sessionToken);
        }
        window.localStorage.setItem('viewer:publicTagId', publicTagId);
        window.localStorage.setItem('viewer:exhibitionId', response.exhibition.id);
        setEntry(response);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [publicTagId]);

  const handleActivate = async () => {
    if (!entry) {
      return;
    }

    const token = window.localStorage.getItem('viewer:sessionToken');
    setActivating(true);
    try {
      await apiFetch(
        `/viewer/exhibitions/${entry.exhibition.id}/activate`,
        {
          method: 'POST',
          body: JSON.stringify({
            mode: entry.state?.status === 'PAUSED' ? 'CONTINUE' : 'RESTART',
          }),
        },
        token,
      );

      router.push(`/run/${entry.exhibition.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <main className="viewer-shell">
        <div className="viewer-subtitle">This exhibition begins…</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="viewer-shell">
        <Card className="viewer-card">
          <div className="viewer-title">Unable to enter</div>
          <div className="viewer-subtitle">{error}</div>
        </Card>
      </main>
    );
  }

  if (!entry) {
    return null;
  }

  if (entry.requiresGrant) {
    return (
      <main className="viewer-shell">
        <Card className="viewer-card">
          <Stack>
            <div className="viewer-title">Invitation Required</div>
            <div className="viewer-subtitle">
              This exhibition requires a grant before it can begin.
            </div>
          </Stack>
        </Card>
      </main>
    );
  }

  return (
    <main className="viewer-shell">
      <Card className="viewer-card">
        <Stack>
          <div>
            <div className="viewer-title">This exhibition begins</div>
            <div className="viewer-subtitle">
              Day {entry.state?.lastDayIndex ?? 1} of {entry.exhibition.totalDays}
            </div>
          </div>
          <Button onClick={handleActivate} disabled={activating}>
            {activating ? 'Starting…' : 'Start'}
          </Button>
        </Stack>
      </Card>
    </main>
  );
}
