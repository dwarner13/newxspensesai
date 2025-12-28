import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';

export const id = 'tag_explain_category';

export const inputSchema = z.object({
  transactionId: z.string().min(1, 'Transaction ID is required'),
});

export const outputSchema = z.object({
  category: z.string().nullable(),
  categorySource: z.enum(['manual', 'learned', 'ai', 'rule', 'unknown']),
  confidence: z.number().nullable(),
  learnedCount: z.number(),
  lastLearnedAt: z.string().nullable().optional(),
  message: z.string(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Explain why Tag categorized a specific transaction
 * 
 * Calls the Tag explain endpoint to get a human-friendly explanation
 * of how Tag decided on the category for this transaction.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { transactionId } = input;
    const { userId } = ctx;

    // Determine base URL (dev vs production)
    const baseUrl = process.env.NETLIFY_DEV === 'true' 
      ? 'http://localhost:8888'
      : process.env.URL || '';

    if (!baseUrl) {
      return Err(new Error('Base URL not configured. Cannot call Tag explain endpoint.'));
    }

    // Call Tag explain Netlify function
    const response = await fetch(`${baseUrl}/.netlify/functions/tag-explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        transactionId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return Err(new Error(`Tag explain failed: ${response.status} ${errorText}`));
    }

    const result = await response.json();

    // Map the response to our output schema
    return Ok({
      category: result.category || null,
      categorySource: result.categorySource || 'unknown',
      confidence: result.confidence ?? null,
      learnedCount: result.learnedCount || 0,
      lastLearnedAt: result.lastLearnedAt || null,
      message: result.message || 'No explanation available.',
    });

  } catch (error) {
    return Err(error as Error);
  }
}

export const metadata = {
  name: 'Tag Explain Category',
  description: 'Explain why Tag chose a specific category for a transaction. Use this when users ask "why is this categorized as X?" or "how did Tag decide this?"',
  requiresConfirmation: false,
  dangerous: false,
  category: 'categorization',
};







