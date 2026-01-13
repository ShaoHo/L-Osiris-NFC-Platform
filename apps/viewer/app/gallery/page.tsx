'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@losiris/design-system';
import { apiFetch } from '../../lib/api';

interface GalleryResponse {
  exhibitions: Array<{ id: string; totalDays: number; visibility: string }>;
}

export default function GalleryPage() {
  const [data, setData] = useState<GalleryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem('viewer:sessionToken');
    apiFetch<GalleryResponse>('/gallery', {}, token)
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return (
      <main className="viewer-shell">
        <div className="viewer-title">Gallery unavailable</div>
        <div className="viewer-subtitle">{error}</div>
      </main>
    );
  }

  return (
    <main className="viewer-shell" style={{ alignItems: 'stretch' }}>
      <Card className="viewer-card" style={{ maxWidth: 900 }}>
        <h2 className="viewer-title" style={{ textAlign: 'left' }}>
          Public Exhibitions
        </h2>
        <div className="viewer-gallery">
          {data?.exhibitions?.length ? (
            data.exhibitions.map((exhibition) => (
              <Link key={exhibition.id} href={`/run/${exhibition.id}`}>
                <div className="viewer-tile">
                  <div className="ds-pill">{exhibition.visibility}</div>
                  <h3>Exhibition {exhibition.id}</h3>
                  <div className="viewer-subtitle">{exhibition.totalDays} days</div>
                </div>
              </Link>
            ))
          ) : (
            <div className="viewer-subtitle">No public exhibitions yet.</div>
          )}
        </div>
      </Card>
    </main>
  );
}
