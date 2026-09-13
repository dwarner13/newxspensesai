-- Fix ambiguous "id" column reference in claim_memory_extraction_job.
-- The RETURNS TABLE (id uuid, ...) output column name conflicts with
-- memory_extraction_queue.id in WHERE clauses. Fix: fully qualify all
-- references to the table's id column.

CREATE OR REPLACE FUNCTION claim_memory_extraction_job()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  session_id uuid,
  user_message text,
  assistant_response text,
  retry_count int
) AS $$
DECLARE
  claimed_id uuid;
BEGIN
  -- Find and lock the oldest pending job atomically
  SELECT q.id INTO claimed_id
  FROM public.memory_extraction_queue q
  WHERE q.status = 'pending'
    AND q.retry_count < q.max_retries
  ORDER BY q.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- If found, mark as processing and return the row
  IF claimed_id IS NOT NULL THEN
    UPDATE public.memory_extraction_queue
    SET status = 'processing',
        updated_at = now()
    WHERE memory_extraction_queue.id = claimed_id;

    RETURN QUERY
    SELECT
      q.id,
      q.user_id,
      q.session_id,
      q.user_message,
      q.assistant_response,
      q.retry_count
    FROM public.memory_extraction_queue q
    WHERE q.id = claimed_id;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql;
