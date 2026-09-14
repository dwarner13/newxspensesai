/**
 * 🧠 Memory Extraction Worker
 * 
 * Phase 2.3: Processes memory extraction jobs from the queue asynchronously.
 * 
 * This function should be called periodically (via cron or scheduled function)
 * to process pending memory extraction jobs.
 * 
 * Usage:
 * - Manual trigger: POST /.netlify/functions/memory-extraction-worker
 * - Scheduled: Set up Netlify cron job or external scheduler
 * 
 * Processing:
 * - Claims next pending job from queue
 * - Runs memory extraction
 * - Marks job as completed or failed (with retry logic)
 */

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { extractAndSaveMemories } from './_shared/memory-extraction.js';

const MAX_JOBS_PER_RUN = 10; // Process up to 10 jobs per invocation

export const handler: Handler = async (event, context) => {
  // Method check
  if (event.httpMethod && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' }),
    };
  }

  // ── Internal auth gate ──────────────────────────────────────────────────
  // Requires MEMORY_WORKER_SECRET env var. Caller must send matching value
  // in x-worker-secret header. Prevents unauthenticated public invocation.
  const expectedSecret = process.env.MEMORY_WORKER_SECRET;
  if (!expectedSecret) {
    console.error('[Memory Worker] MEMORY_WORKER_SECRET env var is not set — rejecting request');
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Worker not configured' }),
    };
  }
  const providedSecret = event.headers?.['x-worker-secret'] || event.headers?.['X-Worker-Secret'];
  if (!providedSecret || providedSecret !== expectedSecret) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  const sb = admin();
  const processedJobs: string[] = [];
  const failedJobs: string[] = [];

  // ── Single-job mode: process one specific job by ID ─────────────────────
  // When POST body contains { "jobId": "<uuid>" }, process ONLY that row.
  // Does NOT enter the batch claim loop. Requires valid auth (checked above).
  let requestedJobId: string | null = null;
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    if (body.jobId && typeof body.jobId === 'string') {
      // Validate UUID format
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRe.test(body.jobId)) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid jobId format' }),
        };
      }
      requestedJobId = body.jobId;
    }
  } catch { /* invalid JSON body — fall through to batch mode */ }

  if (requestedJobId) {
    // Atomic claim: update pending -> processing only if still pending
    const { data: claimed, error: claimErr } = await sb
      .from('memory_extraction_queue')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', requestedJobId)
      .eq('status', 'pending')
      .select('id, user_id, session_id, user_message, assistant_response, retry_count, max_retries, created_at')
      .maybeSingle();

    if (claimErr) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to claim job', detail: claimErr.message }),
      };
    }
    if (!claimed) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Job not found or not pending' }),
      };
    }
    if (claimed.retry_count >= claimed.max_retries) {
      // Revert to pending — this row has exhausted retries
      await sb.from('memory_extraction_queue').update({ status: 'pending' }).eq('id', requestedJobId);
      return {
        statusCode: 409,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Job has exhausted retries' }),
      };
    }

    console.log(`[Memory Worker] Single-job mode: processing ${requestedJobId.substring(0, 8)}...`);

    try {
      await extractAndSaveMemories({
        userId: claimed.user_id,
        sessionId: claimed.session_id,
        redactedUserText: claimed.user_message,
        assistantResponse: claimed.assistant_response || undefined,
        statedAt: claimed.created_at,
      });

      await sb.rpc('complete_memory_extraction_job', { job_id: requestedJobId });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          mode: 'single-job',
          processed: 1,
          failed: 0,
          processedJobs: [requestedJobId.substring(0, 8) + '...'],
          jobId: requestedJobId,
          status: 'completed',
        }),
      };
    } catch (extractErr: any) {
      console.error(`[Memory Worker] Single-job extraction failed:`, extractErr?.message);
      await sb.rpc('fail_memory_extraction_job', {
        job_id: requestedJobId,
        error_msg: extractErr?.message || 'Single-job extraction failed',
      });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          mode: 'single-job',
          processed: 0,
          failed: 1,
          failedJobs: [requestedJobId.substring(0, 8) + '...'],
          jobId: requestedJobId,
          status: 'failed',
          error: extractErr?.message,
        }),
      };
    }
  }

  try {
    // Process up to MAX_JOBS_PER_RUN jobs (batch mode — no jobId specified)
    for (let i = 0; i < MAX_JOBS_PER_RUN; i++) {
      // Claim next pending job
      const { data: job, error: claimError } = await sb
        .rpc('claim_memory_extraction_job');

      if (claimError) {
        console.error('[Memory Worker] Error claiming job:', claimError);
        break;
      }

      // No more jobs available
      if (!job || job.length === 0) {
        console.log('[Memory Worker] No pending jobs found');
        break;
      }

      const jobData = job[0];
      const jobId = jobData.id;

      console.log(`[Memory Worker] Processing job ${jobId.substring(0, 8)}...`);

      try {
        // Run memory extraction
        await extractAndSaveMemories({
          userId: jobData.user_id,
          sessionId: jobData.session_id,
          redactedUserText: jobData.user_message, // Should already be PII-masked
          assistantResponse: jobData.assistant_response || undefined,
          statedAt: jobData.created_at,
        });

        // Mark as completed
        const { error: completeError } = await sb
          .rpc('complete_memory_extraction_job', { job_id: jobId });

        if (completeError) {
          console.error(`[Memory Worker] Error completing job ${jobId}:`, completeError);
        } else {
          processedJobs.push(jobId);
          console.log(`[Memory Worker] ✅ Completed job ${jobId.substring(0, 8)}...`);
        }
      } catch (extractionError: any) {
        console.error(`[Memory Worker] Extraction failed for job ${jobId}:`, extractionError);

        // Check for FK constraint errors - these should be marked as permanently failed
        const isFkError = extractionError?.code === '23503' || 
                          extractionError?.message?.includes('foreign key constraint') ||
                          extractionError?.message?.includes('violates foreign key constraint');
        
        if (isFkError) {
          // FK errors are permanent - mark as failed immediately (no retry)
          console.error(`[Memory Worker] ⛔ FK constraint violation for job ${jobId} - marking as permanently failed (no retry)`);
          
          const { error: failError } = await sb
            .from('memory_extraction_queue')
            .update({
              status: 'failed',
              retry_count: 999, // Set to max to prevent retry
              error_message: `FK constraint violation: ${extractionError.message || 'user_id does not exist in auth.users'}`,
              processed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', jobId);

          if (failError) {
            console.error(`[Memory Worker] Error marking FK error job as failed:`, failError);
          } else {
            failedJobs.push(jobId);
            console.log(`[Memory Worker] ⛔ Permanently failed job ${jobId.substring(0, 8)}... (FK error)`);
          }
        } else {
          // Other errors - use normal retry logic
          const { error: failError } = await sb
            .rpc('fail_memory_extraction_job', {
              job_id: jobId,
              error_msg: extractionError.message || 'Extraction failed'
            });

          if (failError) {
            console.error(`[Memory Worker] Error failing job ${jobId}:`, failError);
          } else {
            failedJobs.push(jobId);
            console.log(`[Memory Worker] ⚠️ Failed job ${jobId.substring(0, 8)}... (will retry if attempts remaining)`);
          }
        }
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        processed: processedJobs.length,
        failed: failedJobs.length,
        processedJobs: processedJobs.map(id => id.substring(0, 8) + '...'),
        failedJobs: failedJobs.map(id => id.substring(0, 8) + '...')
      }),
    };
  } catch (error: any) {
    console.error('[Memory Worker] Fatal error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
        processed: processedJobs.length,
        failed: failedJobs.length
      }),
    };
  }
};



