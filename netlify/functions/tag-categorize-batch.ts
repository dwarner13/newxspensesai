import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { getOpenAIClient, getChatModel } from './_shared/openai_client.js';
import { safeLog } from './_shared/safeLog.js';
import { verifyAuth } from './_shared/verifyAuth.js';

type StagingRow = {
  id: string;
  user_id: string;
  import_id: string;
  data_json: Record<string, any> | null;
  tag_status?: string | null;
  tag_category?: string | null;
};

type MemoryRow = {
  user_id: string;
  vendor_key: string;
  category: string;
  subcategory: string | null;
};

type CategorizeResult = {
  category: string | null;
  subcategory: string | null;
  confidence: number;
  reason: string;
  source: 'vendor_memory' | 'rules' | 'ai';
  model: string | null;
  forceNeedsReview?: boolean;
};

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RULES: Array<{ contains: string[]; category: string; subcategory?: string }> = [
  { contains: ['starbucks'], category: 'Dining', subcategory: 'Coffee' },
  { contains: ['uber'], category: 'Transportation' },
  { contains: ['amazon'], category: 'Shopping' },
  { contains: ['insurance'], category: 'Insurance' },
  { contains: ['telus', 'rogers'], category: 'Utilities' },
  { contains: ['payroll', 'deposit'], category: 'Income' },
  { contains: ['transfer'], category: 'Transfers' },
  { contains: ['gas', 'petro', 'shell'], category: 'Transportation', subcategory: 'Fuel' },
  { contains: ['lyft', 'taxi'], category: 'Transportation', subcategory: 'Rideshare' },
  { contains: ['walmart', 'costco', 'kroger', 'safeway', 'sobeys', 'superstore'], category: 'Groceries' },
  { contains: ['mcdonald', 'restaurant', 'cafe', 'doordash', 'ubereats'], category: 'Dining' },
  { contains: ['best buy', 'apple', 'ebay'], category: 'Shopping' },
  { contains: ['netflix', 'spotify', 'disney'], category: 'Entertainment', subcategory: 'Subscriptions' },
  { contains: ['hydro', 'internet', 'bell'], category: 'Utilities' },
];

const CANONICAL_CATEGORIES = [
  'Groceries',
  'Dining',
  'Transportation',
  'Shopping',
  'Utilities',
  'Insurance',
  'Housing',
  'Income',
  'Transfers',
  'Fees',
  'Entertainment',
  'Health',
  'Other',
] as const;

const CANONICAL_CATEGORY_SET = new Set<string>(CANONICAL_CATEGORIES);

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'y'].includes(lower)) return true;
    if (['0', 'false', 'no', 'n'].includes(lower)) return false;
  }
  return fallback;
}

function normalizeVendorKey(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTxFields(row: StagingRow): {
  vendorText: string;
  amountRaw: unknown;
  currency: string;
  date: string;
  j: Record<string, any>;
} {
  const j = row?.data_json ?? {};
  const vendorText = (
    j.description ||
    j.merchant ||
    j.vendor ||
    j.payee ||
    j.memo ||
    j.name ||
    j.details ||
    ''
  ).toString();

  const amountRaw = j.amount ?? j.total ?? j.value ?? null;
  const currency = (j.currency || j.ccy || '').toString();
  const date = (j.date || j.posted_date || j.transaction_date || '').toString();

  return { vendorText, amountRaw, currency, date, j };
}

function normalizeVendorText(input: string): string {
  const aliased = input
    // Normalize common merchant aliases so memory/rules hit more often.
    .replace(/\bamzn\b/gi, 'amazon')
    .replace(/\bamazon mktp\b/gi, 'amazon')
    .replace(/\bamazon marketplace\b/gi, 'amazon')
    .replace(/\bstarbucks coffee\b/gi, 'starbucks')
    .replace(/\buber trip\b/gi, 'uber')
    .replace(/\buber eats\b/gi, 'uber')
    .replace(/\betransfer\b/gi, 'transfer')
    .replace(/\be[-\s]?transfer\b/gi, 'transfer');

  return aliased
    .toLowerCase()
    .replace(/[0-9]{4,}/g, '') // remove long numbers
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickRule(vendorText: string): CategorizeResult | null {
  const lower = vendorText.toLowerCase();
  for (const rule of RULES) {
    if (rule.contains.some((token) => lower.includes(token))) {
      return {
        category: rule.category,
        subcategory: rule.subcategory || null,
        confidence: 0.85,
        reason: `Matched rule token for ${rule.category}`,
        source: 'rules',
        model: null,
      };
    }
  }
  return null;
}

function parseAiJson(rawText: string): { category?: string; subcategory?: string | null; confidence?: number; reason?: string } {
  try {
    return JSON.parse(rawText);
  } catch {
    const objectMatch = rawText.match(/\{[\s\S]*\}/);
    if (objectMatch?.[0]) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        return {};
      }
    }
    return {};
  }
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

async function runAiCategorization(
  vendorText: string,
  txContext: { amountRaw: unknown; currency: string; date: string },
  vendorKey: string
): Promise<CategorizeResult> {
  const model = getChatModel();
  const aiInput = {
    description: vendorText,
    amount: txContext.amountRaw,
    currency: txContext.currency || null,
    date: txContext.date || null,
  };

  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content:
          `You are a transaction categorizer. Return JSON only. Only choose category from this approved list: ${CANONICAL_CATEGORIES.join(', ')}. Do not invent categories. Required JSON schema: {"category":"<approved category>","subcategory":"<short string or null>","confidence":0.0,"reason":"<short reason>"}`,
      },
      {
        role: 'user',
        content: `Vendor key: ${vendorText}\nInput: ${JSON.stringify(aiInput)}`,
      },
    ],
  });

  const content = completion.choices?.[0]?.message?.content || '{}';
  const parsed = parseAiJson(content);
  const confidenceRaw = Number(parsed.confidence);
  let confidence = clampConfidence(confidenceRaw);

  const rawCategory = parsed.category?.trim() || 'Other';
  let category = CANONICAL_CATEGORY_SET.has(rawCategory) ? rawCategory : 'Other';
  const outsideCanonical = !CANONICAL_CATEGORY_SET.has(rawCategory);
  let reason = outsideCanonical
    ? 'Out of vocabulary category'
    : parsed.reason?.trim() || 'AI guessed best category';
  if (outsideCanonical) {
    confidence = Math.min(confidence, 0.6);
  }

  const result: CategorizeResult = {
    category,
    subcategory: parsed.subcategory?.trim() || null,
    confidence,
    reason,
    source: 'ai',
    model,
    forceNeedsReview: outsideCanonical,
  };

  safeLog('tag-categorize-batch.ai_choice', {
    vendorKey: vendorKey || 'unknown',
    category: result.category,
    confidence: result.confidence,
  });

  return result;
}

async function resolveImportIds(supabase: any, userId: string, importId?: string, documentId?: string): Promise<string[]> {
  if (importId) return [importId];
  if (!documentId) return [];
  const { data, error } = await supabase
    .from('imports')
    .select('id')
    .eq('user_id', userId)
    .eq('document_id', documentId);
  if (error) throw new Error(`Failed to resolve documentId to importId: ${error.message}`);
  return (data || []).map((row: any) => row.id);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method not allowed. Use POST.' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const auth = await verifyAuth(event);
    if (auth.error || !auth.userId) {
      return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: auth.error || 'Unauthorized' }) };
    }
    const userId = auth.userId;
    if (body.userId && String(body.userId).trim() !== userId) {
      return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'body.userId does not match token user' }) };
    }
    const importId = body.importId ? String(body.importId).trim() : undefined;
    const documentId = body.documentId ? String(body.documentId).trim() : undefined;
    const limitInput = Number(body.limit);
    const limit = Number.isFinite(limitInput) ? Math.max(1, Math.min(500, Math.floor(limitInput))) : 50;
    const force = asBool(body.force, false);
    const dryRun = asBool(body.dryRun, false);
    const maxAiCallsPerRunInput = Number(body.maxAiCallsPerRun);
    const maxAiCallsPerRun = Number.isFinite(maxAiCallsPerRunInput)
      ? Math.max(0, Math.min(100, Math.floor(maxAiCallsPerRunInput)))
      : 15;
    const aiCache = new Map<string, CategorizeResult>();
    let aiCallsUsed = 0;

    if (!importId && !documentId) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Provide importId or documentId' }) };
    }

    const supabase = serverSupabase();
    const importIds = await resolveImportIds(supabase, userId, importId, documentId);
    if (importIds.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, processed: 0, skipped: 0, rows: [] }) };
    }

    let query = supabase
      .from('transactions_staging')
      .select('id, user_id, import_id, data_json, tag_status, tag_category')
      .eq('user_id', userId)
      .order('parsed_at', { ascending: true })
      .limit(limit);

    query = importIds.length === 1 ? query.eq('import_id', importIds[0]) : query.in('import_id', importIds);
    if (!force) {
      query = query.or('tag_status.is.null,tag_category.is.null');
    }

    const { data: rows, error: rowsError } = await query;
    if (rowsError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: 'Failed to fetch staging rows', message: rowsError.message }),
      };
    }

    const stagingRows = (rows || []) as StagingRow[];
    if (stagingRows.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, processed: 0, skipped: 0, rows: [] }) };
    }

    const vendorKeyById = new Map<string, string>();
    const uniqueVendorKeys = new Set<string>();
    for (const row of stagingRows) {
      const { vendorText } = extractTxFields(row);
      const normalizedVendorText = normalizeVendorText(vendorText);
      const vendorKey = normalizeVendorKey(normalizedVendorText);
      vendorKeyById.set(row.id, vendorKey);
      if (vendorKey) uniqueVendorKeys.add(vendorKey);
    }

    const { data: memoryRows, error: memoryError } = await supabase
      .from('vendor_category_memory')
      .select('user_id, vendor_key, category, subcategory')
      .eq('user_id', userId)
      .in('vendor_key', Array.from(uniqueVendorKeys));

    if (memoryError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: 'Failed to fetch vendor memory', message: memoryError.message }),
      };
    }

    const memoryMap = new Map<string, MemoryRow>();
    for (const row of (memoryRows || []) as MemoryRow[]) {
      memoryMap.set(row.vendor_key, row);
    }

    // Fetch user-defined DB rules (applied between vendor memory and inline rules)
    type DbCategoryRule = { match_type: string; match_value: string; category: string };
    let userDbRules: DbCategoryRule[] = [];
    try {
      const { data: dbRuleRows } = await supabase
        .from('category_rules')
        .select('match_type, match_value, category')
        .eq('user_id', userId)
        .eq('is_active', true);
      const DB_RULE_PRIORITY: Record<string, number> = { exact: 0, starts_with: 1, contains: 2, regex: 3 };
      userDbRules = ((dbRuleRows || []) as DbCategoryRule[]).sort(
        (a, b) => (DB_RULE_PRIORITY[a.match_type] ?? 9) - (DB_RULE_PRIORITY[b.match_type] ?? 9)
      );
    } catch {
      /* category_rules table may not exist yet — degrade gracefully */
    }

    function pickUserDbRule(text: string): CategorizeResult | null {
      const lower = text.toLowerCase();
      for (const rule of userDbRules) {
        const val = rule.match_value.toLowerCase();
        let matched = false;
        if (rule.match_type === 'exact') matched = lower === val;
        else if (rule.match_type === 'starts_with') matched = lower.startsWith(val);
        else if (rule.match_type === 'contains') matched = lower.includes(val);
        else if (rule.match_type === 'regex') {
          try { matched = new RegExp(rule.match_value, 'i').test(text); } catch {}
        }
        if (matched) {
          return {
            category: rule.category,
            subcategory: null,
            confidence: 0.9,
            reason: `Matched user rule (${rule.match_type}: ${rule.match_value})`,
            source: 'rules',
            model: null,
          };
        }
      }
      return null;
    }

    const previewRows: Array<Record<string, any>> = [];
    let updatedCount = 0;

    for (const row of stagingRows) {
      const { vendorText, amountRaw, currency, date } = extractTxFields(row);
      const normalizedVendorText = normalizeVendorText(vendorText);
      const vendorKey = vendorKeyById.get(row.id) || '';
      let result: CategorizeResult;

      const memory = memoryMap.get(vendorKey);
      if (memory) {
        result = {
          category: memory.category,
          subcategory: memory.subcategory,
          confidence: 0.92,
          reason: 'Matched vendor memory',
          source: 'vendor_memory',
          model: null,
        };
      } else {
        // Check user-defined DB rules before inline rules
        const userRule = pickUserDbRule(normalizedVendorText);
        if (userRule) {
          result = userRule;
        } else {
        const rule = pickRule(normalizedVendorText);
        if (rule) {
          result = rule;
        } else {
          if (vendorKey && aiCache.has(vendorKey)) {
            result = aiCache.get(vendorKey)!;
          } else if (aiCallsUsed >= maxAiCallsPerRun) {
            result = {
              category: 'Other',
              subcategory: null,
              confidence: 0,
              reason: 'AI budget reached',
              source: 'ai',
              model: null,
              forceNeedsReview: true,
            };
          } else {
            try {
              result = await runAiCategorization(
                normalizedVendorText,
                { amountRaw, currency, date },
                vendorKey
              );
              aiCallsUsed += 1;
              if (vendorKey) aiCache.set(vendorKey, result);
            } catch {
              result = {
                category: 'Other',
                subcategory: null,
                confidence: 0.5,
                reason: 'AI unavailable, used safe fallback',
                source: 'ai',
                model: null,
                forceNeedsReview: true,
              };
            }
          }
        }
        } // close else { for pickUserDbRule check
      }

      // Category consistency guardrail:
      // If AI output conflicts with known memory for this vendor key, lower confidence and force review.
      if (result.source === 'ai' && vendorKey) {
        const knownMemory = memoryMap.get(vendorKey);
        if (knownMemory?.category && result.category && knownMemory.category !== result.category) {
          result = {
            ...result,
            confidence: 0.5,
            reason: 'AI category differs from vendor memory',
            forceNeedsReview: true,
          };
        }
      }

      const tagStatus = result.forceNeedsReview ? 'needs_review' : (result.confidence >= 0.85 ? 'auto' : 'needs_review');
      const updatePayload = {
        tag_category: result.category,
        tag_subcategory: result.subcategory,
        tag_confidence: result.confidence,
        tag_reason: result.reason,
        tag_status: tagStatus,
        tag_version: 'v1',
        tag_rule_source: result.source,
        tag_model: result.model,
        tag_updated_at: new Date().toISOString(),
      };

      previewRows.push({
        id: row.id,
        importId: row.import_id,
        vendor_key: vendorKey,
        tag_category: updatePayload.tag_category,
        tag_subcategory: updatePayload.tag_subcategory,
        tag_confidence: updatePayload.tag_confidence,
        tag_status: updatePayload.tag_status,
        tag_rule_source: updatePayload.tag_rule_source,
      });

      if (!dryRun) {
        if (force) {
          const { data: updatedRows, error: updateError } = await supabase
            .from('transactions_staging')
            .update(updatePayload)
            .eq('id', row.id)
            .eq('user_id', userId)
            .select('id');
          if (updateError) {
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ ok: false, error: 'Failed to update staging row', message: updateError.message }),
            };
          }
          if ((updatedRows || []).length > 0) updatedCount += 1;
        } else {
          // Race-safe idempotency without .or on update(): update if tag_status is null, else if tag_category is null.
          let { data: updatedRows, error: updateError } = await supabase
            .from('transactions_staging')
            .update(updatePayload)
            .eq('id', row.id)
            .eq('user_id', userId)
            .is('tag_status', null)
            .select('id');

          if (updateError) {
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ ok: false, error: 'Failed to update staging row', message: updateError.message }),
            };
          }

          if ((updatedRows || []).length === 0) {
            ({ data: updatedRows, error: updateError } = await supabase
              .from('transactions_staging')
              .update(updatePayload)
              .eq('id', row.id)
              .eq('user_id', userId)
              .is('tag_category', null)
              .select('id'));

            if (updateError) {
              return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ ok: false, error: 'Failed to update staging row', message: updateError.message }),
              };
            }
          }

          if ((updatedRows || []).length > 0) updatedCount += 1;
        }
      }
    }

    safeLog('tag-categorize-batch.done', {
      userId: `${userId.slice(0, 8)}...`,
      importCount: importIds.length,
      selectedRows: stagingRows.length,
      dryRun,
      force,
      updatedCount,
      aiCallsUsed,
      maxAiCallsPerRun,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        dryRun,
        force,
        maxAiCallsPerRun,
        aiCallsUsed,
        processed: stagingRows.length,
        updated: dryRun ? 0 : updatedCount,
        preview: previewRows,
      }),
    };
  } catch (error: any) {
    safeLog('tag-categorize-batch.error', { message: error?.message || String(error) });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
      }),
    };
  }
};
