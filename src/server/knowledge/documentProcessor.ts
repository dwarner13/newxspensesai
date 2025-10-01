import { OpenAI } from 'openai';
import { createHash } from 'crypto';
import { getSupabaseServerClient } from '../db';

export interface ProcessingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  preserveStructure?: boolean;
  extractMetadata?: boolean;
  generateSummary?: boolean;
}

export class DocumentProcessor {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY});
  }
  
  async processDocument(
    content: string,
    metadata: any,
    options: ProcessingOptions = {}
  ): Promise<void> {
    const client = getSupabaseServerClient();
    
    // Calculate checksum
    const checksum = createHash('sha256').update(content).digest('hex');
    
    // Check if already processed
    const { data: existing } = await client
      .from('documents')
      .select('id, checksum')
      .eq('storage_path', metadata.storage_path)
      .single();
    
    if (existing?.checksum === checksum) {
      console.log('Document unchanged, skipping processing');
      return;
    }
    
    // Extract metadata if requested
    if (options.extractMetadata) {
      metadata = {
        ...metadata,
        ...await this.extractMetadata(content),
      };
    }
    
    // Store or update document
    const { data: doc } = await client
      .from('documents')
      .upsert({
        id: existing?.id,
        ...metadata,
        checksum,
        file_size: Buffer.byteLength(content, 'utf8'),
        version: existing ? (existing.version || 1) + 1 : 1,
      })
      .select()
      .single();
    
    // Smart chunking with structure preservation
    const chunks = await this.createChunks(content, options);
    
    // Generate embeddings in batches
    const embeddings = await this.generateEmbeddings(
      chunks.map(c => c.text)
    );
    
    // Delete old chunks if updating
    if (existing) {
      await client
        .from('document_chunks')
        .delete()
        .eq('document_id', existing.id);
    }
    
    // Store chunks with embeddings
    const chunkRecords = chunks.map((chunk, i) => ({
      document_id: doc.id,
      chunk_index: i,
      content: chunk.text,
      embedding: embeddings[i],
      metadata: chunk.metadata,
      token_count: this.countTokens(chunk.text),
      start_char: chunk.start,
      end_char: chunk.end,
      section_title: chunk.section,
    }));
    
    await client
      .from('document_chunks')
      .insert(chunkRecords);
    
    // Extract and store entities
    await this.extractEntities(doc.id, chunks);
    
    // Run content verification
    await this.verifyContent(doc.id, content);
  }
  
  private async createChunks(
    content: string,
    options: ProcessingOptions
  ): Promise<any[]> {
    const chunkSize = options.chunkSize || 512;
    const chunkOverlap = options.chunkOverlap || 128;
    
    const chunks: any[] = [];
    let start = 0;
    let index = 0;
    
    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      
      // Try to break at sentence boundaries
      let actualEnd = end;
      if (end < content.length) {
        const sentenceEnd = content.lastIndexOf('. ', end);
        if (sentenceEnd > start + chunkSize * 0.5) {
          actualEnd = sentenceEnd + 1;
        }
      }
      
      const text = content.substring(start, actualEnd).trim();
      
      if (text.length > 0) {
        // Extract section title if present
        const sectionMatch = content
          .substring(Math.max(0, start - 200), start)
          .match(/^#+\s+(.+)$/m);
        
        chunks.push({
          text,
          start,
          end: actualEnd,
          section: sectionMatch?.[1] || null,
          metadata: {
            chunk_index: index,
            total_chunks: Math.ceil(content.length / chunkSize),
          },
        });
        
        index++;
      }
      
      // Move start with overlap
      start = actualEnd - chunkOverlap;
      if (start <= 0) start = actualEnd;
    }
    
    return chunks;
  }
  
  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const batchSize = 20;
    const allEmbeddings: number[][] = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: batch,
      });
      
      allEmbeddings.push(
        ...response.data.map(item => item.embedding)
      );
    }
    
    return allEmbeddings;
  }
  
  private async extractMetadata(content: string): Promise<any> {
    // Extract dates, versions, authors
    const metadata: any = {};
    
    // Date extraction
    const dateMatch = content.match(
      /(?:updated?|revised?|published?):\s*(\d{4}-\d{2}-\d{2})/i
    );
    if (dateMatch) {
      metadata.document_date = dateMatch[1];
    }
    
    // Version extraction
    const versionMatch = content.match(/version:?\s*([\d.]+)/i);
    if (versionMatch) {
      metadata.document_version = versionMatch[1];
    }
    
    // Author extraction
    const authorMatch = content.match(/(?:author|by):\s*([^\n]+)/i);
    if (authorMatch) {
      metadata.author = authorMatch[1].trim();
    }
    
    return metadata;
  }
  
  private async extractEntities(
    documentId: string,
    chunks: any[]
  ): Promise<void> {
    // Use NER or rule-based extraction
    const entities = new Map<string, Set<string>>();
    
    for (const chunk of chunks) {
      // Extract tax terms
      const taxTerms = chunk.text.match(
        /\b(GST|HST|PST|T\d{4}|CRA|RRSP|TFSA|CPP|EI)\b/gi
      );
      if (taxTerms) {
        taxTerms.forEach(term => {
          if (!entities.has('regulation')) {
            entities.set('regulation', new Set());
          }
          entities.get('regulation')!.add(term.toUpperCase());
        });
      }
      
      // Extract amounts
      const amounts = chunk.text.match(/\$[\d,]+(?:\.\d{2})?/g);
      if (amounts) {
        amounts.forEach(amount => {
          if (!entities.has('amount')) {
            entities.set('amount', new Set());
          }
          entities.get('amount')!.add(amount);
        });
      }
      
      // Extract dates
      const dates = chunk.text.match(/\b\d{4}-\d{2}-\d{2}\b/g);
      if (dates) {
        dates.forEach(date => {
          if (!entities.has('date')) {
            entities.set('date', new Set());
          }
          entities.get('date')!.add(date);
        });
      }
      
      // Extract business terms
      const businessTerms = chunk.text.match(
        /\b(LLC|Inc|Corp|Ltd|Partnership|Sole Proprietorship)\b/gi
      );
      if (businessTerms) {
        businessTerms.forEach(term => {
          if (!entities.has('business_type')) {
            entities.set('business_type', new Set());
          }
          entities.get('business_type')!.add(term);
        });
      }
    }
    
    // Store unique entities
    const client = getSupabaseServerClient();
    for (const [type, values] of entities) {
      for (const value of values) {
        await client
          .from('knowledge_entities')
          .upsert({
            entity_type: type,
            entity_name: value,
            canonical_name: value.toLowerCase(),
          }, {
            onConflict: 'entity_type,canonical_name',
          });
      }
    }
  }
  
  private async verifyContent(
    documentId: string,
    content: string
  ): Promise<void> {
    const client = getSupabaseServerClient();
    const verifications = [];
    
    // PII scan
    const piiPattern = /\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b/g;
    const hasPII = piiPattern.test(content);
    
    verifications.push({
      source_id: documentId,
      source_type: 'document',
      verification_type: 'pii_scan',
      status: hasPII ? 'warning' : 'passed',
      details: { has_pii: hasPII },
    });
    
    // Check for outdated content
    const yearMatches = content.match(/\b20\d{2}\b/g);
    if (yearMatches) {
      const oldestYear = Math.min(...yearMatches.map(Number));
      const isOutdated = oldestYear < new Date().getFullYear() - 2;
      
      verifications.push({
        source_id: documentId,
        source_type: 'document',
        verification_type: 'freshness_check',
        status: isOutdated ? 'warning' : 'passed',
        details: { oldest_year: oldestYear },
      });
    }
    
    // Check for contradictions (simplified)
    const contradictionKeywords = ['however', 'but', 'although', 'despite', 'contrary'];
    const hasContradictions = contradictionKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
    
    if (hasContradictions) {
      verifications.push({
        source_id: documentId,
        source_type: 'document',
        verification_type: 'contradiction_check',
        status: 'warning',
        details: { has_contradiction_indicators: true },
      });
    }
    
    await client
      .from('content_verification')
      .insert(verifications);
  }
  
  private countTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}
