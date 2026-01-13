'use client';

import { useState } from 'react';
import { Button, Card, Stack } from '@losiris/design-system';
import { curatorFetch } from '../../lib/api';

interface CreateResponse {
  id: string;
  type: string;
  totalDays: number;
  visibility: string;
}

export default function ExhibitionsPage() {
  const [type, setType] = useState<'ONE_TO_ONE' | 'ONE_TO_MANY'>('ONE_TO_ONE');
  const [totalDays, setTotalDays] = useState(365);
  const [visibility, setVisibility] = useState<'DRAFT' | 'PUBLIC'>('DRAFT');
  const [result, setResult] = useState<CreateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [targetId, setTargetId] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await curatorFetch<CreateResponse>('/curator/exhibitions', {
        method: 'POST',
        body: JSON.stringify({ type, totalDays, visibility }),
      });
      setResult(response);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (action: 'publish' | 'archive') => {
    if (!targetId.trim()) {
      setActionMessage('Enter an exhibition ID first.');
      return;
    }

    setActionMessage(null);
    try {
      await curatorFetch(`/curator/exhibitions/${targetId}/${action}`, { method: 'POST' });
      setActionMessage(`Exhibition ${targetId} queued for ${action}.`);
    } catch (err) {
      setActionMessage((err as Error).message);
    }
  };

  return (
    <Stack>
      <Card>
        <h1>Exhibitions</h1>
        <p className="ds-muted">Draft and publish new exhibitions.</p>
      </Card>
      <Card>
        <h2>Create Exhibition</h2>
        <div className="ds-stack">
          <label className="ds-muted">
            Type
            <select value={type} onChange={(event) => setType(event.target.value as typeof type)}>
              <option value="ONE_TO_ONE">One-to-one</option>
              <option value="ONE_TO_MANY">One-to-many</option>
            </select>
          </label>
          <label className="ds-muted">
            Total days
            <input
              type="number"
              value={totalDays}
              min={1}
              onChange={(event) => setTotalDays(Number(event.target.value))}
            />
          </label>
          <label className="ds-muted">
            Visibility
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as typeof visibility)}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLIC">Public</option>
            </select>
          </label>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating…' : 'Create Exhibition'}
          </Button>
        </div>
        {result && (
          <p className="ds-muted">Created exhibition {result.id} ({result.visibility}).</p>
        )}
        {error && <p className="ds-muted">{error}</p>}
      </Card>
      <Card>
        <h2>Publish or Archive</h2>
        <p className="ds-muted">Update lifecycle state for an exhibition ID.</p>
        <div className="ds-stack">
          <input
            placeholder="Exhibition ID"
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <Button onClick={() => handleStatusChange('publish')}>Publish</Button>
            <Button variant="secondary" onClick={() => handleStatusChange('archive')}>
              Archive
            </Button>
          </div>
          {actionMessage && <p className="ds-muted">{actionMessage}</p>}
        </div>
      </Card>
    </Stack>
  );
}
