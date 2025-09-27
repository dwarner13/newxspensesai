import { DocumentProcessor } from '../../src/server/knowledge/documentProcessor';
import { WebResearcher } from '../../src/server/web/webResearcher';
import { getSupabaseServerClient } from '../../src/server/db';

export async function handleKnowledgeJobs(job: any): Promise<any> {
  const { type, payload } = job;
  
  switch (type) {
    case 'INGEST_KNOWLEDGE_PACK': {
      const { packName, documents } = payload;
      const processor = new DocumentProcessor();
      
      let processed = 0;
      let failed = 0;
      
      for (const doc of documents) {
        try {
          // Fetch content from storage
          const content = await fetchFromStorage(doc.storage_path);
          
          // Process with verification
          await processor.processDocument(content, {
            pack: packName,
            title: doc.title,
            storage_path: doc.storage_path,
          }, {
            chunkSize: 512,
            chunkOverlap: 128,
            extractMetadata: true,
            generateSummary: true,
          });
          
          processed++;
        } catch (error) {
          console.error(`Failed to process ${doc.title}:`, error);
          failed++;
        }
      }
      
      return { processed, failed };
    }
    
    case 'REFRESH_WEB_CACHE': {
      const researcher = new WebResearcher();
      const client = getSupabaseServerClient();
      
      // Get stale cache entries
      const { data: stale } = await client
        .from('web_cache')
        .select('url')
        .lt('expires_at', new Date().toISOString())
        .limit(50);
      
      let refreshed = 0;
      for (const entry of stale || []) {
        try {
          await researcher.refreshUrl(entry.url);
          refreshed++;
        } catch (error) {
          console.error(`Failed to refresh ${entry.url}:`, error);
        }
      }
      
      return { refreshed };
    }
    
    case 'DETECT_CONTRADICTIONS': {
      // Find contradicting information across sources
      const detector = new ContradictionDetector();
      const contradictions = await detector.scan();
      
      if (contradictions.length > 0) {
        const client = getSupabaseServerClient();
        
        // Store for review
        await client
          .from('content_verification')
          .insert(contradictions.map(c => ({
            source_id: c.source1,
            source_type: 'document',
            verification_type: 'contradiction',
            status: 'warning',
            details: {
              conflicting_source: c.source2,
              topic: c.topic,
              confidence: c.confidence,
            },
          })));
      }
      
      return { found: contradictions.length };
    }
    
    case 'CLEANUP_EXPIRED_CACHE': {
      const client = getSupabaseServerClient();
      
      // Delete expired web cache entries
      const { data: deleted } = await client
        .from('web_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');
      
      // Delete expired query cache entries
      const { data: deletedQueries } = await client
        .from('query_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');
      
      return { 
        deleted_cache: deleted?.length || 0,
        deleted_queries: deletedQueries?.length || 0,
      };
    }
    
    case 'UPDATE_ENTITY_RELATIONSHIPS': {
      const client = getSupabaseServerClient();
      
      // Find entities that might be related
      const { data: entities } = await client
        .from('knowledge_entities')
        .select('*')
        .limit(100);
      
      let relationships = 0;
      
      for (const entity1 of entities || []) {
        for (const entity2 of entities || []) {
          if (entity1.id === entity2.id) continue;
          
          // Simple relationship detection
          const similarity = calculateEntitySimilarity(entity1, entity2);
          
          if (similarity > 0.8) {
            await client
              .from('entity_relationships')
              .upsert({
                source_id: entity1.id,
                target_id: entity2.id,
                relationship_type: 'related',
                confidence: similarity,
              }, {
                onConflict: 'source_id,target_id,relationship_type',
              });
            
            relationships++;
          }
        }
      }
      
      return { relationships };
    }
    
    default:
      throw new Error(`Unknown job type: ${type}`);
  }
}

async function fetchFromStorage(storagePath: string): Promise<string> {
  // Implement storage fetching logic
  // This would fetch from Supabase storage or other storage systems
  throw new Error('Storage fetching not implemented');
}

class ContradictionDetector {
  async scan(): Promise<any[]> {
    const client = getSupabaseServerClient();
    const contradictions: any[] = [];
    
    // Find documents with similar topics but different information
    const { data: chunks } = await client
      .from('document_chunks')
      .select(`
        id,
        content,
        documents!inner(title, pack)
      `)
      .limit(100);
    
    // Simple contradiction detection
    for (let i = 0; i < chunks.length; i++) {
      for (let j = i + 1; j < chunks.length; j++) {
        const chunk1 = chunks[i];
        const chunk2 = chunks[j];
        
        // Check for contradictory statements
        if (this.hasContradiction(chunk1.content, chunk2.content)) {
          contradictions.push({
            source1: chunk1.id,
            source2: chunk2.id,
            topic: this.extractTopic(chunk1.content),
            confidence: 0.7,
          });
        }
      }
    }
    
    return contradictions;
  }
  
  private hasContradiction(text1: string, text2: string): boolean {
    // Simple contradiction detection based on keywords
    const contradictionPairs = [
      ['must', 'must not'],
      ['required', 'not required'],
      ['always', 'never'],
      ['true', 'false'],
    ];
    
    for (const [word1, word2] of contradictionPairs) {
      if (text1.toLowerCase().includes(word1) && text2.toLowerCase().includes(word2)) {
        return true;
      }
    }
    
    return false;
  }
  
  private extractTopic(text: string): string {
    // Extract the main topic from text
    const sentences = text.split('.');
    return sentences[0]?.substring(0, 50) || 'Unknown topic';
  }
}

function calculateEntitySimilarity(entity1: any, entity2: any): number {
  // Simple similarity calculation based on entity names
  const name1 = entity1.entity_name.toLowerCase();
  const name2 = entity2.entity_name.toLowerCase();
  
  if (name1 === name2) return 1.0;
  
  // Check if one contains the other
  if (name1.includes(name2) || name2.includes(name1)) {
    return 0.8;
  }
  
  // Check for common words
  const words1 = new Set(name1.split(' '));
  const words2 = new Set(name2.split(' '));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}
