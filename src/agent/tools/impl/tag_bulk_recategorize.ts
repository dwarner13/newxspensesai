import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';

export const id = 'tag_bulk_recategorize';

export const inputSchema = z.object({
  matchValue: z.string().min(1, 'Merchant name or keyword is required'),
  targetCategory: z.string().min(1, 'Target category is required'),
  matchType: z.enum(['contains', 'exact']).optional().default('contains'),
  confirmed: z.boolean().optional().default(false),
});

export const outputSchema = z.object({
  ok: z.boolean(),
  intent: z.enum(['preview', 'commit']),
  matchValue: z.string(),
  targetCategory: z.string(),
  matchCount: z.number(),
  updatedCount: z.number().optional(),
  samples: z.array(z.object({
    id: z.string(),
    merchant_name: z.string().nullable(),
    amount: z.number().nullable(),
    current_category: z.string(),
  })).optional(),
  message: z.string(),
  ruleSaved: z.boolean().optional(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

const BASE_URL = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:8888';

async function callTagAction(intent: 'preview' | 'commit', payload: object, authHeader: string) {
  const res = await fetch(`${BASE_URL}/.netlify/functions/tag-action`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'authorization': authHeader },
    body: JSON.stringify({ intent, ...payload }),
  });
  if (!res.ok) throw new Error(`tag-action ${intent} failed: ${await res.text()}`);
  return res.json();
}

export async function execute(input: Input, ctx: { userId: string; authHeader?: string }): Promise<Result<Output>> {
  try {
    const { matchValue, targetCategory, matchType, confirmed } = input;
    const authHeader = ctx.authHeader || '';

    // Step 1: Always preview first
    const preview = await callTagAction('preview', { matchValue, targetCategory, matchType }, authHeader);

    if (!preview.ok) {
      return Err(new Error(preview.error || 'Preview failed'));
    }

    // If no matches found
    if (preview.matchCount === 0) {
      return Ok({
        ok: true,
        intent: 'preview',
        matchValue,
        targetCategory,
        matchCount: 0,
        message: `I searched your transactions but found no matches for "${matchValue}". Double-check the merchant name and try again.`,
        samples: [],
      });
    }

    // If not confirmed yet, return preview for user to confirm
    if (!confirmed) {
      const sampleList = (preview.samples || [])
        .slice(0, 3)
        .map((s: any) => `- ${s.merchant_name || matchValue} - $${Math.abs(s.amount || 0).toFixed(2)} (currently: ${s.current_category})`)
        .join('\n');

      return Ok({
        ok: true,
        intent: 'preview',
        matchValue,
        targetCategory,
        matchCount: preview.matchCount,
        samples: preview.samples,
        message: `I found ${preview.matchCount} transaction${preview.matchCount !== 1 ? 's' : ''} matching "${matchValue}":\n${sampleList}\n\nShall I move all ${preview.matchCount} to **${targetCategory}**? This will also save a rule so future transactions are categorized correctly.`,
      });
    }

    // Step 2: Commit
    const commit = await callTagAction('commit', {
      matchValue,
      targetCategory,
      matchType,
      affectedIds: preview.affectedIds,
    }, authHeader);

    if (!commit.ok) {
      return Err(new Error(commit.error || 'Commit failed'));
    }

    return Ok({
      ok: true,
      intent: 'commit',
      matchValue,
      targetCategory,
      matchCount: preview.matchCount,
      updatedCount: commit.updatedCount,
      ruleSaved: true,
      message: `Done ✓ Updated ${commit.updatedCount} transaction${commit.updatedCount !== 1 ? 's' : ''} from "${preview.samples?.[0]?.current_category || 'previous category'}" -> **${targetCategory}**. Rule saved - future "${matchValue}" transactions will be categorized correctly.`,
    });

  } catch (error) {
    console.error('[tag_bulk_recategorize] Error:', error);
    return Err(error as Error);
  }
}

export const metadata = {
  name: 'Tag Bulk Recategorize',
  description: 'Bulk recategorize all transactions matching a merchant name or keyword. Use this when users say things like "change 7-Eleven to Groceries", "move all Tim Hortons to Food & Dining", "mark all X as Y", or "all transactions from Z should be category W". First previews matches and asks for confirmation, then commits all changes and saves a rule for future imports. Always use this for vendor-level category changes affecting multiple transactions.',
  requiresConfirmation: false,
  dangerous: false,
  category: 'categorization',
};