'use client';

import { useState } from 'react';
import { Button, Card, Stack } from '@losiris/design-system';
import { adminFetch } from '../../lib/api';

export default function AuditActionsPage() {
  const [adminAuth, setAdminAuth] = useState('');
  const [actionId, setActionId] = useState('');
  const [actor, setActor] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const handleAction = async (action: 'confirm' | 'execute' | 'cancel') => {
    setStatus(null);
    try {
      const bodyKey =
        action === 'confirm'
          ? 'confirmedBy'
          : action === 'execute'
            ? 'executedBy'
            : 'cancelledBy';

      await adminFetch(
        `/admin/actions/${actionId}/${action}`,
        {
          method: 'POST',
          body: JSON.stringify({ [bodyKey]: actor }),
        },
        adminAuth,
      );
      setStatus(`Admin action ${action} submitted.`);
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  return (
    <Stack>
      <Card>
        <h1>Audit Actions</h1>
        <p className="ds-muted">Confirm, execute, or cancel queued admin actions.</p>
      </Card>
      <Card>
        <div className="ds-stack">
          <label className="ds-muted">
            Admin Basic Auth
            <input value={adminAuth} onChange={(event) => setAdminAuth(event.target.value)} />
          </label>
          <label className="ds-muted">
            Action ID
            <input value={actionId} onChange={(event) => setActionId(event.target.value)} />
          </label>
          <label className="ds-muted">
            Actor email
            <input value={actor} onChange={(event) => setActor(event.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button onClick={() => handleAction('confirm')}>Confirm</Button>
            <Button variant="secondary" onClick={() => handleAction('execute')}>
              Execute
            </Button>
            <Button variant="secondary" onClick={() => handleAction('cancel')}>
              Cancel
            </Button>
          </div>
        </div>
        {status && <p className="ds-muted">{status}</p>}
      </Card>
    </Stack>
  );
}
