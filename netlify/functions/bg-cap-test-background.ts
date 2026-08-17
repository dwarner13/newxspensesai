import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';

/**
 * bg-cap-test-background.ts
 *
 * Throwaway proof that Netlify Pro background functions survive beyond the
 * 26-second synchronous cap. The "-background" suffix tells Netlify to run
 * this as a background function (returns 202 immediately, runs up to 15 min).
 *
 * Writes TWO rows to `jobs`:
 *   1. START row — immediately on invocation (before the 60s sleep)
 *   2. DONE  row — after 60s sleep completes
 *
 * Interpretation:
 *   Both rows present  → background functions survive 60s (A' is viable)
 *   START only         → container was killed between 0s and 60s
 *   Neither row        → insert itself is broken; test is invalid
 *
 * UI side-effect: useJobsRealtime subscribes to `jobs` filtered by user_id.
 * Both inserts will appear in the JobsDrawer and trigger toast notifications.
 * This is harmless and confirms realtime is working. Clean up after test.
 *
 * VERIFICATION:
 *   1. Deploy via git push
 *   2. curl -X POST https://xspensesai.netlify.app/.netlify/functions/bg-cap-test-background
 *      → expect HTTP 202 (not 200). If 200, -background suffix not recognized.
 *   3. Wait 90 seconds
 *   4. SELECT title, status, result_payload FROM jobs WHERE title LIKE 'BG_CAP_TEST%';
 *   5. DELETE FROM jobs WHERE title LIKE 'BG_CAP_TEST%';
 *   6. Remove this file, commit, push
 */

const USER_ID = '938a2e17-0e49-45ff-bb98-810db46e5e65';

export const handler: Handler = async () => {
  const testId = `bgtest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  console.log(`[bg-cap-test] START testId=${testId} at=${startedAt}`);

  // ── Marker 1: START row (before sleep) ──────────────────────────────────
  const sb = admin();
  const { error: startErr } = await sb.from('jobs').insert({
    user_id: USER_ID,
    created_by_employee: 'bg-cap-test',
    assigned_to_employee: 'bg-cap-test',
    title: 'BG_CAP_TEST_START',
    status: 'running',
    progress: 0,
    result_payload: { testId, startedAt, phase: 'start' },
  });

  if (startErr) {
    console.error(`[bg-cap-test] START INSERT FAILED testId=${testId}`, startErr.message);
    // Continue anyway — console logs are the primary evidence.
  } else {
    console.log(`[bg-cap-test] START row written testId=${testId}`);
  }

  // ── Sleep 60 seconds ────────────────────────────────────────────────────
  await new Promise((resolve) => setTimeout(resolve, 60_000));

  const elapsedMs = Date.now() - startMs;
  const completedAt = new Date().toISOString();

  console.log(`[bg-cap-test] AWAKE testId=${testId} elapsed=${elapsedMs}ms`);

  // ── Marker 2: DONE row (after sleep) ────────────────────────────────────
  const { error: doneErr } = await sb.from('jobs').insert({
    user_id: USER_ID,
    created_by_employee: 'bg-cap-test',
    assigned_to_employee: 'bg-cap-test',
    title: 'BG_CAP_TEST_DONE',
    status: 'completed',
    progress: 100,
    result_payload: { testId, startedAt, completedAt, elapsedMs, phase: 'done' },
    completed_at: completedAt,
  });

  if (doneErr) {
    console.error(`[bg-cap-test] DONE INSERT FAILED testId=${testId}`, doneErr.message);
  } else {
    console.log(`[bg-cap-test] DONE row written testId=${testId} elapsed=${elapsedMs}ms`);
  }

  console.log(`[bg-cap-test] DONE testId=${testId} elapsed=${elapsedMs}ms`);
  return { statusCode: 200, body: JSON.stringify({ ok: true, testId, elapsedMs }) };
};
