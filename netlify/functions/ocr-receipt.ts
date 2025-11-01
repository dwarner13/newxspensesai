import OpenAI from 'openai';
import { validateUpload } from './_shared/guardrails';

type OcrRequest = {
  name: string;
  type: string; // MIME
  data: string; // base64 (no data: prefix)
};

export default async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const body = (await req.json()) as OcrRequest;
    const name = String(body?.name || 'upload');
    const type = String(body?.type || '');
    const b64 = String(body?.data || '');
    const sizeBytes = Math.floor(b64.length * 0.75);

    const v = validateUpload(name, sizeBytes);
    if (!v.ok) {
      return new Response(JSON.stringify({ ok: false, error: v.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ ok: false, error: 'OPENAI_API_KEY missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const dataUrl = `data:${type};base64,${b64}`;

    // Ask model to return strict JSON { text, confidence }
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'You extract text from receipts. Return strict JSON: {"text": string, "confidence": number between 0 and 1 }.' },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract all readable text from this receipt image. Return JSON only.' },
            { type: 'image_url', image_url: { url: dataUrl } as any },
          ] as any,
        },
      ],
      response_format: { type: 'json_object' } as any,
    });

    let text = '';
    let confidence = 0.8;
    try {
      const raw = completion.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(raw);
      if (typeof parsed.text === 'string') text = parsed.text;
      if (typeof parsed.confidence === 'number') confidence = parsed.confidence;
    } catch {}

    return new Response(JSON.stringify({ ok: true, text, confidence }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'ocr_failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};





