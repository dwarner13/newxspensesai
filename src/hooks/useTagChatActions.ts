/**
 * useTagChatActions
 *
 * Intercepts Tag chat messages, detects action intents,
 * runs preview → confirmation → commit flow.
 */

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { fetchPrimeSummarySingleFlight } from '../lib/ai/primeSummaryClient';

export interface TagPreviewResult {
  matchValue: string;
  targetCategory: string;
  matchType: 'contains' | 'exact';
  matchCount: number;
  samples: Array<{
    id: string;
    merchant_name: string;
    amount: number;
    posted_at: string;
    current_category: string;
  }>;
  affectedIds: string[];
}

export interface UseTagChatActionsResult {
  pendingPreview: TagPreviewResult | null;
  isProcessing: boolean;
  handleTagMessage: (
    message: string,
    options: {
      userId: string;
      importId?: string | null;
      authToken: string;
      onConfirmMessage: (msg: string) => void; // inject message into chat
    }
  ) => Promise<boolean>; // returns true if intercepted, false if should fall through
  confirmAction: (options: { authToken: string; onSuccess: (msg: string) => void }) => Promise<void>;
  cancelAction: () => void;
}

// Classify intent client-side before hitting the backend
function classifyTagIntent(message: string): {
  matchValue: string;
  targetCategory: string;
  matchType: 'contains' | 'exact';
} | null {
  const actionVerbs = /\b(move|change|set|mark|categorize|recategorize|put|tag|assign|update)\b/i;
  if (!actionVerbs.test(message)) return null;

  const toPattern = /(?:move|change|set|mark|categorize|recategorize|put|tag|assign|update)\s+(?:all\s+)?["']?([^"']+?)["']?\s+(?:to|as)\s+["']?([^"'.,!?]+)["']?/i;
  const match = message.match(toPattern);
  if (!match) return null;

  const matchValue = match[1].trim();
  const targetCategory = match[2].trim();
  if (!matchValue || !targetCategory) return null;

  return {
    matchValue,
    targetCategory: targetCategory.charAt(0).toUpperCase() + targetCategory.slice(1),
    matchType: 'contains',
  };
}

export function useTagChatActions(): UseTagChatActionsResult {
  const [pendingPreview, setPendingPreview] = useState<TagPreviewResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTagMessage = useCallback(async (
    message: string,
    { userId, importId, authToken, onConfirmMessage }: {
      userId: string;
      importId?: string | null;
      authToken: string;
      onConfirmMessage: (msg: string) => void;
    }
  ): Promise<boolean> => {
    const intent = classifyTagIntent(message);
    if (!intent) return false; // not an action — fall through to chat

    setIsProcessing(true);
    try {
      const res = await fetch('/.netlify/functions/tag-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          intent: 'preview',
          matchValue: intent.matchValue,
          targetCategory: intent.targetCategory,
          matchType: intent.matchType,
          importId: importId || null,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        onConfirmMessage(`I couldn't find any transactions matching "${intent.matchValue}". Try a different keyword.`);
        return true;
      }

      if (data.matchCount === 0) {
        onConfirmMessage(`I searched your transactions but found nothing matching "${intent.matchValue}". Try a different keyword or check the spelling.`);
        return true;
      }

      setPendingPreview(data);

      // Inject Tag's confirmation message into chat
      const sampleList = data.samples
        .slice(0, 3)
        .map((s: any) => `• ${s.merchant_name} — ${Math.abs(s.amount).toFixed(2)} (currently: ${s.current_category})`)
        .join('\n');

      onConfirmMessage(
        `I found **${data.matchCount} transaction${data.matchCount !== 1 ? 's' : ''}** matching "${intent.matchValue}" to move to **${intent.targetCategory}**.\n\n${sampleList}${data.matchCount > 3 ? `\n• ...and ${data.matchCount - 3} more` : ''}\n\nConfirm to apply this change.`
      );

      return true;
    } catch {
      toast.error('Tag action failed — check your connection');
      return true;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const confirmAction = useCallback(async ({ authToken, onSuccess }: {
    authToken: string;
    onSuccess: (msg: string) => void;
  }) => {
    if (!pendingPreview) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/.netlify/functions/tag-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          intent: 'commit',
          matchValue: pendingPreview.matchValue,
          targetCategory: pendingPreview.targetCategory,
          matchType: pendingPreview.matchType,
          affectedIds: pendingPreview.affectedIds,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        toast.success(`Updated ${data.updatedCount} transactions to ${data.targetCategory}`);
        onSuccess(
          `Done. I've updated **${data.updatedCount} transaction${data.updatedCount !== 1 ? 's' : ''}** to **${data.targetCategory}** and saved a rule so future "${pendingPreview.matchValue}" transactions are categorized automatically.`
        );
        setPendingPreview(null);

        // Re-fire prime-summary so the summary reflects the change
        try {
          await fetchPrimeSummarySingleFlight({}, {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          });
        } catch {
          // non-fatal
        }
      } else {
        toast.error(data.error || 'Commit failed');
      }
    } catch {
      toast.error('Tag commit failed — check your connection');
    } finally {
      setIsProcessing(false);
    }
  }, [pendingPreview]);

  const cancelAction = useCallback(() => {
    setPendingPreview(null);
  }, []);

  return { pendingPreview, isProcessing, handleTagMessage, confirmAction, cancelAction };
}
