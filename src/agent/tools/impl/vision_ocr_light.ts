import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import OpenAI from 'openai';

export const id = 'vision_ocr_light';

export const inputSchema = z.object({
  imageUrl: z.string().url('Image URL must be valid'),
  extractText: z.boolean().default(true),
  maxLength: z.number().min(100).max(5000).default(2000), // Limit text extraction
});

export const outputSchema = z.object({
  ok: z.boolean(),
  text: z.string(),
  extracted: z.boolean(),
  message: z.string(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Light Vision OCR for reading simple text from images
 * 
 * Uses OpenAI Vision API for basic text extraction (not full financial parsing).
 * For full statement parsing, Byte/Prime should be used first.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { imageUrl, extractText, maxLength } = input;

    if (!process.env.OPENAI_API_KEY) {
      return Err(new Error('OpenAI API key not configured'));
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    if (!extractText) {
      return Ok({
        ok: true,
        text: '',
        extracted: false,
        message: 'Text extraction skipped',
      });
    }

    console.log(`[Vision OCR Light] Extracting text from image: ${imageUrl.substring(0, 50)}...`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all visible text from this image. Return only the text, no commentary. If the image contains financial data, extract it but do not parse or structure it.',
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: maxLength,
      temperature: 0.1,
    });

    const text = response.choices[0]?.message?.content || '';
    const extracted = text.length > 0;

    if (!extracted) {
      return Ok({
        ok: true,
        text: '',
        extracted: false,
        message: 'No text could be extracted from the image',
      });
    }

    return Ok({
      ok: true,
      text: text.substring(0, maxLength), // Ensure we respect maxLength
      extracted: true,
      message: `Extracted ${text.length} characters of text`,
    });
  } catch (error: any) {
    console.error('[Vision OCR Light] Error:', error);
    return Err(new Error(`Vision OCR failed: ${error.message}`));
  }
}






