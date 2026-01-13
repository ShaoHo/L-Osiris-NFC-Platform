'use client';

import { useState } from 'react';
import { Button, Card, Stack } from '@losiris/design-system';
import { curatorFetch } from '../../lib/api';

interface DayContent {
  id: string;
  dayIndex: number;
  status: string;
}

interface VersionResponse {
  contents: DayContent[];
}

export default function AnalyticsPage() {
  const [exhibitionId, setExhibitionId] = useState('');
  const [versionId, setVersionId] = useState('');
  const [data, setData] = useState<VersionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = async () => {
    setError(null);
    try {
      const response = await curatorFetch<VersionResponse>(
        `/curator/exhibitions/${exhibitionId}/versions/${versionId}/days`,
      );
      setData(response);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const publishedCount = data?.contents.filter((item) => item.status === 'PUBLISHED').length ?? 0;
  const draftCount = data?.contents.filter((item) => item.status === 'DRAFT').length ?? 0;

  return (
    <Stack>
      <Card>
        <h1>Analytics</h1>
        <p className="ds-muted">Read-only signals sourced from day content.</p>
      </Card>
      <Card>
        <div className="ds-stack">
          <label className="ds-muted">
            Exhibition ID
            <input value={exhibitionId} onChange={(event) => setExhibitionId(event.target.value)} />
          </label>
          <label className="ds-muted">
            Version ID
            <input value={versionId} onChange={(event) => setVersionId(event.target.value)} />
          </label>
          <Button onClick={handleLoad} disabled={!exhibitionId || !versionId}>
            Load Day Metrics
          </Button>
        </div>
        {data && (
          <div className="ds-grid cols-2" style={{ marginTop: 16 }}>
            <Card>
              <h3>Published Days</h3>
              <p className="ds-muted">{publishedCount} live</p>
            </Card>
            <Card>
              <h3>Draft Days</h3>
              <p className="ds-muted">{draftCount} drafts</p>
            </Card>
          </div>
        )}
        {error && <p className="ds-muted">{error}</p>}
      </Card>
    </Stack>
  );
}
