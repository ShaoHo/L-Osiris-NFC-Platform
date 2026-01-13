'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ExhibitFrame } from '../../../components/ExhibitFrame';
import { apiFetch } from '../../../lib/api';

interface ViewerRunResponse {
  exhibition: {
    id: string;
    totalDays: number;
  };
  state: {
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
    lastDayIndex: number;
  };
  exhibit: {
    dayIndex: number;
    render: {
      mode: 'HTML' | 'BLOCKS';
      html?: string;
      css?: string;
    } | null;
  };
}

export default function RunPage() {
  const params = useParams();
  const router = useRouter();
  const runId = useMemo(
    () => (Array.isArray(params.run_id) ? params.run_id[0] : params.run_id),
    [params.run_id],
  );
  const [data, setData] = useState<ViewerRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEntry = () => {
    const publicTagId = window.localStorage.getItem('viewer:publicTagId');
    const token = window.localStorage.getItem('viewer:sessionToken');

    if (!publicTagId) {
      setError('Missing tag context. Please scan again.');
      setLoading(false);
      return;
    }

    apiFetch<ViewerRunResponse>(`/viewer/entry/${publicTagId}`, {}, token)
      .then((response) => {
        if (response.exhibition?.id) {
          window.localStorage.setItem('viewer:exhibitionId', response.exhibition.id);
        }
        setData(response);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEntry();
  }, [runId]);

  const handleStateChange = async (action: 'pause' | 'resume' | 'restart') => {
    const token = window.localStorage.getItem('viewer:sessionToken');
    const exhibitionId = data?.exhibition.id ?? window.localStorage.getItem('viewer:exhibitionId');

    if (!exhibitionId) {
      setError('Missing exhibition context.');
      return;
    }

    try {
      if (action === 'pause') {
        await apiFetch(`/viewer/exhibitions/${exhibitionId}/pause`, { method: 'POST' }, token);
      }

      if (action === 'resume') {
        await apiFetch(`/viewer/exhibitions/${exhibitionId}/resume`, { method: 'POST' }, token);
      }

      if (action === 'restart') {
        await apiFetch(
          `/viewer/exhibitions/${exhibitionId}/activate`,
          {
            method: 'POST',
            body: JSON.stringify({ mode: 'RESTART' }),
          },
          token,
        );
      }

      loadEntry();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) {
    return <main className="viewer-shell">Loading today’s page…</main>;
  }

  if (error) {
    return (
      <main className="viewer-shell">
        <div className="viewer-title">Unable to load run</div>
        <div className="viewer-subtitle">{error}</div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  const render = data.exhibit.render;

  return (
    <main>
      {render?.mode === 'HTML' ? (
        <ExhibitFrame html={render.html ?? ''} css={render.css ?? ''} />
      ) : (
        <div className="viewer-shell">
          <div className="viewer-title">Content mode not supported yet.</div>
          <div className="viewer-subtitle">Run ID: {runId}</div>
        </div>
      )}
      <div className="viewer-reactions">
        <button aria-label="Love">❤️</button>
        <button aria-label="Like">👍</button>
        <button aria-label="Peace">🕊️</button>
      </div>
      <div className="viewer-footer">
        <span>
          Day {data.exhibit.dayIndex} / {data.exhibition.totalDays}
        </span>
        <span className="ds-pill">{data.state.status}</span>
      </div>
      <div className="viewer-overlay">
        <button onClick={() => handleStateChange('pause')}>Pause</button>
        <button onClick={() => handleStateChange('resume')}>Resume</button>
        <button onClick={() => handleStateChange('restart')}>Restart Day 1</button>
        <button onClick={() => router.push('/gallery')}>Exit</button>
      </div>
    </main>
  );
}
