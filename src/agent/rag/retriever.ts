import { OpenAI } from 'openai';
import { getSupabaseServerClient } from '../../server/db';
import { createHash } from 'crypto';

export interface RetrievalOptions {
  topK?: number;
  packs?: string[];
  domains?: string[];
  minConfidence?: number;
  includeSources?: boolean;
  maxAge?: number; // days
  rerank?: boolean;
}

export interface SearchResult {
  id: string;
  content: string;
  title: string;
  source: string;
  confidence: number;
  metadata: any;
  citations: Citation[];
}

export interface Citation {
  id: string;
  title: string;
  source: string;
  url?: string;
  date?: string;
  confidence: number;
}

export class KnowledgeRetriever {
  private openai: OpenAI;
  private cache: Map<string, { result: any; expires: number }>;
  
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY});
    this.cache = new Map();
  }
  
  async retrieve(
    query: string,
    options: RetrievalOptions = {}
  ): Promise<SearchResult[]> {
    const {
      topK = 10,
      packs = [],
      minConfidence = 0.7,
      rerank = true,
    } = options;
    
    // Check cache
    const cacheKey = this.getCacheKey(query, options);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.result;
    }
    
    // Generate query embedding
    const queryEmbedding = await this.getEmbedding(query);
    
    // Parallel retrieval strategies
    const [semantic, keyword, knowledge] = await Promise.all([
      this.semanticSearch(queryEmbedding, options),
      this.keywordSearch(query, options),
      this.knowledgeGraphSearch(query, options),
    ]);
    
    // Reciprocal rank fusion
    const fused = this.reciprocalRankFusion([semantic, keyword, knowledge]);
    
    // Rerank if requested
    let results = fused;
    if (rerank && results.length > 0) {
      results = await this.rerankResults(query, results);
    }
    
    // Apply MMR for diversity
    results = this.maximalMarginalRelevance(results, queryEmbedding);
    
    // Filter by confidence
    results = results.filter(r => r.confidence >= minConfidence);
    
    // Limit results
    results = results.slice(0, topK);
    
    // Add citations
    results = await this.addCitations(results);
    
    // Cache results
    this.cache.set(cacheKey, {
      result: results,
      expires: Date.now() + 60 * 60 * 1000, // 1 hour});
    
    // Log for feedback
    await this.logRetrieval(query, results);
    
    return results;
  }
  
  private async semanticSearch(
    queryEmbedding: number[],
    options: RetrievalOptions
  ): Promise<SearchResult[]> {
    const client = getSupabaseServerClient();
    
    let query = client
      .rpc('hybrid_search', {
        query_embedding: queryEmbedding,
        query_text: '',
        pack_filter: options.packs?.[0] || null,
        limit_results: 20,
      });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Semantic search error:', error);
      return [];
    }
    
    return data.map((item: any) => ({
      id: item.chunk_id,
      content: item.content,
      confidence: item.semantic_score,
      metadata: {},
      citations: [],
    }));
  }
  
  private async keywordSearch(
    query: string,
    options: RetrievalOptions
  ): Promise<SearchResult[]> {
    const client = getSupabaseServerClient();
    
    const { data, error } = await client
      .from('document_chunks')
      .select(`
        id,
        content,
        metadata,
        documents!inner(title, pack)
      `)
      .textSearch('content', query)
      .limit(20);
    
    if (error) {
      console.error('Keyword search error:', error);
      return [];
    }
    
    return data.map((item: any) => ({
      id: item.id,
      content: item.content,
      title: item.documents.title,
      source: item.documents.pack,
      confidence: 0.7, // Default for keyword matches
      metadata: item.metadata,
      citations: [],
    }));
  }
  
  private async knowledgeGraphSearch(
    query: string,
    options: RetrievalOptions
  ): Promise<SearchResult[]> {
    // Find related entities
    const client = getSupabaseServerClient();
    
    const { data: entities } = await client
      .from('knowledge_entities')
      .select('*')
      .textSearch('entity_name', query)
      .limit(5);
    
    if (!entities || entities.length === 0) {
      return [];
    }
    
    // Find documents containing these entities
    const results: SearchResult[] = [];
    for (const entity of entities) {
      const { data: chunks } = await client
        .from('document_chunks')
        .select('*')
        .textSearch('content', entity.canonical_name)
        .limit(5);
      
      if (chunks) {
        results.push(...chunks.map((chunk: any) => ({
          id: chunk.id,
          content: chunk.content,
          confidence: 0.8,
          metadata: { entity: entity.entity_name },
          citations: [],
        })));
      }
    }
    
    return results;
  }
  
  private reciprocalRankFusion(
    resultSets: SearchResult[][]
  ): SearchResult[] {
    const k = 60;
    const scoreMap = new Map<string, number>();
    const resultMap = new Map<string, SearchResult>();
    
    for (const results of resultSets) {
      results.forEach((result, rank) => {
        const score = 1 / (k + rank + 1);
        const currentScore = scoreMap.get(result.id) || 0;
        scoreMap.set(result.id, currentScore + score);
        resultMap.set(result.id, result);
      });
    }
    
    return Array.from(scoreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, score]) => {
        const result = resultMap.get(id)!;
        result.confidence = Math.min(score * 2, 1); // Normalize
        return result;
      });
  }
  
  private async rerankResults(
    query: string,
    results: SearchResult[]
  ): Promise<SearchResult[]> {
    // Use a cross-encoder or LLM for reranking
    const prompt = `Query: "${query}"
    
    Rank these passages by relevance (1-10):
    ${results.map((r, i) => `${i + 1}. ${r.content.substring(0, 200)}`).join('\n')}
    
    Return only the indices in order of relevance.`;
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      });
      
      const indices = response.choices[0].message.content
        ?.match(/\d+/g)
        ?.map(n => parseInt(n) - 1) || [];
      
      return indices
        .filter(i => i >= 0 && i < results.length)
        .map(i => results[i]);
    } catch (error) {
      console.error('Reranking error:', error);
      return results;
    }
  }
  
  private maximalMarginalRelevance(
    results: SearchResult[],
    queryEmbedding: number[],
    lambda: number = 0.5
  ): SearchResult[] {
    if (results.length <= 1) return results;
    
    const selected: SearchResult[] = [results[0]];
    const remaining = results.slice(1);
    
    while (remaining.length > 0 && selected.length < 10) {
      let bestScore = -Infinity;
      let bestIndex = -1;
      
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        
        // Relevance to query
        const relevance = candidate.confidence;
        
        // Maximum similarity to selected documents
        const maxSim = selected.reduce((max, doc) => {
          const sim = this.textSimilarity(candidate.content, doc.content);
          return Math.max(max, sim);
        }, 0);
        
        // MMR score
        const mmrScore = lambda * relevance - (1 - lambda) * maxSim;
        
        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIndex = i;
        }
      }
      
      if (bestIndex !== -1) {
        selected.push(remaining[bestIndex]);
        remaining.splice(bestIndex, 1);
      } else {
        break;
      }
    }
    
    return selected;
  }
  
  private textSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
  
  private async getEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    
    return response.data[0].embedding;
  }
  
  private getCacheKey(query: string, options: RetrievalOptions): string {
    return createHash('sha256')
      .update(query)
      .update(JSON.stringify(options))
      .digest('hex');
  }
  
  private async addCitations(results: SearchResult[]): Promise<SearchResult[]> {
    const client = getSupabaseServerClient();
    
    for (const result of results) {
      if (result.id) {
        // Get document info
        const { data: chunk } = await client
          .from('document_chunks')
          .select(`
            documents!inner(
              title,
              pack,
              metadata,
              updated_at
            )
          `)
          .eq('id', result.id)
          .single();
        
        if (chunk) {
          result.citations = [{
            id: result.id,
            title: chunk.documents.title,
            source: chunk.documents.pack,
            date: chunk.documents.updated_at,
            confidence: result.confidence,
          }];
        }
      }
    }
    
    return results;
  }
  
  private async logRetrieval(
    query: string,
    results: SearchResult[]
  ): Promise<void> {
    // Log for analytics and improvement
    const client = getSupabaseServerClient();
    
    await client
      .from('query_cache')
      .upsert({
        query_hash: this.getCacheKey(query, {}),
        query_text: query,
        results: results.map(r => ({
          id: r.id,
          confidence: r.confidence,
        })),
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      }, {
        onConflict: 'query_hash',
      });
  }
}
