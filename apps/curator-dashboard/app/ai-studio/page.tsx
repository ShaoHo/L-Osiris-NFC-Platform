'use client';

import { useState } from 'react';
import { Button, Card, Stack } from '@losiris/design-system';
import { curatorFetch } from '../../lib/api';

interface GenerateResponse {
  exhibitionId: string;
  jobs: Array<{ jobId: string; dayIndex: number; status: string }>;
}

export default function AiStudioPage() {
  const [exhibitionId, setExhibitionId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [startDay, setStartDay] = useState(1);
  const [endDay, setEndDay] = useState(7);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await curatorFetch<GenerateResponse>(
        `/curator/exhibitions/${exhibitionId}/ai/generate`,
        {
          method: 'POST',
          body: JSON.stringify({
            prompt,
            startDay,
            endDay,
          }),
        },
      );
      setResult(response);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack>
      <Card>
        <h1>AI Studio</h1>
        <p className="ds-muted">Generate draft days from a single prompt.</p>
      </Card>
      <Card>
        <div className="ds-stack">
          <label className="ds-muted">
            Exhibition ID
            <input value={exhibitionId} onChange={(event) => setExhibitionId(event.target.value)} />
          </label>
          <label className="ds-muted">
            Prompt
            <textarea
              rows={4}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Write a 365-day exhibition…"
            />
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label className="ds-muted">
              Start day
              <input
                type="number"
                min={1}
                value={startDay}
                onChange={(event) => setStartDay(Number(event.target.value))}
              />
            </label>
            <label className="ds-muted">
              End day
              <input
                type="number"
                min={1}
                value={endDay}
                onChange={(event) => setEndDay(Number(event.target.value))}
              />
            </label>
          </div>
          <Button onClick={handleGenerate} disabled={loading || !exhibitionId || !prompt}>
            {loading ? 'Generating…' : 'Generate Draft'}
          </Button>
        </div>
        {result && (
          <div className="ds-muted">
            Generated {result.jobs.length} drafts for {result.exhibitionId}.
          </div>
        )}
        {error && <div className="ds-muted">{error}</div>}
      </Card>
    </Stack>
  );
}
