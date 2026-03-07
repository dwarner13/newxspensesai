import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';

export const id = 'summarize_import';

export const inputSchema = z.object({
  importId: z.string().describe('The ID of the import to summarize'),
  tone_profile: z.enum(['PROFESSIONAL_CEO', 'BRUTAL_ROAST', 'MINDFUL_THERAPIST', 'HYPE_MAN']).optional().describe('The tone to use for the summary'),
});

export const outputSchema = z.object({
  summary_markdown: z.string().describe('A formatted markdown summary of the import, including a link to review transactions.'),
  stats: z.object({
    total_spend: z.number(),
    top_category: z.string().nullable(),
    transaction_count: z.number(),
  }),
  tone_profile: z.string().optional(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

export async function execute(
  input: Input,
  ctx: { userId: string; authHeader?: string; abortSignal?: AbortSignal }
): Promise<Result<Output>> {
  try {
    const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:8888';
    const authHeader = ctx.authHeader || '';

    if (!authHeader) {
      return Err(new Error('Missing auth header for summarize_import'));
    }

    // Use existing tx-search endpoint to gather transactions for this import
    const res = await fetch(`${baseUrl}/.netlify/functions/tx-search`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: authHeader,
      },
      body: JSON.stringify({ importId: input.importId, limit: 1000 }),
      signal: ctx.abortSignal,
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return Err(new Error(payload?.error || `Failed to fetch transactions (${res.status})`));
    }

    const rows = payload.rows || [];
    const totals = payload.totals || { count: 0, spending: 0 };

    // Calculate top category
    const categoryCounts: Record<string, number> = {};
    for (const row of rows) {
      const cat = row.category || 'Uncategorized';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    let topCategory = null;
    let maxCount = 0;
    for (const [cat, count] of Object.entries(categoryCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topCategory = cat;
      }
    }

    const totalSpend = totals.spending || 0;
    const count = totals.count || 0;
    const tone = input.tone_profile || 'PROFESSIONAL_CEO';

    let header = '**Import Summary Report**';
    if (tone === 'BRUTAL_ROAST') header = '**Financial Carnage Report** 💀';
    else if (tone === 'MINDFUL_THERAPIST') header = '**Mindful Spending Reflection** 🧘';
    else if (tone === 'HYPE_MAN') header = '**CASH MOVES SUMMARY** 🚀';

    // The tone_profile is passed in the link URL so the frontend parser can detect it
    const summaryMarkdown = `
${header}
- **Transactions Scanned:** ${count}
- **Total Spend Found:** $${totalSpend.toFixed(2)}
- **Top Category:** ${topCategory || 'N/A'}

[Review Transactions 🔗](/dashboard/transactions?importId=${input.importId}&tone=${tone})
`.trim();

    return Ok({
      summary_markdown: summaryMarkdown,
      stats: {
        total_spend: totalSpend,
        top_category: topCategory,
        transaction_count: count,
      },
      tone_profile: tone,
    });
  } catch (error) {
    return Err(error as Error);
  }
}
