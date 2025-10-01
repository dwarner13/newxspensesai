import { fetch } from 'undici';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { createHash } from 'crypto';
import { getSupabaseServerClient } from '../db';

export interface WebSearchOptions {
  domains?: string[];
  maxResults?: number;
  maxAge?: number; // days
  requireHighAuthority?: boolean;
}

export interface WebResult {
  title: string;
  url: string;
  domain: string;
  summary: string;
  content: string;
  fetchedAt: string;
  confidence: number;
  authorityScore: number;
  freshnessScore: number;
}

export class WebResearcher {
  private readonly USER_AGENT = 'XspensesAI/1.0 (https://xspenses.ai)';
  private readonly TIMEOUT = 10000;
  
  async research(
    query: string,
    options: WebSearchOptions = {}
  ): Promise<WebResult[]> {
    const {
      domains = [],
      maxResults = 5,
      maxAge = 30,
      requireHighAuthority = false,
    } = options;
    
    const client = getSupabaseServerClient();
    
    // Get allowed domains
    const { data: sources } = await client
      .from('web_sources')
      .select('*')
      .eq('is_enabled', true)
      .in('domain', domains.length > 0 ? domains : undefined);
    
    if (!sources || sources.length === 0) {
      throw new Error('No approved domains available');
    }
    
    // Filter by authority if required
    const eligibleSources = requireHighAuthority
      ? sources.filter(s => s.authority_score >= 0.8)
      : sources;
    
    // Check cache first
    const cachedResults = await this.searchCache(query, eligibleSources, maxAge);
    
    if (cachedResults.length >= maxResults) {
      return cachedResults.slice(0, maxResults);
    }
    
    // Fetch fresh content if needed
    const freshResults = await this.fetchFreshContent(
      query,
      eligibleSources,
      maxResults - cachedResults.length
    );
    
    // Combine and rank
    const allResults = [...cachedResults, ...freshResults];
    
    // Score and sort by relevance
    const scored = await this.scoreResults(query, allResults);
    
    return scored.slice(0, maxResults);
  }
  
  private async searchCache(
    query: string,
    sources: any[],
    maxAge: number
  ): Promise<WebResult[]> {
    const client = getSupabaseServerClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);
    
    const { data: cached } = await client
      .from('web_cache')
      .select('*')
      .in('domain', sources.map(s => s.domain))
      .gte('fetched_at', cutoffDate.toISOString())
      .textSearch('content', query)
      .limit(10);
    
    if (!cached) return [];
    
    return cached.map(item => ({
      title: item.title,
      url: item.url,
      domain: item.domain,
      summary: item.summary || this.extractSummary(item.content, query),
      content: item.content,
      fetchedAt: item.fetched_at,
      confidence: item.confidence_score || 0.7,
      authorityScore: sources.find(s => s.domain === item.domain)?.authority_score || 0.5,
      freshnessScore: this.calculateFreshness(
        item.fetched_at,
        sources.find(s => s.domain === item.domain)?.freshness_half_life_days || 30
      ),
    }));
  }
  
  private async fetchFreshContent(
    query: string,
    sources: any[],
    needed: number
  ): Promise<WebResult[]> {
    const results: WebResult[] = [];
    
    for (const source of sources) {
      if (results.length >= needed) break;
      
      // Generate search URLs for this domain
      const urls = this.generateSearchUrls(query, source.domain);
      
      for (const url of urls) {
        try {
          const content = await this.fetchAndExtract(url);
          if (content) {
            results.push(content);
            
            // Cache the result
            await this.cacheContent(content);
          }
        } catch (error) {
          console.error(`Failed to fetch ${url}:`, error);
        }
      }
    }
    
    return results;
  }
  
  private async fetchAndExtract(url: string): Promise<WebResult | null> {
    try {
      // Check if domain is whitelisted
      const domain = new URL(url).hostname.replace('www.', '');
      const client = getSupabaseServerClient();
      
      const { data: source } = await client
        .from('web_sources')
        .select('*')
        .eq('domain', domain)
        .eq('is_enabled', true)
        .single();
      
      if (!source) {
        throw new Error(`Domain ${domain} not whitelisted`);
      }
      
      // Fetch with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.TIMEOUT);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const html = await response.text();
      
      // Extract readable content
      const doc = new JSDOM(html, { url});
      const reader = new Readability(doc.window.document);
      const article = reader.parse();
      
      if (!article) {
        throw new Error('Failed to extract content');
      }
      
      // Clean content
      const cleanContent = this.sanitizeContent(article.textContent || '');
      
      return {
        title: article.title || '',
        url,
        domain,
        summary: article.excerpt || this.extractSummary(cleanContent),
        content: cleanContent,
        fetchedAt: new Date().toISOString(),
        confidence: 0.8,
        authorityScore: source.authority_score,
        freshnessScore: 1.0, // Fresh content
      };
      
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error);
      return null;
    }
  }
  
  private sanitizeContent(content: string): string {
    // Remove PII patterns
    content = content.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN_REMOVED]');
    content = content.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REMOVED]');
    
    // Remove scripts and styles
    content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Normalize whitespace
    content = content.replace(/\s+/g, ' ').trim();
    
    return content;
  }
  
  private generateSearchUrls(query: string, domain: string): string[] {
    // Domain-specific URL patterns
    const patterns: Record<string, (q: string) => string[]> = {
      'canada.ca': (q) => [
        `https://www.canada.ca/en/sr/srb.html?q=${encodeURIComponent(q)}`,
        `https://www.canada.ca/en/revenue-agency/search.html?q=${encodeURIComponent(q)}`,
      ],
      'irs.gov': (q) => [
        `https://www.irs.gov/search?search=${encodeURIComponent(q)}`,
      ],
      'stripe.com': (q) => [
        `https://stripe.com/docs/search?q=${encodeURIComponent(q)}`,
      ],
      'quickbooks.intuit.com': (q) => [
        `https://quickbooks.intuit.com/learn-support/search?q=${encodeURIComponent(q)}`,
      ],
    };
    
    return patterns[domain]?.(query) || [`https://${domain}/search?q=${encodeURIComponent(query)}`];
  }
  
  private extractSummary(content: string, query?: string): string {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    
    if (query) {
      // Find sentences containing query terms
      const queryTerms = query.toLowerCase().split(/\s+/);
      const relevant = sentences.filter(s => 
        queryTerms.some(term => s.toLowerCase().includes(term))
      );
      
      if (relevant.length > 0) {
        return relevant.slice(0, 3).join(' ').substring(0, 500);
      }
    }
    
    // Return first 3 sentences
    return sentences.slice(0, 3).join(' ').substring(0, 500);
  }
  
  private calculateFreshness(
    fetchedAt: string,
    halfLifeDays: number
  ): number {
    const ageMs = Date.now() - new Date(fetchedAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    return Math.exp(-0.693 * ageDays / halfLifeDays);
  }
  
  private async cacheContent(content: WebResult): Promise<void> {
    const client = getSupabaseServerClient();
    const checksum = createHash('sha256')
      .update(content.content)
      .digest('hex');
    
    // Generate embedding
    const embedding = await this.generateEmbedding(content.content);
    
    await client
      .from('web_cache')
      .upsert({
        url: content.url,
        domain: content.domain,
        title: content.title,
        content: content.content,
        summary: content.summary,
        embedding,
        fetched_at: content.fetchedAt,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        checksum,
        confidence_score: content.confidence,
        extraction_method: 'readability',
        token_count: Math.ceil(content.content.length / 4),
      }, {
        onConflict: 'url',
      });
  }
  
  private async scoreResults(
    query: string,
    results: WebResult[]
  ): Promise<WebResult[]> {
    // Multi-factor scoring
    return results.map(result => {
      let score = 0;
      
      // Authority weight: 30%
      score += result.authorityScore * 0.3;
      
      // Freshness weight: 20%
      score += result.freshnessScore * 0.2;
      
      // Relevance weight: 40%
      const relevance = this.calculateRelevance(query, result.content);
      score += relevance * 0.4;
      
      // Confidence weight: 10%
      score += result.confidence * 0.1;
      
      return {
        ...result,
        confidence: score,
      };
    }).sort((a, b) => b.confidence - a.confidence);
  }
  
  private calculateRelevance(query: string, content: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    let matches = 0;
    for (const term of queryTerms) {
      if (contentLower.includes(term)) {
        matches++;
      }
    }
    
    return matches / queryTerms.length;
  }
  
  private async generateEmbedding(text: string): Promise<number[]> {
    // Implement embedding generation
    // This would use OpenAI or a local model
    return new Array(1536).fill(0); // Placeholder
  }
}
