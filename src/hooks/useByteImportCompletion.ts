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
  importIds?: string[];
  enabled?: boolean;
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
  importIds,
  enabled = true,
  onImportCompleted,
}: UseByteImportCompletionOptions) {
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!userId) return;

    const supabase = getSupabase();
    if (!supabase) return;

    // Poll for recent imports that have completed (status='parsed')
    const checkImportStatus = async () => {
      try {
        const targets = Array.from(
          new Set(
            [importId, ...(Array.isArray(importIds) ? importIds : [])]
              .map((id) => String(id || '').trim())
              .filter(Boolean)
          )
        );
        if (targets.length > 0) {
          for (const targetImportId of targets) {
            const key = `${userId}:${targetImportId}`;

            // Skip if we've already handled this import
            if (completedImports.has(key)) {
              continue;
            }

            const { data, error } = await supabase
              .from('imports')
              .select('id, status, updated_at')
              .eq('id', targetImportId)
              .single();

            if (error || !data) continue;

            // When import status is 'parsed' or 'committed', normalization is complete
            if (data.status === 'parsed' || data.status === 'committed') {
              completedImports.add(key);

              // Emit BYTE_IMPORT_COMPLETED event
              emitBus('BYTE_IMPORT_COMPLETED', {
                importId: targetImportId,
                userId,
                timestamp: data.updated_at || new Date().toISOString(),
              });

              if (onImportCompleted) {
                onImportCompleted(targetImportId);
              }
            }
          }
        } else {
          // Safety guard: in Prime chat we only want completion for the active upload importId.
          // When importId is absent, do not emit from historical imports.
          return;
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
  }, [userId, importId, importIds, enabled, onImportCompleted]);
}

