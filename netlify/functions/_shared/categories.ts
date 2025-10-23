/**
 * Server-side Category Resolution Helpers (Netlify Functions)
 *
 * Utilities for resolving category names/slugs to IDs,
 * with fallback to system categories and caching.
 *
 * Uses service role key for direct database access.
 */

import { serverSupabase } from "./supabase";
import { safeLog } from "./safeLog";
import type { Category } from "@/types/tag";

// Simple in-memory cache (TTL: 5 min)
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const categoryCache = new Map<string, { data: Category | null; expires: number }>();

// ============================================================================
// CATEGORY ID RESOLUTION
// ============================================================================

/**
 * Resolve category name or slug to category ID
 *
 * Searches in order:
 * 1. User-specific categories (by name or slug)
 * 2. System categories (by name or slug)
 * 3. Returns fallback ("Uncategorized") if not found
 *
 * @param userId - User UUID
 * @param categoryNameOrSlug - Category name or slug
 * @param fallbackSlug - Fallback slug if not found (default: "uncategorized")
 * @returns Category ID or null
 *
 * @example
 * const id = await resolveCategoryId(userId, "Groceries");
 * // Returns: "uuid-of-groceries" or "uuid-of-uncategorized"
 */
export async function resolveCategoryId(
  userId: string,
  categoryNameOrSlug: string,
  fallbackSlug = "uncategorized"
): Promise<string | null> {
  try {
    // Try exact slug match first (fastest)
    const slug = categoryNameOrSlug.toLowerCase();
    let result = await getCategoryBySlug(userId, slug);
    if (result) return result.id;

    // Try name match (case-insensitive)
    result = await getCategoryByName(userId, categoryNameOrSlug);
    if (result) return result.id;

    // Fallback to system category
    safeLog("resolveCategoryId.fallback", {
      userId,
      requested: categoryNameOrSlug,
      fallback: fallbackSlug,
    });

    const fallback = await getCategoryBySlug(null, fallbackSlug);
    return fallback?.id ?? null;
  } catch (err: any) {
    safeLog("resolveCategoryId.error", {
      error: err?.message,
      userId,
      requested: categoryNameOrSlug,
    });
    return null;
  }
}

/**
 * Get category by slug (exact match)
 *
 * @param userId - User UUID or null for system categories
 * @param slug - URL-safe slug
 * @returns Category or null
 */
export async function getCategoryBySlug(
  userId: string | null,
  slug: string
): Promise<Category | null> {
  const cacheKey = `${userId}:slug:${slug}`;
  const cached = categoryCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  try {
    const { supabase } = serverSupabase();

    let query = supabase
      .from("categories")
      .select("*")
      .eq("slug", slug.toLowerCase())
      .eq("is_active", true);

    if (userId) {
      query = query.or(`user_id.is.null,user_id.eq.${userId}`);
    } else {
      query = query.is("user_id", null);
    }

    const { data, error } = await query.single();

    if (error && error.code !== "PGRST116") throw error;

    const result = (data ?? null) as Category | null;
    categoryCache.set(cacheKey, { data: result, expires: Date.now() + CACHE_EXPIRY });

    return result;
  } catch (err: any) {
    safeLog("getCategoryBySlug.error", {
      error: err?.message,
      userId,
      slug,
    });
    return null;
  }
}

/**
 * Get category by name (case-insensitive)
 *
 * @param userId - User UUID or null for system categories
 * @param name - Category name
 * @returns Category or null
 */
export async function getCategoryByName(
  userId: string | null,
  name: string
): Promise<Category | null> {
  const cacheKey = `${userId}:name:${name}`;
  const cached = categoryCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  try {
    const { supabase } = serverSupabase();

    let query = supabase
      .from("categories")
      .select("*")
      .ilike("name", name)
      .eq("is_active", true);

    if (userId) {
      query = query.or(`user_id.is.null,user_id.eq.${userId}`);
    } else {
      query = query.is("user_id", null);
    }

    const { data, error } = await query;

    if (error) throw error;

    const result = ((data ?? [])[0] ?? null) as Category | null;
    categoryCache.set(cacheKey, { data: result, expires: Date.now() + CACHE_EXPIRY });

    return result;
  } catch (err: any) {
    safeLog("getCategoryByName.error", {
      error: err?.message,
      userId,
      name,
    });
    return null;
  }
}

// ============================================================================
// BATCH CATEGORY RESOLUTION
// ============================================================================

/**
 * Resolve multiple categories at once
 *
 * @param userId - User UUID
 * @param namesOrSlugs - Array of category names/slugs
 * @returns Map of input -> Category ID
 */
export async function resolveCategoryIdBatch(
  userId: string,
  namesOrSlugs: string[]
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  for (const nameOrSlug of namesOrSlugs) {
    const id = await resolveCategoryId(userId, nameOrSlug);
    results.set(nameOrSlug, id);
  }

  return results;
}

/**
 * Get all categories for a user (with caching)
 *
 * @param userId - User UUID or null for system only
 * @returns Array of active categories
 */
export async function getAllCategories(userId: string | null = null): Promise<Category[]> {
  const cacheKey = `${userId}:all`;
  const cached = categoryCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return (cached.data as any) || [];
  }

  try {
    const { supabase } = serverSupabase();

    let query = supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (userId) {
      query = query.or(`user_id.is.null,user_id.eq.${userId}`);
    } else {
      query = query.is("user_id", null);
    }

    const { data, error } = await query;

    if (error) throw error;

    const result = (data ?? []) as Category[];
    categoryCache.set(cacheKey, { data: result as any, expires: Date.now() + CACHE_EXPIRY });

    return result;
  } catch (err: any) {
    safeLog("getAllCategories.error", {
      error: err?.message,
      userId,
    });
    return [];
  }
}

// ============================================================================
// CATEGORY CREATION/UPDATE
// ============================================================================

/**
 * Get or create a category
 *
 * If category exists, returns it. Otherwise, creates a new user category.
 *
 * @param userId - User UUID
 * @param name - Category name
 * @param slug - URL-safe slug (auto-generated if not provided)
 * @returns Category or null on error
 */
export async function getOrCreateCategory(
  userId: string,
  name: string,
  slug?: string
): Promise<Category | null> {
  try {
    // Try to find existing
    let result = await getCategoryByName(userId, name);
    if (result) return result;

    // Create new user category
    const { supabase } = serverSupabase();
    const autoSlug = slug || name.toLowerCase().replace(/\s+/g, "-");

    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name,
        slug: autoSlug,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Clear cache
    categoryCache.delete(`${userId}:name:${name}`);
    categoryCache.delete(`${userId}:slug:${autoSlug}`);
    categoryCache.delete(`${userId}:all`);

    safeLog("getOrCreateCategory.created", { userId, name, slug: autoSlug });

    return (data ?? null) as Category | null;
  } catch (err: any) {
    safeLog("getOrCreateCategory.error", {
      error: err?.message,
      userId,
      name,
    });
    return null;
  }
}

// ============================================================================
// CATEGORY LOOKUP HELPERS
// ============================================================================

/**
 * Find best matching category from a list of possibilities
 *
 * Returns first match (priority: slug, then name, then user categories first)
 *
 * @param userId - User UUID
 * @param possibilities - List of category names/slugs to try
 * @returns Category ID or null
 *
 * @example
 * const id = await findBestMatchingCategory(userId, [
 *   "groceries",
 *   "grocery",
 *   "food"
 * ]);
 */
export async function findBestMatchingCategory(
  userId: string,
  possibilities: string[]
): Promise<string | null> {
  for (const nameOrSlug of possibilities) {
    const id = await resolveCategoryId(userId, nameOrSlug);
    if (id) return id;
  }
  return null;
}

/**
 * Clear category cache (useful for testing or manual refresh)
 *
 * @param userId - Clear only this user's cache, or all if null
 */
export function clearCategoryCache(userId?: string | null): void {
  if (!userId) {
    categoryCache.clear();
    safeLog("clearCategoryCache.all", {});
  } else {
    for (const key of categoryCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        categoryCache.delete(key);
      }
    }
    safeLog("clearCategoryCache.user", { userId });
  }
}





