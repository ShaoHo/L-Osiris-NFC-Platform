import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDraftContent, normalizeJobIds, processAiJob } from './worker.js';

test('normalizeJobIds returns jobIds array when provided', () => {
  const result = normalizeJobIds({ jobIds: ['job-1', ' ', 'job-2'] });
  assert.deepEqual(result, ['job-1', 'job-2']);
});

test('normalizeJobIds falls back to single jobId', () => {
  const result = normalizeJobIds({ jobId: 'job-3' });
  assert.deepEqual(result, ['job-3']);
});

test('buildDraftContent sanitizes unsafe markup', () => {
  const { html } = buildDraftContent('<script>alert(1)</script> Hello', null);
  assert.ok(!html.includes('<script'), 'expected script tag to be stripped');
  assert.ok(html.includes('Hello'), 'expected sanitized prompt text');
});

test('processAiJob updates job status and writes draft content', async () => {
  const updates = [];
  const prisma = {
    aiGenerationJob: {
      findUnique: async () => ({
        id: 'job-1',
        status: 'PENDING',
        prompt: 'Prompt',
        assetMetadata: null,
        exhibitionId: 'ex-1',
        dayIndex: 2,
      }),
      update: async (args) => {
        updates.push(args);
        return {};
      },
    },
    exhibitionVersion: {
      findFirst: async () => ({ id: 'version-1' }),
    },
    exhibitionDayContent: {
      upsert: async () => ({}),
    },
  };

  await processAiJob('job-1', prisma, {
    info: () => {},
    warn: () => {},
    error: () => {},
  });

  assert.equal(updates[0]?.data?.status, 'PROCESSING');
  assert.equal(updates[1]?.data?.status, 'COMPLETED');
});
