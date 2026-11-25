/**
 * useTagChatActions
 *
 * Intercepts Tag chat messages, detects action intents and runs the SERVER proposal → explicit
 * confirmation flow (T-ACT-FINAL, owner GO 2026-11-25: one action safety contract however the
 * customer initiates a request).
 *
 * - The preview goes to tag-action WITH a conversation: the server verifies the full affected set,
 *   keeps customer-confirmed rows, writes the proposal text and records a signed 'proposed' receipt.
 * - The confirmation is tag-action commit_proposal with the proposal exactly as the server signed it;
 *   the server re-checks the scope (stale → nothing changes) and reports the verified count.
 * - Merchant detection is the shared detectUserActionIntent ("this" / "it" are never a merchant).
 */

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { fetchPrimeSummarySingleFlight } from '../lib/ai/primeSummaryClient';
import { detectUserActionIntent } from '../lib/tagActionConversation';
import { newClientMessageId } from '../lib/tagConversation';

export interface TagPreviewResult {
  matchValue: string;
  targetCategory: string;
  /** Existing transactions the proposal would change (server-verified). */
  matchCount: number;
  /** Signed proposal, echoed back unchanged on confirmation. */
  action: string;
  subject: Record<string, string | number | null>;
  sessionId: string | null;
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

type TagActionResponse = {
  ok?: boolean;
  error?: string;
  proposal?: { kind?: string; action?: unknown; subject?: unknown };
  conversation?: { sessionId?: string | null; reply?: string; receipt?: { state?: string; count?: number; result?: { affectedCount?: number } } | null };
  targetCategory?: string;
  matchValue?: string;
  matchCount?: number;
};

async function postTagAction(authToken: string, body: Record<string, unknown>): Promise<TagActionResponse> {
  const res = await fetch('/.netlify/functions/tag-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function useTagChatActions(): UseTagChatActionsResult {
  const [pendingPreview, setPendingPreview] = useState<TagPreviewResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTagMessage = useCallback(async (
    message: string,
    { authToken, onConfirmMessage }: {
      userId: string;
      importId?: string | null;
      authToken: string;
      onConfirmMessage: (msg: string) => void;
    }
  ): Promise<boolean> => {
    const intent = detectUserActionIntent(message);
    if (!intent) return false; // not an action - fall through to chat

    setIsProcessing(true);
    setPendingPreview(null);
    try {
      const data = await postTagAction(authToken, {
        intent: 'preview',
        matchValue: intent.matchValue,
        targetCategory: intent.targetCategory,
        matchType: intent.matchType,
        conversation: { customerText: message, clientMessageId: newClientMessageId() },
      });
      // Tag's words come from the server (proposal, "no matches", or "which category?").
      const reply = data.conversation?.reply
        || `I couldn't check "${intent.matchValue}" just now, so nothing has changed. Try again?`;
      const p = data.proposal;
      if (p && p.kind === 'action' && typeof p.action === 'string' && p.subject && typeof p.subject === 'object'
          && data.conversation?.receipt?.state === 'proposed') {
        const subject = p.subject as Record<string, string | number | null>;
        setPendingPreview({
          matchValue: String(data.matchValue ?? intent.matchValue),
          targetCategory: String(data.targetCategory ?? subject.targetCategory ?? intent.targetCategory),
          matchCount: Number(subject.affected ?? 0),
          action: p.action,
          subject,
          sessionId: data.conversation?.sessionId ?? null,
        });
      }
      onConfirmMessage(reply);
      return true;
    } catch {
      toast.error('Tag action failed - check your connection');
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
      const data = await postTagAction(authToken, {
        intent: 'commit_proposal',
        action: pendingPreview.action,
        subject: pendingPreview.subject,
        conversation: {
          customerText: 'yes',
          clientMessageId: newClientMessageId(),
          ...(pendingPreview.sessionId ? { sessionId: pendingPreview.sessionId } : {}),
        },
      });
      const receipt = data.conversation?.receipt;
      const reply = data.conversation?.reply || "I couldn't confirm whether that went through. Please check your transactions before trying again.";
      if (receipt?.state === 'completed') {
        const n = typeof receipt.count === 'number' ? receipt.count : (receipt.result?.affectedCount ?? 0);
        toast.success(`Updated ${n} transaction${n !== 1 ? 's' : ''}`);
        onSuccess(reply);
        // Re-fire prime-summary so the summary reflects the change
        try {
          await fetchPrimeSummarySingleFlight({}, { headers: { Authorization: `Bearer ${authToken}` } });
        } catch {
          // non-fatal
        }
      } else {
        // Stale / no matching proposal / failure: the server says what happened; nothing is claimed.
        onSuccess(reply);
        toast.error('Nothing was changed');
      }
      setPendingPreview(null);
    } catch {
      // The request failed: the outcome is unknown. No automatic retry.
      toast.error("Couldn't confirm whether that went through - check your transactions before trying again");
    } finally {
      setIsProcessing(false);
    }
  }, [pendingPreview]);

  const cancelAction = useCallback(() => {
    setPendingPreview(null);
  }, []);

  return { pendingPreview, isProcessing, handleTagMessage, confirmAction, cancelAction };
}
