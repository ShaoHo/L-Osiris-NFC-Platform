'use client';

import { useState } from 'react';
import { Button, Card, Stack } from '@losiris/design-system';
import { API_BASE_URL } from '../../../lib/api';

interface CheckoutResponse {
  sessionId: string;
  url?: string | null;
}

export default function AccountPayoutPage() {
  const [viewerId, setViewerId] = useState('');
  const [exhibitionId, setExhibitionId] = useState('');
  const [result, setResult] = useState<CheckoutResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/payments/checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          viewerId,
          exhibitionId: exhibitionId || null,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = (await response.json()) as CheckoutResponse;
      setResult(payload);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack>
      <Card>
        <h1>Account & Payout</h1>
        <p className="ds-muted">
          Link payout settings and preview checkout flows for monetized exhibitions.
        </p>
      </Card>
      <Card>
        <h2>Preview Checkout Session</h2>
        <div className="ds-stack">
          <label className="ds-muted">
            Viewer ID
            <input value={viewerId} onChange={(event) => setViewerId(event.target.value)} />
          </label>
          <label className="ds-muted">
            Exhibition ID (optional)
            <input
              value={exhibitionId}
              onChange={(event) => setExhibitionId(event.target.value)}
            />
          </label>
          <Button onClick={handleCheckout} disabled={loading || !viewerId}>
            {loading ? 'Creating…' : 'Create Checkout Session'}
          </Button>
          {result && (
            <p className="ds-muted">
              Session {result.sessionId} {result.url ? `→ ${result.url}` : ''}
            </p>
          )}
          {error && <p className="ds-muted">{error}</p>}
        </div>
      </Card>
    </Stack>
  );
}
