import { useState, useCallback } from "react";
import type { TxRow } from "./useTransactions";

interface UseLowConfidenceQueueOptions {
  userId: string;
  onReloadMetrics?: () => Promise<void>;
}

/**
 * useLowConfidenceQueue – Manages low-confidence categorization corrections
 * 
 * Handles:
 * - Batch approve (lock current suggestions as manual)
 * - Individual corrections (change category + lock)
 * - API calls to /tag-correction endpoint
 * - State updates after corrections
 */
export function useLowConfidenceQueue(options: UseLowConfidenceQueueOptions) {
  const { userId, onReloadMetrics } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Call /tag-correction to lock a category choice
   */
  const correctTransaction = useCallback(
    async (tx: TxRow, to_category_id: string) => {
      if (!userId) throw new Error("userId required");
      
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/.netlify/functions/tag-correction", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": userId,
          },
          body: JSON.stringify({
            transaction_id: tx.id,
            user_id: userId,
            to_category_id,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to correct transaction: ${response.statusText}`);
        }

        // Update local state
        tx.category_id = to_category_id;
        tx.source = "manual";
        tx.confidence = 1;

        return tx;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  /**
   * Batch approve all low-confidence transactions
   * Re-saves current suggestions as manual (locks them)
   */
  const approveAllLowConfidence = useCallback(
    async (rows: TxRow[]) => {
      if (!userId) throw new Error("userId required");

      try {
        setIsLoading(true);
        setError(null);

        const lowConfidence = rows.filter(
          r => (r.confidence ?? 1) < 0.6 && r.category_id
        );

        if (lowConfidence.length === 0) {
          console.log("No low-confidence transactions to approve");
          return;
        }

        // Batch corrections
        for (const tx of lowConfidence) {
          try {
            await fetch("/.netlify/functions/tag-correction", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-user-id": userId,
              },
              body: JSON.stringify({
                transaction_id: tx.id,
                user_id: userId,
                to_category_id: tx.category_id,
              }),
            });

            // Update local state
            tx.source = "manual";
            tx.confidence = 1;
          } catch (err) {
            console.error(`Failed to approve transaction ${tx.id}:`, err);
            // Continue with other transactions
          }
        }

        // Reload metrics after batch
        if (onReloadMetrics) {
          await onReloadMetrics();
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [userId, onReloadMetrics]
  );

  return {
    isLoading,
    error,
    correctTransaction,
    approveAllLowConfidence,
  };
}




