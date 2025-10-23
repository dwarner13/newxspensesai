/**
 * Tag AI SDK Client
 * 
 * Unified interface for all Tag AI categorization endpoints.
 * Handles authentication (x-user-id), error handling, and response formatting.
 * 
 * Usage:
 * ```
 * const tagClient = createTagClient(userId);
 * const result = await tagClient.categorize(transactionIds);
 * const explanation = await tagClient.why(txId);
 * const corrected = await tagClient.correct(txId, categoryId);
 * ```
 */

import type { TxRow } from "@/hooks/useTransactions";

export interface CategorizeResult {
  ok: boolean;
  results?: Array<{
    transaction_id: string;
    category_id: string;
    confidence: number;
    reason?: string;
    suggestions?: Array<{
      category_id: string;
      confidence: number;
      label: string;
    }>;
  }>;
  error?: string;
}

export interface WhyResult {
  ok: boolean;
  explanation?: {
    tx: {
      merchant_name: string;
      amount: number;
      posted_at?: string;
      memo?: string;
    };
    latest: {
      category_id: string;
      source: "ai" | "manual" | "rule";
      confidence: number;
      reason?: string;
      version: number;
      decided_at: string;
    };
    ai?: {
      confidence: number;
      rationale?: string;
    };
    suggestions: string[];
  };
  error?: string;
}

export interface CorrectionResult {
  ok: boolean;
  transaction_id?: string;
  category_id?: string;
  source?: "manual";
  confidence?: number;
  version?: number;
  error?: string;
}

export interface CategoriesResult {
  ok: boolean;
  categories?: Array<{
    id: string;
    name: string;
    emoji?: string;
  }>;
  error?: string;
}

export interface RulesResult {
  ok: boolean;
  rules?: Array<{
    id: string;
    merchant_name: string;
    category_id: string;
    category_name?: string;
    created_at: string;
  }>;
  error?: string;
}

export interface HistoryResult {
  ok: boolean;
  history?: Array<{
    version: number;
    category_id: string;
    source: "ai" | "manual" | "rule";
    confidence: number;
    decided_at: string;
  }>;
  error?: string;
}

export interface ExportResult {
  ok: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
}

/**
 * Tag AI Client Class
 */
export class TagAIClient {
  private userId: string;
  private baseUrl: string;

  constructor(userId: string, baseUrl: string = "") {
    this.userId = userId;
    this.baseUrl = baseUrl || "";
  }

  /**
   * Categorize transactions
   * 
   * @param txIds - Transaction IDs to categorize
   * @returns Categorization results with confidence levels
   */
  async categorize(txIds: string[]): Promise<CategorizeResult> {
    if (txIds.length === 0) {
      return { ok: false, error: "No transaction IDs provided" };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/.netlify/functions/tag-categorize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": this.userId,
          },
          body: JSON.stringify({
            transaction_ids: txIds,
            mode: "write",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[TagAI] categorize failed:", msg);
      return { ok: false, error: msg };
    }
  }

  /**
   * Preview categorization without saving
   * 
   * @param txIds - Transaction IDs to preview
   * @returns Suggestions only (not saved)
   */
  async categorizeDryRun(txIds: string[]): Promise<CategorizeResult> {
    if (txIds.length === 0) {
      return { ok: false, error: "No transaction IDs provided" };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/.netlify/functions/tag-categorize-dryrun`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": this.userId,
          },
          body: JSON.stringify({
            transaction_ids: txIds,
            mode: "preview",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[TagAI] categorizeDryRun failed:", msg);
      return { ok: false, error: msg };
    }
  }

  /**
   * Manually correct a categorization
   * 
   * @param txId - Transaction ID
   * @param categoryId - Target category ID
   * @returns Confirmation with new metadata
   */
  async correct(txId: string, categoryId: string): Promise<CorrectionResult> {
    if (!txId || !categoryId) {
      return {
        ok: false,
        error: "Missing txId or categoryId",
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/.netlify/functions/tag-correction`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": this.userId,
          },
          body: JSON.stringify({
            transaction_id: txId,
            to_category_id: categoryId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[TagAI] correct failed:", msg);
      return { ok: false, error: msg };
    }
  }

  /**
   * Get explanation for why a transaction was categorized
   * 
   * @param txId - Transaction ID
   * @returns Explanation with AI reasoning
   */
  async why(txId: string): Promise<WhyResult> {
    if (!txId) {
      return { ok: false, error: "Missing txId" };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/.netlify/functions/tag-why?transaction_id=${txId}`,
        {
          headers: { "x-user-id": this.userId },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[TagAI] why failed:", msg);
      return { ok: false, error: msg };
    }
  }

  /**
   * Get all user categories
   * 
   * @returns List of categories with emoji
   */
  async getCategories(): Promise<CategoriesResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/.netlify/functions/tag-categories`,
        {
          headers: { "x-user-id": this.userId },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[TagAI] getCategories failed:", msg);
      return { ok: false, error: msg };
    }
  }

  /**
   * Get categorization rules for merchant automation
   * 
   * @returns List of rules
   */
  async getRules(): Promise<RulesResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/.netlify/functions/tag-rules`,
        {
          headers: { "x-user-id": this.userId },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[TagAI] getRules failed:", msg);
      return { ok: false, error: msg };
    }
  }

  /**
   * Create a new categorization rule
   * 
   * @param merchantName - Merchant name to match
   * @param categoryId - Category ID to assign
   * @returns Confirmation
   */
  async createRule(
    merchantName: string,
    categoryId: string
  ): Promise<{ ok: boolean; error?: string }> {
    if (!merchantName || !categoryId) {
      return { ok: false, error: "Missing merchantName or categoryId" };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/.netlify/functions/tag-rules`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": this.userId,
          },
          body: JSON.stringify({
            merchant_name: merchantName,
            category_id: categoryId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[TagAI] createRule failed:", msg);
      return { ok: false, error: msg };
    }
  }

  /**
   * Get categorization history for a transaction
   * 
   * @param txId - Transaction ID
   * @returns History of all categorization versions
   */
  async getHistory(txId: string): Promise<HistoryResult> {
    if (!txId) {
      return { ok: false, error: "Missing txId" };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/.netlify/functions/tag-tx-categ-history?transaction_id=${txId}`,
        {
          headers: { "x-user-id": this.userId },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[TagAI] getHistory failed:", msg);
      return { ok: false, error: msg };
    }
  }

  /**
   * Export corrections as CSV
   * 
   * @param windowDays - Time window in days (1-90, default 30)
   * @returns CSV blob with filename
   */
  async exportCorrections(windowDays: number = 30): Promise<ExportResult> {
    const validDays = Math.max(1, Math.min(90, windowDays));

    try {
      const response = await fetch(
        `${this.baseUrl}/.netlify/functions/tag-export-corrections?windowDays=${validDays}`,
        {
          headers: { "x-user-id": this.userId },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const filename = `categorization_corrections_${validDays}d_${new Date().toISOString().split('T')[0]}.csv`;

      return { ok: true, blob, filename };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[TagAI] exportCorrections failed:", msg);
      return { ok: false, error: msg };
    }
  }

  /**
   * Download exported corrections (triggers browser download)
   * 
   * @param windowDays - Time window in days (1-90, default 30)
   */
  async downloadCorrections(windowDays: number = 30): Promise<void> {
    const result = await this.exportCorrections(windowDays);

    if (!result.ok || !result.blob || !result.filename) {
      throw new Error(result.error || "Export failed");
    }

    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * Factory function to create Tag AI client
 * 
 * @param userId - Current user ID
 * @param baseUrl - Optional base URL (defaults to current domain)
 * @returns TagAIClient instance
 */
export function createTagClient(userId: string, baseUrl?: string): TagAIClient {
  return new TagAIClient(userId, baseUrl);
}

/**
 * Convenience hook for React components
 * Usage: const tagClient = useTagClient();
 */
export function useTagClient(userId?: string): TagAIClient {
  // In a real app, get userId from auth context
  const actualUserId = userId || (typeof window !== "undefined" ? (window as any).__userId : "");

  if (!actualUserId) {
    throw new Error("userId required for Tag AI client");
  }

  return new TagAIClient(actualUserId);
}




