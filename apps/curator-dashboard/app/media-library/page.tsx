'use client';

import { useState } from 'react';
import { Button, Card, Stack } from '@losiris/design-system';
import { curatorFetch } from '../../lib/api';

interface AssetResponse {
  id: string;
  assetUrl: string;
}

export default function MediaLibraryPage() {
  const [exhibitionId, setExhibitionId] = useState('');
  const [dayIndex, setDayIndex] = useState(1);
  const [assetUrl, setAssetUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [response, setResponse] = useState<AssetResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAddAsset = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await curatorFetch<AssetResponse>(
        `/curator/exhibitions/${exhibitionId}/days/${dayIndex}/assets`,
        {
          method: 'POST',
          body: JSON.stringify({
            assetUrl,
            thumbnailUrl: thumbnailUrl || null,
          }),
        },
      );
      setResponse(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack>
      <Card>
        <h1>Media Library</h1>
        <p className="ds-muted">Attach assets to specific exhibition days.</p>
      </Card>
      <Card>
        <div className="ds-stack">
          <label className="ds-muted">
            Exhibition ID
            <input value={exhibitionId} onChange={(event) => setExhibitionId(event.target.value)} />
          </label>
          <label className="ds-muted">
            Day index
            <input
              type="number"
              min={1}
              value={dayIndex}
              onChange={(event) => setDayIndex(Number(event.target.value))}
            />
          </label>
          <label className="ds-muted">
            Asset URL
            <input value={assetUrl} onChange={(event) => setAssetUrl(event.target.value)} />
          </label>
          <label className="ds-muted">
            Thumbnail URL (optional)
            <input
              value={thumbnailUrl}
              onChange={(event) => setThumbnailUrl(event.target.value)}
            />
          </label>
          <Button onClick={handleAddAsset} disabled={loading || !exhibitionId || !assetUrl}>
            {loading ? 'Saving…' : 'Save Asset Metadata'}
          </Button>
          {response && <p className="ds-muted">Saved asset {response.id}.</p>}
          {error && <p className="ds-muted">{error}</p>}
        </div>
      </Card>
    </Stack>
  );
}
