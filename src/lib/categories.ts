/**
 * Category Helper Functions (Client-Side)
 *
 * Utilities for fetching and searching categories, managing aliases,
 * and handling categorization preferences.
 *
 * All functions respect RLS: system categories (user_id = null) are always visible,
 * user categories (user_id = current_user) are also visible.
 */

import { createClient } from "@supabase/supabase-js";
import type {
  Category,
  CategoryAlias,
  UserCategoryPrefs,
  NormalizedMerchant,
  CategorizationStats,
} from "@/types/tag";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

// ============================================================================
// CATEGORY FETCHING
// ============================================================================

/**
 * Fetch all categories (system + user-specific)
 *
 * @param userId - Optional user ID. If provided, includes user's personal categories.
 * @returns Sorted array of categories
 *
 * @example
 * const categories = await fetchCategoriesTree(userId);
 * // Returns: [{ id, name: "Groceries", user_id: null }, ...]
 */
export async function fetchCategoriesTree(userId?: string): Promise<Category[]> {
  try {
    // RLS enforces: user_id IS NULL (system) OR user_id = auth.uid()
    const query = supabase
      .from("categories")
      .select("*")
      .eq("is_active", true);

    // Include both system and user-specific categories
    if (userId) {
      query.or(`user_id.is.null, user_id.eq.${userId}`);
    } else {
      query.is("user_id", null); // System categories only
    }

    const { data, error } = await query;

    if (error) throw error;
    return ((data ?? []) as Category[]).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  } catch (err: any) {
    console.error("[fetchCategoriesTree]", err);
    return [];
  }
}

/**
 * Find a category by ID
 *
 * @param categoryId - Category UUID
 * @returns Category object or null if not found
 */
export async function fetchCategoryById(categoryId: string): Promise<Category | null> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("id", categoryId)
      .eq("is_active", true)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return (data ?? null) as Category | null;
  } catch (err: any) {
    console.error("[fetchCategoryById]", err);
    return null;
  }
}

/**
 * Find a category by name or slug
 *
 * @param nameOrSlug - Category name or URL slug
 * @param userId - Optional user ID for personal categories
 * @returns Category ID or null if not found
 *
 * @example
 * const id = await findCategoryIdByNameOrSlug("Groceries", userId);
 * // Returns: "uuid-of-groceries-category"
 */
export async function findCategoryIdByNameOrSlug(
  nameOrSlug: string,
  userId?: string
): Promise<string | null> {
  try {
    // Try name first (case-insensitive)
    const query = supabase
      .from("categories")
      .select("id, name, slug, user_id")
      .eq("is_active", true)
      .ilike("name", nameOrSlug);

    if (userId) {
      query.or(`user_id.is.null, user_id.eq.${userId}`);
    } else {
      query.is("user_id", null);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (data && data.length > 0) {
      return data[0].id;
    }

    // Try slug (exact match)
    const slugQuery = supabase
      .from("categories")
      .select("id, name, slug, user_id")
      .eq("is_active", true)
      .eq("slug", nameOrSlug.toLowerCase());

    if (userId) {
      slugQuery.or(`user_id.is.null, user_id.eq.${userId}`);
    } else {
      slugQuery.is("user_id", null);
    }

    const { data: slugData, error: slugError } = await slugQuery;

    if (slugError) throw slugError;
    return slugData && slugData.length > 0 ? slugData[0].id : null;
  } catch (err: any) {
    console.error("[findCategoryIdByNameOrSlug]", err);
    return null;
  }
}

/**
 * Search categories by partial name
 *
 * @param query - Search term
 * @param userId - Optional user ID
 * @param limit - Max results (default 10)
 * @returns Matching categories sorted by relevance
 */
export async function searchCategories(
  query: string,
  userId?: string,
  limit = 10
): Promise<Category[]> {
  try {
    const searchQuery = supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .ilike("name", `%${query}%`)
      .limit(limit);

    if (userId) {
      searchQuery.or(`user_id.is.null, user_id.eq.${userId}`);
    } else {
      searchQuery.is("user_id", null);
    }

    const { data, error } = await searchQuery;

    if (error) throw error;
    return (data ?? []) as Category[];
  } catch (err: any) {
    console.error("[searchCategories]", err);
    return [];
  }
}

// ============================================================================
// CATEGORY HIERARCHY
// ============================================================================

/**
 * Fetch category hierarchy as a tree
 *
 * Groups categories by parent_id for nested display
 *
 * @param userId - Optional user ID
 * @returns Tree structure suitable for nested selects
 */
export async function fetchCategoryHierarchy(userId?: string) {
  try {
    const categories = await fetchCategoriesTree(userId);

    // Build tree: parent_id -> [children]
    const tree: Record<string, Category[]> = {};
    const roots: Category[] = [];

    for (const cat of categories) {
      if (!cat.parent_id) {
        roots.push(cat);
      } else {
        if (!tree[cat.parent_id]) {
          tree[cat.parent_id] = [];
        }
        tree[cat.parent_id].push(cat);
      }
    }

    return { roots, children: tree };
  } catch (err: any) {
    console.error("[fetchCategoryHierarchy]", err);
    return { roots: [], children: {} };
  }
}

/**
 * Get full path to a category (e.g., "Food > Groceries")
 *
 * @param categoryId - Category UUID
 * @param userId - Optional user ID
 * @returns Path array or empty if not found
 */
export async function getCategoryPath(
  categoryId: string,
  userId?: string
): Promise<Category[]> {
  try {
    const cat = await fetchCategoryById(categoryId);
    if (!cat) return [];

    const path: Category[] = [cat];

    let parent_id = cat.parent_id;
    while (parent_id) {
      const parent = await fetchCategoryById(parent_id);
      if (!parent) break;
      path.unshift(parent);
      parent_id = parent.parent_id;
    }

    return path;
  } catch (err: any) {
    console.error("[getCategoryPath]", err);
    return [];
  }
}

// ============================================================================
// ALIASES & NORMALIZATION
// ============================================================================

/**
 * Find aliases for a category
 *
 * @param categoryId - Category UUID
 * @returns Array of aliases (e.g., ["AMZN", "AMAZON.COM", "AMAZON PRIME"])
 */
export async function fetchCategoryAliases(categoryId: string): Promise<CategoryAlias[]> {
  try {
    const { data, error } = await supabase
      .from("category_aliases")
      .select("*")
      .eq("category_id", categoryId);

    if (error) throw error;
    return (data ?? []) as CategoryAlias[];
  } catch (err: any) {
    console.error("[fetchCategoryAliases]", err);
    return [];
  }
}

/**
 * Fetch normalized merchant (canonical name)
 *
 * @param vendorRaw - Raw vendor name as imported
 * @param userId - Optional user ID
 * @returns Normalized merchant or null
 *
 * @example
 * const norm = await fetchNormalizedMerchant("AMZN.COM/AMZONS3", userId);
 * // Returns: { vendor_raw, merchant_norm: "Amazon", ... }
 */
export async function fetchNormalizedMerchant(
  vendorRaw: string,
  userId?: string
): Promise<NormalizedMerchant | null> {
  try {
    const query = supabase
      .from("normalized_merchants")
      .select("*")
      .eq("vendor_raw", vendorRaw);

    if (userId) {
      query.or(`user_id.is.null, user_id.eq.${userId}`);
    } else {
      query.is("user_id", null);
    }

    const { data, error } = await query.single();

    if (error && error.code !== "PGRST116") throw error;
    return (data ?? null) as NormalizedMerchant | null;
  } catch (err: any) {
    console.error("[fetchNormalizedMerchant]", err);
    return null;
  }
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

/**
 * Fetch user's categorization preferences
 *
 * @param userId - User UUID
 * @returns User preferences or null
 */
export async function fetchUserCategoryPrefs(userId: string): Promise<UserCategoryPrefs | null> {
  try {
    const { data, error } = await supabase
      .from("user_category_prefs")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return (data ?? null) as UserCategoryPrefs | null;
  } catch (err: any) {
    console.error("[fetchUserCategoryPrefs]", err);
    return null;
  }
}

/**
 * Update user's categorization preferences
 *
 * @param userId - User UUID
 * @param updates - Fields to update
 * @returns Updated preferences or null on error
 */
export async function updateUserCategoryPrefs(
  userId: string,
  updates: Partial<Omit<UserCategoryPrefs, "id" | "user_id" | "created_at">>
): Promise<UserCategoryPrefs | null> {
  try {
    const { data, error } = await supabase
      .from("user_category_prefs")
      .update({ ...updates, user_id: userId })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return (data ?? null) as UserCategoryPrefs | null;
  } catch (err: any) {
    console.error("[updateUserCategoryPrefs]", err);
    return null;
  }
}

// ============================================================================
// CATEGORIZATION STATS
// ============================================================================

/**
 * Fetch categorization stats for user
 *
 * @param userId - User UUID
 * @returns Stats or null
 */
export async function fetchCategorizationStats(userId: string): Promise<CategorizationStats | null> {
  try {
    // This typically comes from a database view or server function
    // For now, returning a placeholder
    const { data, error } = await supabase.rpc("get_categorization_stats", {
      p_user_id: userId,
    });

    if (error) {
      console.warn("[fetchCategorizationStats] RPC not found, returning placeholder");
      return null;
    }

    return data as CategorizationStats;
  } catch (err: any) {
    console.error("[fetchCategorizationStats]", err);
    return null;
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Batch fetch categories by IDs
 *
 * @param categoryIds - Array of category UUIDs
 * @returns Map of id -> Category
 */
export async function fetchCategoriesByIds(
  categoryIds: string[]
): Promise<Map<string, Category>> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .in("id", categoryIds);

    if (error) throw error;

    const map = new Map<string, Category>();
    for (const cat of data ?? []) {
      map.set(cat.id, cat);
    }
    return map;
  } catch (err: any) {
    console.error("[fetchCategoriesByIds]", err);
    return new Map();
  }
}

/**
 * Lookup category by multiple possible names
 *
 * Tries each name/slug in order, returns first match
 *
 * @param possibilities - Array of possible names/slugs
 * @param userId - Optional user ID
 * @returns Category ID or null
 */
export async function findCategoryByAnyName(
  possibilities: string[],
  userId?: string
): Promise<string | null> {
  for (const name of possibilities) {
    const id = await findCategoryIdByNameOrSlug(name, userId);
    if (id) return id;
  }
  return null;
}






