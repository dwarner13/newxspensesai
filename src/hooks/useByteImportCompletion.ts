/**
 * Hook to detect Byte import completion and emit BYTE_IMPORT_COMPLETED event
 * 
 * This hook monitors import status changes and ensures Byte sends exactly one
 * closing message when an import completes.
 */

import { useEffect, useRef } from 'react';
import { emitBus } from '../lib/bus';
import { getSupabase } from '../lib/supabase';

interface UseByteImportCompletionOptions {
  userId: string;
  importId?: string;
  onImportCompleted?: (importId: string) => void;
}

/**
 * Tracks which imports have already sent completion messages
 * Key: `${userId}:${importId}`
 */
const completedImports = new Set<string>();

export function useByteImportCompletion({
  userId,
  importId,
  onImportCompleted,
}: UseByteImportCompletionOptions) {
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId) return;

    const supabase = getSupabase();
    if (!supabase) return;

    // Poll for recent imports that have completed (status='parsed')
    const checkImportStatus = async () => {
      try {
        // If specific importId provided, check that one; otherwise check recent imports
        if (importId) {
          const key = `${userId}:${importId}`;
          
          // Skip if we've already handled this import
          if (completedImports.has(key)) {
            return;
          }

          const { data, error } = await supabase
            .from('imports')
            .select('id, status, updated_at')
            .eq('id', importId)
            .single();

          if (error || !data) return;

          // When import status is 'parsed', normalization is complete
          if (data.status === 'parsed') {
            completedImports.add(key);

            // Emit BYTE_IMPORT_COMPLETED event
            emitBus('BYTE_IMPORT_COMPLETED', {
              importId,
              userId,
              timestamp: data.updated_at || new Date().toISOString(),
            });

            if (onImportCompleted) {
              onImportCompleted(importId);
            }
          }
        } else {
          // Monitor all recent imports (last 10, created in last hour)
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          
          const { data: imports, error } = await supabase
            .from('imports')
            .select('id, status, updated_at')
            .eq('user_id', userId)
            .eq('status', 'parsed')
            .gte('created_at', oneHourAgo)
            .order('created_at', { ascending: false })
            .limit(10);

          if (error || !imports) return;

          // Emit event for any imports we haven't seen yet
          imports.forEach(imp => {
            const key = `${userId}:${imp.id}`;
            if (!completedImports.has(key)) {
              completedImports.add(key);
              emitBus('BYTE_IMPORT_COMPLETED', {
                importId: imp.id,
                userId,
                timestamp: imp.updated_at || new Date().toISOString(),
              });
            }
          });
        }
      } catch (err) {
        console.error('[useByteImportCompletion] Error checking import status:', err);
      }
    };

    // Check immediately, then poll every 3 seconds
    checkImportStatus();
    checkIntervalRef.current = setInterval(checkImportStatus, 3000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [userId, importId, onImportCompleted]);
}

