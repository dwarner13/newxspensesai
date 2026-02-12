import type { Handler } from '@netlify/functions';
import { admin } from './_shared/upload.js';

export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, docIds } = body;
    if (!userId || !Array.isArray(docIds) || docIds.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Missing userId/docIds' }) };
    }

    const sb = admin();
    let { data: docs, error: docsError } = await sb
      .from('user_documents')
      .select('id, status, content_hash, extracted_data, ocr_engine, ocr_completed_at')
      .eq('user_id', userId)
      .in('id', docIds);
    if (docsError) {
      const message = String(docsError.message || '');
      const missingExtractedData = message.includes('extracted_data');
      const missingOcrEngine = message.includes('ocr_engine');
      if (missingExtractedData || missingOcrEngine) {
        ({ data: docs, error: docsError } = await sb
          .from('user_documents')
          .select('id, status, content_hash, ocr_completed_at')
          .eq('user_id', userId)
          .in('id', docIds));
      }
    }

    if (docsError) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: docsError.message }) };
    }

    const hashes = (docs || []).map((d: any) => d.content_hash).filter(Boolean);
    const documentIds = (docs || []).map((d: any) => d.id).filter(Boolean);
    let jobs: any[] = [];
    if (hashes.length > 0 || documentIds.length > 0) {
      let query = sb
        .from('ocr_jobs')
        .select('id, document_id, file_hash, status, engine_used, pages, confidence, normalized_json, error, updated_at')
        .eq('user_id', userId);
      if (documentIds.length > 0) {
        query = query.in('document_id', documentIds);
      } else if (hashes.length > 0) {
        query = query.in('file_hash', hashes);
      }
      const { data: jobsRows, error: jobsError } = await query;
      if (jobsError) {
        const message = String(jobsError.message || '');
        const missingOcrJobs = message.includes("public.ocr_jobs") || message.includes('relation "ocr_jobs"');
        if (!missingOcrJobs) {
          return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: jobsError.message }) };
        }
      } else {
        jobs = jobsRows || [];
      }
    }

    const jobByHash = new Map<string, any>();
    const jobByDocId = new Map<string, any>();
    for (const job of jobs) {
      if (!jobByHash.has(job.file_hash)) {
        jobByHash.set(job.file_hash, job);
      }
      if (job?.document_id && !jobByDocId.has(job.document_id)) {
        jobByDocId.set(job.document_id, job);
      }
    }

    const items = (docs || []).map((doc: any) => {
      const byDoc = jobByDocId.get(doc.id);
      const byHash = doc.content_hash ? jobByHash.get(doc.content_hash) : null;
      const job = byDoc || byHash || null;
      return {
        docId: doc.id,
        status: job?.status || (doc.status === 'ready' ? 'done' : doc.status === 'rejected' ? 'error' : 'running'),
        engineUsed: job?.engine_used || doc.ocr_engine || null,
        confidence: job?.confidence || doc?.extracted_data?.confidence?.overall || null,
        result: job?.normalized_json || doc.extracted_data || null,
        progress: job?.normalized_json?.debug?.progress || null,
        metrics: job?.normalized_json?.debug?.metrics || null,
        error: job?.error || null,
        updatedAt: job?.updated_at || doc.ocr_completed_at || null,
      };
    });

    const doneCount = items.filter((item) => item.status === 'done').length;
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        done: doneCount === items.length,
        items,
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: error?.message || 'Unexpected error' }),
    };
  }
};

