import { z } from 'zod';
import { DocumentProcessor } from '../../../server/knowledge/documentProcessor';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'manage_knowledge_pack';

export const inputSchema = z.object({
  action: z.enum(['upload', 'update', 'delete', 'list']),
  pack_name: z.string().optional(),
  documents: z.array(z.object({
    title: z.string(),
    content: z.string(),
    storage_path: z.string(),
  })).optional(),
  document_id: z.string().optional(),
});

export const outputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  pack_name: z.string().optional(),
  processed_documents: z.number().optional(),
  failed_documents: z.number().optional(),
});

export async function execute(input: any, ctx: any) {
  const { action, pack_name, documents, document_id } = input;
  
  try {
    switch (action) {
      case 'upload':
        return await uploadDocuments(pack_name!, documents!, ctx.userId);
        
      case 'update':
        return await updateDocument(document_id!, documents![0], ctx.userId);
        
      case 'delete':
        return await deleteDocument(document_id!, ctx.userId);
        
      case 'list':
        return await listPacks(ctx.userId);
        
      default:
        return {
          success: false,
          message: 'Invalid action',
        };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error.message}`,
    };
  }
}

async function uploadDocuments(
  packName: string,
  documents: any[],
  userId: string
): Promise<any> {
  const processor = new DocumentProcessor();
  const client = getSupabaseServerClient();
  
  let processed = 0;
  let failed = 0;
  
  for (const doc of documents) {
    try {
      await processor.processDocument(doc.content, {
        pack: packName,
        title: doc.title,
        storage_path: doc.storage_path,
        user_id: userId,
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
  
  return {
    success: true,
    message: `Processed ${processed} documents, ${failed} failed`,
    pack_name: packName,
    processed_documents: processed,
    failed_documents: failed,
  };
}

async function updateDocument(
  documentId: string,
  document: any,
  userId: string
): Promise<any> {
  const processor = new DocumentProcessor();
  
  try {
    await processor.processDocument(document.content, {
      id: documentId,
      title: document.title,
      storage_path: document.storage_path,
      user_id: userId,
    });
    
    return {
      success: true,
      message: 'Document updated successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to update document: ${error.message}`,
    };
  }
}

async function deleteDocument(
  documentId: string,
  userId: string
): Promise<any> {
  const client = getSupabaseServerClient();
  
  try {
    // Verify ownership
    const { data: doc } = await client
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();
    
    if (!doc) {
      return {
        success: false,
        message: 'Document not found or access denied',
      };
    }
    
    // Delete document (cascades to chunks)
    await client
      .from('documents')
      .delete()
      .eq('id', documentId);
    
    return {
      success: true,
      message: 'Document deleted successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to delete document: ${error.message}`,
    };
  }
}

async function listPacks(userId: string): Promise<any> {
  const client = getSupabaseServerClient();
  
  try {
    const { data: packs } = await client
      .from('documents')
      .select('pack, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('pack', { ascending: true });
    
    // Group by pack
    const packMap = new Map<string, any>();
    
    for (const doc of packs || []) {
      if (!packMap.has(doc.pack)) {
        packMap.set(doc.pack, {
          pack_name: doc.pack,
          documents: [],
          last_updated: doc.updated_at,
        });
      }
      
      packMap.get(doc.pack).documents.push({
        title: doc.title,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      });
    }
    
    return {
      success: true,
      message: `Found ${packMap.size} knowledge packs`,
      packs: Array.from(packMap.values()),
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to list packs: ${error.message}`,
    };
  }
}

export const metadata = {
  name: 'Manage Knowledge Pack',
  description: 'Upload, update, or delete documents in knowledge packs',
  category: 'knowledge',
  requiresConfirmation: true,
  mutates: true,
  costly: true,
  timeout: 60000,
};
