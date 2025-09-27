import { z } from 'zod';
import { WebResearcher } from '../../../server/web/webResearcher';

export const id = 'safe_web_research';

export const inputSchema = z.object({
  query: z.string(),
  domains: z.array(z.string()).optional(),
  max_results: z.number().min(1).max(10).default(3),
  require_high_authority: z.boolean().default(false),
});

export const outputSchema = z.object({
  results: z.array(z.object({
    title: z.string(),
    url: z.string(),
    summary: z.string(),
    domain: z.string(),
    fetched_at: z.string(),
    confidence: z.number(),
    authority_score: z.number(),
  })),
  query_interpretation: z.string().optional(),
});

export async function execute(input: any, ctx: any) {
  const researcher = new WebResearcher();
  
  try {
    const results = await researcher.research(input.query, {
      domains: input.domains,
      maxResults: input.max_results,
      requireHighAuthority: input.require_high_authority,
    });
    
    return {
      results: results.map(r => ({
        title: r.title,
        url: r.url,
        summary: r.summary,
        domain: r.domain,
        fetched_at: r.fetchedAt,
        confidence: r.confidence,
        authority_score: r.authorityScore,
      })),
      query_interpretation: `Searched for "${input.query}" across approved domains`,
    };
  } catch (error) {
    return {
      results: [],
      query_interpretation: `Failed to search: ${error.message}`,
    };
  }
}

export const metadata = {
  name: 'Safe Web Research',
  description: 'Research information from approved web sources only',
  category: 'research',
  requiresConfirmation: false,
  costly: true,
  timeout: 30000,
};
