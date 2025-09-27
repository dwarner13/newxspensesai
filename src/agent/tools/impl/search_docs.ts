import { z } from 'zod';
import { KnowledgeRetriever } from '../../rag/retriever';

export const id = 'search_docs';

export const inputSchema = z.object({
  query: z.string(),
  packs: z.array(z.string()).optional(),
  top_k: z.number().min(1).max(20).default(5),
  include_web: z.boolean().default(true),
});

export const outputSchema = z.object({
  hits: z.array(z.object({
    title: z.string(),
    snippet: z.string(),
    source: z.string(),
    confidence: z.number(),
    citations: z.array(z.any()),
  })),
  search_type: z.enum(['knowledge_pack', 'web_cache', 'hybrid']),
});

export async function execute(input: any, ctx: any) {
  const retriever = new KnowledgeRetriever();
  
  // Search knowledge packs first
  const results = await retriever.retrieve(input.query, {
    topK: input.top_k,
    packs: input.packs || ['product', 'tax', 'business'],
    rerank: true,
  });
  
  if (results.length === 0 && input.include_web) {
    // Fallback to web cache
    const webResults = await retriever.retrieveFromWeb(input.query, {
      topK: input.top_k,
    });
    
    return {
      hits: webResults,
      search_type: 'web_cache',
    };
  }
  
  return {
    hits: results.map(r => ({
      title: r.title || 'Untitled',
      snippet: r.content.substring(0, 200),
      source: r.source,
      confidence: r.confidence,
      citations: r.citations,
    })),
    search_type: results.some(r => r.source.startsWith('web_'))
      ? 'hybrid'
      : 'knowledge_pack',
  };
}

export const metadata = {
  name: 'Search Documentation',
  description: 'Search through knowledge packs and cached web content',
  category: 'research',
  requiresConfirmation: false,
  costly: false,
};
