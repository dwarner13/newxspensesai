import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';

export const id = 'tag_merchant_insights';

export const inputSchema = z.object({
  merchant: z.string().min(1, 'Merchant name is required'),
});

export const outputSchema = z.object({
  merchant: z.string(),
  topCategory: z.string().nullable(),
  totalCorrections: z.number(),
  lastCorrectedAt: z.string().nullable().optional(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Get Tag's learning insights for a specific merchant
 * 
 * Shows how the user has categorized this merchant in the past,
 * including the most common category and total number of corrections.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { merchant } = input;
    const { userId } = ctx;

    // Determine base URL (dev vs production)
    const baseUrl = process.env.NETLIFY_DEV === 'true' 
      ? 'http://localhost:8888'
      : process.env.URL || '';

    if (!baseUrl) {
      return Err(new Error('Base URL not configured. Cannot call Tag merchant insights endpoint.'));
    }

    // Call Tag merchant insights Netlify function
    const response = await fetch(`${baseUrl}/.netlify/functions/tag-merchant-insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        merchant,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return Err(new Error(`Tag merchant insights failed: ${response.status} ${errorText}`));
    }

    const result = await response.json();

    // Map the response to our output schema
    return Ok({
      merchant: result.merchant || merchant,
      topCategory: result.topCategory || null,
      totalCorrections: result.totalCorrections || 0,
      lastCorrectedAt: result.lastCorrectedAt || null,
    });

  } catch (error) {
    return Err(error as Error);
  }
}

export const metadata = {
  name: 'Tag Merchant Insights',
  description: 'Get Tag\'s learning history for a specific merchant. Shows what category the user usually assigns to this merchant based on past corrections. Use this when users ask "what do I usually categorize [merchant] as?" or "what has Tag learned about [merchant]?"',
  requiresConfirmation: false,
  dangerous: false,
  category: 'categorization',
};







