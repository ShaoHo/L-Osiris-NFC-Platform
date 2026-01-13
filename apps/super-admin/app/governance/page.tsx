'use client';

import { useState } from 'react';
import { Button, Card, Stack } from '@losiris/design-system';
import { adminFetch, internalAdminFetch } from '../../lib/api';

export default function GovernancePage() {
  const [otp, setOtp] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [curatorId, setCuratorId] = useState('');
  const [exhibitionId, setExhibitionId] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [policy, setPolicy] = useState<'EXHIBITION_ONLY' | 'EXHIBITION_AND_GALLERY'>(
    'EXHIBITION_ONLY',
  );
  const [adminAuth, setAdminAuth] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const handleInternalAction = async (action: 'suspend' | 'unsuspend' | 'transfer') => {
    setStatus(null);
    try {
      if (action === 'transfer') {
        await internalAdminFetch(
          `/internal/admin/exhibitions/${exhibitionId}/transfer`,
          {
            method: 'POST',
            body: JSON.stringify({
              requestedBy,
              toCuratorId: transferTo,
            }),
          },
          otp,
        );
      } else {
        await internalAdminFetch(
          `/internal/admin/curators/${curatorId}/${action}`,
          {
            method: 'POST',
            body: JSON.stringify({ requestedBy }),
          },
          otp,
        );
      }
      setStatus(`Action queued: ${action}`);
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  const handlePolicyUpdate = async () => {
    setStatus(null);
    try {
      await adminFetch(
        `/admin/curators/${curatorId}/policy`,
        {
          method: 'POST',
          body: JSON.stringify({
            requestedBy,
            nfcScopePolicy: policy,
          }),
        },
        adminAuth,
      );
      setStatus('Curator policy update queued.');
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  return (
    <Stack>
      <Card>
        <h1>Governance Controls</h1>
        <p className="ds-muted">Toggle curator access and NFC policy enforcement.</p>
      </Card>
      <Card>
        <h2>Internal Admin OTP</h2>
        <div className="ds-stack">
          <label className="ds-muted">
            Requested by
            <input value={requestedBy} onChange={(event) => setRequestedBy(event.target.value)} />
          </label>
          <label className="ds-muted">
            OTP
            <input type="password" value={otp} onChange={(event) => setOtp(event.target.value)} />
          </label>
          <label className="ds-muted">
            Curator ID
            <input value={curatorId} onChange={(event) => setCuratorId(event.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button onClick={() => handleInternalAction('suspend')}>Suspend</Button>
            <Button variant="secondary" onClick={() => handleInternalAction('unsuspend')}>
              Unsuspend
            </Button>
          </div>
        </div>
      </Card>
      <Card>
        <h2>Transfer Exhibition Ownership</h2>
        <div className="ds-stack">
          <label className="ds-muted">
            Exhibition ID
            <input value={exhibitionId} onChange={(event) => setExhibitionId(event.target.value)} />
          </label>
          <label className="ds-muted">
            Transfer to curator ID
            <input value={transferTo} onChange={(event) => setTransferTo(event.target.value)} />
          </label>
          <Button onClick={() => handleInternalAction('transfer')}>Request Transfer</Button>
        </div>
      </Card>
      <Card>
        <h2>Curator NFC Policy</h2>
        <div className="ds-stack">
          <label className="ds-muted">
            Admin Basic Auth (e.g. Basic base64)
            <input value={adminAuth} onChange={(event) => setAdminAuth(event.target.value)} />
          </label>
          <label className="ds-muted">
            NFC Scope Policy
            <select value={policy} onChange={(event) => setPolicy(event.target.value as typeof policy)}>
              <option value="EXHIBITION_ONLY">Exhibition only</option>
              <option value="EXHIBITION_AND_GALLERY">Exhibition + Gallery</option>
            </select>
          </label>
          <Button onClick={handlePolicyUpdate} disabled={!curatorId || !adminAuth}>
            Update Policy
          </Button>
        </div>
      </Card>
      {status && (
        <Card>
          <p className="ds-muted">{status}</p>
        </Card>
      )}
    </Stack>
  );
}
