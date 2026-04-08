import type { Handler } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';
import { verifyAuth } from './_shared/verifyAuth.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Lite statement preview - OCR + extract top transactions via Claude Haiku.
 * Does NOT write anything to the database.
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  try {
    const body = JSON.parse(event.body || '{}');
    const { fileBase64, filename } = body;

    if (!fileBase64) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'fileBase64 required' }) };
    }

    // 1. OCR via Google Vision (inline base64)
    const apiKey = (process.env.GOOGLE_VISION_API_KEY || '').trim();
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Google Vision API key not configured' }) };
    }

    console.log('[prime-preview] Starting OCR for', filename || 'unknown file');

    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;
    const visionBody = {
      requests: [{
        image: { content: fileBase64 },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
      }],
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const visionRes = await fetch(visionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(visionBody),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!visionRes.ok) {
      const errText = await visionRes.text();
      console.error('[prime-preview] Vision API error:', errText.slice(0, 300));
      return { statusCode: 200, headers, body: JSON.stringify({ transactions: [], error: 'OCR failed' }) };
    }

    const visionData = await visionRes.json();
    const rawText = visionData?.responses?.[0]?.fullTextAnnotation?.text
      || visionData?.responses?.[0]?.textAnnotations?.[0]?.description
      || '';

    if (!rawText.trim()) {
      return { statusCode: 200, headers, body: JSON.stringify({ transactions: [], error: 'No text extracted' }) };
    }

    console.log('[prime-preview] OCR extracted', rawText.length, 'chars');

    // 2. Extract transactions via Claude Haiku
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: 'You extract transactions from bank statement OCR text. Return JSON only, no other text.',
      messages: [{
        role: 'user',
        content: `Extract the top 10 transactions from this bank statement text. Return JSON only:\n{ "transactions": [{ "merchant": string, "amount": number, "type": "credit"|"debit", "date": "YYYY-MM-DD" }] }\nNo other text.\n\n---\n${rawText.slice(0, 6000)}`,
      }],
    });

    const replyText = response.content?.[0]?.type === 'text' ? response.content[0].text : '{}';

    // Parse JSON from reply (handle markdown fences)
    const jsonMatch = replyText.match(/\{[\s\S]*\}/);
    let transactions: any[] = [];
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        transactions = Array.isArray(parsed.transactions) ? parsed.transactions.slice(0, 10) : [];
      } catch { /* ignore parse errors */ }
    }

    console.log('[prime-preview] Extracted', transactions.length, 'transactions');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ transactions, ocrLength: rawText.length }),
    };
  } catch (err: any) {
    console.error('[prime-preview] Error:', err.message || err);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ transactions: [], error: 'Preview failed - try again in a moment.' }),
    };
  }
};
