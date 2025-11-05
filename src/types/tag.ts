/**
 * Tag AI Categorization System Types
 *
 * Defines all TypeScript interfaces for:
 * - Categories (system + user-defined)
 * - Category aliases (merchant mappings)
 * - User preferences
 * - Categorization rules
 * - Transaction categorization results
 */

export type UUID = string;

// ============================================================================
// CATEGORY TYPES
// ============================================================================

/**
 * A category for organizing transactions
 *
 * Can be:
 * - System category: `user_id` is null (Groceries, Utilities, etc.)
 * - User category: `user_id` is set (custom categories like "Pet Supplies")
 *
 * Supports hierarchy via `parent_id` for nested categories.
 */
export type Category = {
  id: UUID;
  user_id: UUID | null;              // null = system, UUID = user-specific
  name: string;                       // "Groceries", "Dining Out", etc.
  slug: string;                       // "groceries", "dining-out" (URL-safe)
  parent_id: UUID | null;             // Hierarchical grouping (e.g., Food > Groceries)
  icon?: string;                      // Optional emoji/icon for UI
  description?: string;               // Optional description
  is_active: boolean;                 // Soft-delete flag
  created_at: string;
  updated_at: string;
};

/**
 * Merchant name alias → category mapping
 *
 * Example:
 * - Alias: "AMZN", "AMAZON.COM", "AMAZON PRIME" → Category: "Shopping"
 * - Alias: "STARBUCKS", "STARBKS" → Category: "Dining Out"
 *
 * Used by Tag to normalize vendor names and auto-categorize.
 */
export type CategoryAlias = {
  id: UUID;
  user_id: UUID | null;              // null = system, UUID = user-specific
  category_id: UUID;                 // Foreign key to categories
  alias: string;                      // Merchant name (e.g., "AMZN")
  confidence?: number;                // 0-100, how confident this alias is
  created_at: string;
};

/**
 * User preferences for categorization behavior
 */
export type UserCategoryPrefs = {
  id: UUID;
  user_id: UUID;
  default_category_id: UUID | null;  // Fallback category if no rule matches
  strict_rules_first: boolean;        // If true, user rules take precedence over AI suggestions
  created_at: string;
  updated_at: string;
};

// ============================================================================
// CATEGORIZATION RULE TYPES
// ============================================================================

/**
 * Pattern-based rule for merchant → category mapping
 *
 * Example:
 * - Pattern: "COSTCO%" → Category: "Groceries" (priority: 50)
 * - Pattern: "^AMAZON" → Category: "Shopping" (priority: 100, regex mode)
 *
 * Rules are evaluated in priority order (lower = higher precedence).
 */
export type CategoryRule = {
  id: UUID;
  user_id: UUID | null;              // null = system, UUID = user-specific
  merchant_pattern: string;           // ILIKE pattern or regex
  category_id: UUID;                 // Target category
  priority: number;                  // 0-100; lower = evaluate first
  match_type: "ilike" | "regex";     // Matching algorithm
  source: "user" | "ai" | "system"; // Who created this rule?
  confidence?: number;               // 0-100, how confident
  created_at: string;
  updated_at: string;
};

/**
 * Normalized merchant name (learned from corrections)
 *
 * Example:
 * - Raw: "AMZN.COM/AMZONS3" → Normalized: "Amazon"
 * - Raw: "STARBUCKS #1234" → Normalized: "Starbucks"
 *
 * Helps deduplicate and clean merchant names across transactions.
 */
export type NormalizedMerchant = {
  id: UUID;
  user_id: UUID | null;              // null = system, UUID = user-specific
  vendor_raw: string;                // As-imported (e.g., "AMZN.COM/AMZONS3")
  merchant_norm: string;             // Canonical name (e.g., "Amazon")
  merchant_display?: string;         // Pretty name for UI (e.g., "amazon.com")
  category_id?: UUID;                // Optional suggested category
  created_at: string;
  updated_at: string;
};

/**
 * Audit trail for category changes
 *
 * Tracks:
 * - User corrections
 * - AI suggestions
 * - Rule-based changes
 * - Confidence scores
 *
 * Used for learning and analytics.
 */
export type CategoryHistory = {
  id: UUID;
  user_id: UUID;
  transaction_id: UUID;              // Transaction being categorized
  old_category_id?: UUID;            // Previous category (if any)
  new_category_id: UUID;             // New category
  reason: "user_correction" | "ai_suggestion" | "rule_based" | "default";
  confidence: number;                // 0-100
  created_at: string;
};

// ============================================================================
// CATEGORIZATION RESULT TYPES
// ============================================================================

/**
 * Result of categorizing a single transaction
 */
export type CategorizationResult = {
  transaction_id: UUID;
  category_id: UUID | null;          // null = could not categorize
  category_name?: string;
  confidence: number;                // 0-100
  matched_rule?: {
    pattern: string;
    priority: number;
    type: string;
  };
  reason: "rule_match" | "alias_match" | "ai_suggestion" | "default" | "none";
};

/**
 * Batch categorization request
 */
export type BatchCategorizeRequest = {
  transactions: Array<{
    id: UUID;
    vendor_raw: string;
    merchant_norm?: string;
    description?: string;
  }>;
  userId?: string;
  forceAi?: boolean;                 // Skip rules, use AI
};

/**
 * Batch categorization response
 */
export type BatchCategorizeResponse = {
  results: CategorizationResult[];
  summary: {
    total: number;
    categorized: number;
    uncategorized: number;
    avgConfidence: number;
  };
};

// ============================================================================
// TAG AI WORKER REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request sent to Tag AI (Netlify function)
 */
export type TagWorkerRequest = {
  action: "categorize" | "learn" | "fix_merchant" | "get_categories";
  userId: string;
  payload: Record<string, any>;
};

/**
 * Response from Tag AI
 */
export type TagWorkerResponse = {
  ok: boolean;
  data?: Record<string, any>;
  error?: string;
  details?: {
    processed: number;
    failed: number;
    learned?: number;
  };
};

// ============================================================================
// UI COMPONENT TYPES
// ============================================================================

/**
 * Props for category selector dropdown
 */
export type CategorySelectorProps = {
  selected?: UUID | null;
  onSelect: (categoryId: UUID) => void;
  userId?: string;
  includeSystem?: boolean;           // Show system categories
  includeUser?: boolean;             // Show user categories
  showCreate?: boolean;              // Allow creating new category
  disabled?: boolean;
};

/**
 * Props for category badge/pill
 */
export type CategoryPillProps = {
  categoryId: UUID;
  categoryName?: string;
  confidence?: number;               // Show confidence %
  editable?: boolean;
  onEdit?: (newCategoryId: UUID) => void;
  compact?: boolean;
};

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Categorization stats for analytics
 */
export type CategorizationStats = {
  totalTransactions: number;
  categorized: number;
  uncategorized: number;
  avgConfidence: number;
  topCategories: Array<{
    categoryId: UUID;
    categoryName: string;
    count: number;
    avgConfidence: number;
  }>;
  lastUpdated: string;
};

/**
 * Request for user to review/confirm categorization
 */
export type CategoryReviewTask = {
  id: UUID;
  transaction_id: UUID;
  vendor_raw: string;
  merchant_norm?: string;
  suggested_category_id: UUID;
  suggested_category_name?: string;
  suggested_confidence: number;
  created_at: string;
};






