/**
 * Tag AI Category Management Endpoint
 *
 * Operations:
 * - GET  / → List all categories (system + user)
 * - POST / → Create new user category
 * - DELETE /{id} → Delete user category
 *
 * Features:
 * - Hierarchical categories (parent_id)
 * - System categories (user_id IS NULL)
 * - User categories (user_id = auth.uid())
 * - Full CRUD with validation
 * - RLS enforcement
 *
 * @example
 * GET /.netlify/functions/tag-categories
 * Response: { ok: true, categories: [...] }
 *
 * POST /.netlify/functions/tag-categories
 * {
 *   "name": "Pet Supplies",
 *   "parent_id": "cat-uuid"  // optional
 * }
 * Response: { ok: true, category: {...} }
 *
 * DELETE /.netlify/functions/tag-categories/cat-uuid
 * Response: { ok: true, deleted: true }
 */

import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { serverSupabase } from "./_shared/supabase";
import { safeLog } from "./_shared/safeLog";
import { withGuardrails } from "./_shared/guardrails";
import { v4 as uuid } from "uuid";

// ============================================================================
// SCHEMAS
// ============================================================================

const CreateCategoryRequest = z.object({
  name: z.string().min(1).max(100),
  parent_id: z.string().uuid().optional(),
  icon: z.string().emoji().optional(),
});

const ListCategoriesQuery = z.object({
  parent_only: z.string().optional(), // "true" to show only root categories
});

type CreateCategoryRequest = z.infer<typeof CreateCategoryRequest>;
type ListCategoriesQuery = z.infer<typeof ListCategoriesQuery>;

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * GET / → List all categories (system + user)
 */
async function handleListCategories(
  userId: string,
  query?: Record<string, string>
): Promise<{ statusCode: number; body: string }> {
  try {
    const parsed = ListCategoriesQuery.safeParse(query || {});
    const showParentOnly = parsed.success && parsed.data.parent_only === "true";

    const { supabase } = serverSupabase();

    let queryBuilder = supabase
      .from("categories")
      .select("*")
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .eq("is_active", true);

    // If parent_only, only show root categories
    if (showParentOnly) {
      queryBuilder = queryBuilder.is("parent_id", null);
    }

    const { data, error } = await queryBuilder.order("name", { ascending: true });

    if (error) throw error;

    safeLog("tag-categories.list.success", {
      userId,
      count: data?.length || 0,
      parentOnly: showParentOnly,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        categories: data || [],
        count: data?.length || 0,
      }),
    };
  } catch (err: any) {
    safeLog("tag-categories.list.error", {
      userId,
      error: err?.message,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Failed to fetch categories",
      }),
    };
  }
}

/**
 * POST / → Create new user category
 */
async function handleCreateCategory(
  userId: string,
  body: string
): Promise<{ statusCode: number; body: string }> {
  try {
    const parsed = CreateCategoryRequest.safeParse(JSON.parse(body || "{}"));

    if (!parsed.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "Invalid input",
          details: parsed.error.flatten(),
        }),
      };
    }

    const { name, parent_id, icon } = parsed.data;
    const { supabase } = serverSupabase();

    // 1) Validate parent exists if provided
    if (parent_id) {
      const { data: parent, error: parentErr } = await supabase
        .from("categories")
        .select("id")
        .eq("id", parent_id)
        .eq("is_active", true)
        .maybeSingle();

      if (parentErr || !parent) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            ok: false,
            error: "Parent category not found",
          }),
        };
      }
    }

    // 2) Check if category already exists (case-insensitive)
    const { data: existing, error: existErr } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", userId)
      .ilike("name", name)
      .maybeSingle();

    if (existErr) throw existErr;

    if (existing) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          ok: false,
          error: `Category "${name}" already exists`,
        }),
      };
    }

    // 3) Generate slug
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // 4) Create category
    const categoryId = uuid();
    const { data: newCat, error: createErr } = await supabase
      .from("categories")
      .insert({
        id: categoryId,
        user_id: userId,
        name,
        slug,
        parent_id: parent_id || null,
        icon: icon || null,
        is_active: true,
      })
      .select("*")
      .single();

    if (createErr) throw createErr;

    safeLog("tag-categories.create.success", {
      userId,
      categoryId,
      name,
      parentId: parent_id,
    });

    return {
      statusCode: 201,
      body: JSON.stringify({
        ok: true,
        category: newCat,
      }),
    };
  } catch (err: any) {
    safeLog("tag-categories.create.error", {
      userId,
      error: err?.message,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Failed to create category",
      }),
    };
  }
}

/**
 * DELETE /{id} → Delete user category (soft delete)
 */
async function handleDeleteCategory(
  userId: string,
  categoryId: string
): Promise<{ statusCode: number; body: string }> {
  try {
    // Validate UUID
    if (!categoryId.match(/^[0-9a-f-]{36}$/i)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "Invalid category ID",
        }),
      };
    }

    const { supabase } = serverSupabase();

    // 1) Verify ownership
    const { data: cat, error: checkErr } = await supabase
      .from("categories")
      .select("id, user_id, name")
      .eq("id", categoryId)
      .maybeSingle();

    if (checkErr || !cat) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          ok: false,
          error: "Category not found",
        }),
      };
    }

    if (cat.user_id !== userId) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          ok: false,
          error: "Not authorized to delete this category",
        }),
      };
    }

    // 2) Check if category is in use
    const { data: inUse, error: useErr } = await supabase
      .from("transaction_categorizations")
      .select("id")
      .eq("category_id", categoryId)
      .limit(1);

    if (useErr) throw useErr;

    if (inUse && inUse.length > 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          ok: false,
          error: `Cannot delete "${cat.name}" — it's used by ${inUse.length} transaction(s)`,
          in_use_count: inUse.length,
        }),
      };
    }

    // 3) Soft delete (mark inactive)
    const { error: delErr } = await supabase
      .from("categories")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", categoryId)
      .eq("user_id", userId);

    if (delErr) throw delErr;

    // 4) Orphan child categories (set parent_id to null)
    const { error: orphanErr } = await supabase
      .from("categories")
      .update({ parent_id: null })
      .eq("parent_id", categoryId);

    if (orphanErr) {
      safeLog("tag-categories.delete.orphan_warning", {
        error: orphanErr.message,
        categoryId,
      });
      // Not fatal, continue
    }

    safeLog("tag-categories.delete.success", {
      userId,
      categoryId,
      name: cat.name,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        deleted: true,
        category_name: cat.name,
      }),
    };
  } catch (err: any) {
    safeLog("tag-categories.delete.error", {
      userId,
      categoryId,
      error: err?.message,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Failed to delete category",
      }),
    };
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

const handler: Handler = async (event) => {
  // Guardrails
  const guardCheck = await withGuardrails({
    event,
    maxRequestSize: 1024 * 2, // 2KB
    rateLimitPerMin: 60,
    requireAuth: true,
  });

  if (guardCheck.error) {
    return {
      statusCode: guardCheck.status,
      body: JSON.stringify({ ok: false, error: guardCheck.error }),
    };
  }

  const userId = guardCheck.userId;

  try {
    // Parse path to extract operation
    const path = event.path || "";
    const pathSegments = path
      .split("/")
      .filter((s) => s && s !== ".netlify" && s !== "functions" && s !== "tag-categories");

    const categoryId = pathSegments[0]; // DELETE /{id}

    // Route to handler
    if (event.httpMethod === "GET") {
      return await handleListCategories(userId, event.queryStringParameters || undefined);
    }

    if (event.httpMethod === "POST") {
      return await handleCreateCategory(userId, event.body || "");
    }

    if (event.httpMethod === "DELETE") {
      if (!categoryId) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            ok: false,
            error: "Category ID required for DELETE",
          }),
        };
      }
      return await handleDeleteCategory(userId, categoryId);
    }

    // Unsupported method
    return {
      statusCode: 405,
      body: JSON.stringify({
        ok: false,
        error: "Method not allowed",
      }),
    };
  } catch (err: any) {
    safeLog("tag-categories.error", {
      userId,
      method: event.httpMethod,
      error: err?.message,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Internal server error",
      }),
    };
  }
};

export { handler };






