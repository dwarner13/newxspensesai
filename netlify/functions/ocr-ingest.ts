import type { Handler } from '@netlify/functions';
import { Configuration, OpenAIApi } from 'openai';
import Tesseract from 'tesseract.js';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  try {
    const { fileUrl, userId } = JSON.parse(event.body || '{}');
    if (!fileUrl) return { statusCode: 400, body: 'Missing fileUrl' };

    // Step 1: OCR (Tesseract fallback, else OCR.space if provided)
    let ocrText = '';
    try {
      const image = await fetch(fileUrl);
      const buffer = Buffer.from(await image.arrayBuffer());
      const result = await Tesseract.recognize(buffer, 'eng');
      ocrText = result.data.text.trim();
    } catch (err) {
      console.error('Tesseract failed', err);
      return { statusCode: 500, body: 'OCR failed' };
    }

    // Step 2: Clean text
    const cleaned = ocrText.replace(/\s+/g, ' ').slice(0, 6000);

    // Step 3: Send to OpenAI for parsing
    const ai = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Extract transactions from the text and return as JSON.'
        },
        {
          role: 'user',
          content: `Text:\n${cleaned}\n\nReturn JSON array: [{date, merchant, amount, category}]`
        }
      ],
      temperature: 0
    });

    const parsed = JSON.parse(ai.choices[0].message?.content || '[]');

    // Step 4: Save to Supabase
    if (userId) {
      const { data: doc } = await supabase
        .from('user_documents')
        .insert({ user_id: userId, source_url: fileUrl, raw_text: cleaned })
        .select()
        .single();

      if (doc) {
        const tx = parsed.map((t: any) => ({
          user_id: userId,
          document_id: doc.id,
          ...t
        }));
        await supabase.from('transactions').insert(tx);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, parsed })
    };
  } catch (err: any) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};


