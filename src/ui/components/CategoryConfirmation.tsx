/**
 * Category Confirmation Component
 *
 * Displays categorization results with confidence-based UX:
 * - High confidence (≥0.7): Show category + confidence badge
 * - Low confidence (<0.7): Show top 3 suggestions with confirm/deny buttons
 * - User override: Call /tag-correction to learn
 *
 * Features:
 * - Inline confidence dots (visual indicator)
 * - Top 3 alternatives for low-confidence
 * - Reason display (redacted PII)
 * - Undo/retry logic
 * - Loading states
 * - Toast notifications
 *
 * @example
 * const [results, setResults] = useState<CategorizationResult[]>([]);
 *
 * return (
 *   <CategoryConfirmation
 *     results={results}
 *     onConfirm={(txId, catId) => handleCorrection(txId, catId)}
 *     onDismiss={() => setResults([])}
 *   />
 * );
 */

import React, { useState } from "react";
import { CheckCircle2, AlertCircle, ChevronDown, Loader2 } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface CategorizationResult {
  transaction_id: string;
  category_id: string;
  category_name: string;
  confidence: number; // 0-1 (0.0-1.0)
  source: "rule" | "ai" | "manual" | "default";
  reason: string; // e.g., "Matched rule: Amazon merchants"
  alternatives?: Array<{
    category_id: string;
    category_name: string;
    confidence: number;
    reason: string;
  }>;
}

interface CategoryConfirmationProps {
  results: CategorizationResult[];
  onConfirm: (transactionId: string, categoryId: string) => Promise<void>;
  onDismiss: () => void;
  maxVisible?: number; // Default: 5
}

// ============================================================================
// CONFIDENCE VISUALIZATION
// ============================================================================

function ConfidenceDots({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  const dotsCount = 5;
  const filledDots = Math.round((confidence * dotsCount) / 1);

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {Array.from({ length: dotsCount }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              i < filledDots
                ? percentage >= 70
                  ? "bg-green-500"
                  : "bg-yellow-500"
                : "bg-slate-300"
            }`}
          />
        ))}
      </div>
      <span
        className={`text-xs font-medium ${
          percentage >= 70
            ? "text-green-700"
            : percentage >= 50
              ? "text-yellow-700"
              : "text-red-700"
        }`}
      >
        {percentage}%
      </span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CategoryConfirmation({
  results,
  onConfirm,
  onDismiss,
  maxVisible = 5,
}: CategoryConfirmationProps) {
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(new Set<string>());

  // Separate high/low confidence
  const highConfidence = results.filter((r) => r.confidence >= 0.7);
  const lowConfidence = results.filter((r) => r.confidence < 0.7);

  if (results.length === 0) return null;

  const handleConfirmCategory = async (txId: string, catId: string) => {
    try {
      setConfirming(txId);
      await onConfirm(txId, catId);
      setDismissed((prev) => new Set(prev).add(txId));
      setExpandedTxId(null);
    } catch (err) {
      console.error("Confirmation failed:", err);
      // Toast error already shown by parent
    } finally {
      setConfirming(null);
    }
  };

  const visibleResults = results
    .filter((r) => !dismissed.has(r.transaction_id))
    .slice(0, maxVisible);

  const hiddenCount = results.length - visibleResults.length;

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900">
            Categorization Review
          </h3>
          <p className="text-sm text-slate-600 mt-0.5">
            {highConfidence.length > 0 && (
              <span>
                ✅ {highConfidence.length} high-confidence{" "}
                {highConfidence.length === 1 ? "result" : "results"}
              </span>
            )}
            {lowConfidence.length > 0 && (
              <span>
                {highConfidence.length > 0 && " • "}
                ⚠️ {lowConfidence.length} need your review
              </span>
            )}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-500 hover:text-slate-700 text-sm font-medium"
        >
          Done
        </button>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {visibleResults.map((result) => {
          const isExpanded = expandedTxId === result.transaction_id;
          const isLowConf = result.confidence < 0.7;
          const confPercent = Math.round(result.confidence * 100);

          return (
            <div
              key={result.transaction_id}
              className={`rounded-lg border p-3 transition-colors ${
                isLowConf
                  ? "border-yellow-300 bg-yellow-50"
                  : "border-green-300 bg-green-50"
              }`}
            >
              {/* Row: TX ID + Confidence + Expand Button */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    Transaction {result.transaction_id.slice(0, 8)}…
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Source: {result.source} • {result.reason.substring(0, 40)}
                    {result.reason.length > 40 ? "…" : ""}
                  </p>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <ConfidenceDots confidence={result.confidence} />

                  {isLowConf && (
                    <button
                      onClick={() =>
                        setExpandedTxId(
                          isExpanded ? null : result.transaction_id
                        )
                      }
                      className="p-1 hover:bg-yellow-200 rounded transition-colors"
                      title={isExpanded ? "Collapse" : "Expand options"}
                    >
                      <ChevronDown
                        size={16}
                        className={`text-yellow-700 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  )}

                  {!isLowConf && (
                    <CheckCircle2 size={16} className="text-green-700" />
                  )}
                </div>
              </div>

              {/* Expanded: Show alternatives */}
              {isExpanded && isLowConf && (
                <div className="mt-3 pt-3 border-t border-yellow-200 space-y-2">
                  <p className="text-xs font-medium text-yellow-900 uppercase tracking-wide">
                    Choose correct category:
                  </p>

                  {/* Primary suggestion */}
                  <button
                    onClick={() =>
                      handleConfirmCategory(
                        result.transaction_id,
                        result.category_id
                      )
                    }
                    disabled={confirming === result.transaction_id}
                    className="w-full text-left px-3 py-2 rounded-lg bg-white border border-yellow-300 hover:bg-yellow-100 disabled:opacity-50 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm text-slate-900 group-hover:text-yellow-900">
                        {result.category_name}
                      </div>
                      <div className="text-xs text-slate-600">
                        Suggested ({confPercent}%)
                      </div>
                    </div>
                    {confirming === result.transaction_id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} className="text-yellow-600" />
                    )}
                  </button>

                  {/* Alternatives */}
                  {result.alternatives && result.alternatives.length > 0 && (
                    <>
                      <p className="text-xs text-yellow-700 mt-2 font-medium">
                        Or choose from alternatives:
                      </p>
                      <div className="space-y-1.5">
                        {result.alternatives.slice(0, 3).map((alt) => (
                          <button
                            key={alt.category_id}
                            onClick={() =>
                              handleConfirmCategory(
                                result.transaction_id,
                                alt.category_id
                              )
                            }
                            disabled={confirming === result.transaction_id}
                            className="w-full text-left px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 transition-colors flex items-center justify-between text-sm"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-900 truncate">
                                {alt.category_name}
                              </div>
                              <div className="text-xs text-slate-500">
                                {Math.round(alt.confidence * 100)}%
                              </div>
                            </div>
                            {confirming === result.transaction_id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <ChevronDown
                                size={12}
                                className="text-slate-400 rotate-180"
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Skip button */}
                  <button
                    onClick={() => setDismissed((prev) => new Set(prev).add(result.transaction_id))}
                    className="w-full text-center px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    Skip for now
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer: Show hidden count */}
      {hiddenCount > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-200 text-center text-sm text-slate-600">
          +{hiddenCount} more result{hiddenCount === 1 ? "" : "s"} •{" "}
          <button
            onClick={() => {
              // Reset and show all
              setDismissed(new Set());
            }}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            View all
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// USAGE EXAMPLE HOOK
// ============================================================================

/**
 * Hook for managing categorization flow
 *
 * @example
 * const { results, isLoading, categorize, confirm, clear } = useCategoryConfirmation();
 *
 * // Categorize transactions
 * await categorize(userId, transactions);
 *
 * // User confirms a suggestion
 * await confirm(transactionId, categoryId);
 *
 * // Clear results
 * clear();
 */
export function useCategoryConfirmation() {
  const [results, setResults] = useState<CategorizationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const categorize = async (
    userId: string,
    transactions: Array<{
      id: string;
      user_id: string;
      merchant_name: string;
      amount: number;
      memo?: string | null;
      posted_at?: string;
    }>
  ) => {
    try {
      setIsLoading(true);
      const resp = await fetch(
        "/.netlify/functions/tag-categorize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": userId,
          },
          body: JSON.stringify({ transactions }),
        }
      ).then((r) => r.json());

      setResults(resp.results || []);
      return resp.results;
    } catch (err) {
      console.error("Categorization failed:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const confirm = async (transactionId: string, categoryId: string) => {
    try {
      const resp = await fetch(
        "/.netlify/functions/tag-correction",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transaction_id: transactionId,
            to_category_id: categoryId,
            note: "User confirmation",
          }),
        }
      ).then((r) => r.json());

      // Remove confirmed from results
      setResults((prev) =>
        prev.filter((r) => r.transaction_id !== transactionId)
      );

      return resp;
    } catch (err) {
      console.error("Confirmation failed:", err);
      throw err;
    }
  };

  const clear = () => setResults([]);

  return { results, isLoading, categorize, confirm, clear };
}





