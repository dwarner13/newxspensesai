/**
 * Tag's post-import suggestions for ONE import (Tag HQ, owner GO 2026-11-25).
 *
 * One implementation shared by tag-background-sweep (shows the suggestions) and the signed
 * "apply suggestions" proposal (tagProposals, confirmed through tag-action commit_proposal), so what
 * the customer is shown is exactly what is proposed and applied.
 *
 * Suggestions come only from the customer's OWN rules and their own merchant history (≥80% of ≥3
 * categorized transactions). Protected rows (customer-confirmed, possibly-approved, unknown
 * provenance — approved "Other" included) are never suggested. A rule whose category is not a real
 * category is ignored (never an invented category, never a silent "Other"). Reads are complete
 * (paged past the API row cap); an incomplete read is reported, never presented as complete.
 * No I/O beyond owner-scoped reads; no logging.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { pagedSelectAll, type PagedQuery } from '../../../src/shared/paged-select';
import { normalizeMerchant } from './merchantUtils.js';
import { partitionAutoWritable } from './categorySource.js';
import { TAG_CATEGORIES } from './tagCategories.js';

export interface SuggestionGroup { merchant_name: string; category: string; subcategory: string | null; ids: string[]; count: number }
export interface ImportSuggestions {
  complete: boolean;
  groups: SuggestionGroup[];
  unsure: Array<{ merchant_name: string; count: number }>;
  skippedProtected: number;
  rowsScanned: number;
}

const canonical = (raw: unknown): { category: string; subcategory: string | null } | null => {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const [cat, sub] = s.includes('::') ? [s.slice(0, s.indexOf('::')), s.slice(s.indexOf('::') + 2)] : [s, ''];
  const c = (TAG_CATEGORIES as readonly string[]).find(x => x.toLowerCase() === cat.trim().toLowerCase());
  return c ? { category: c, subcategory: sub.trim() || null } : null;
};

interface Tx { id: string; merchant_name: string | null; category: string | null; category_source: string | null }

export async function computeImportSuggestions(sb: SupabaseClient, userId: string, importId: string): Promise<ImportSuggestions> {
  const empty: ImportSuggestions = { complete: false, groups: [], unsure: [], skippedProtected: 0, rowsScanned: 0 };
  const importRows = await pagedSelectAll<Tx>(() => sb.from('transactions')
    .select('id, merchant_name, category, category_source')
    .eq('user_id', userId).eq('import_id', importId)
    .or('category.eq.Needs Review,category.eq.Other,category.eq.Uncategorized,category.is.null')
    .order('id', { ascending: true }) as unknown as PagedQuery);
  if (importRows.error || !importRows.complete) return empty;
  const { writable, skippedProtected } = partitionAutoWritable(importRows.rows);

  const { data: rulesData, error: rulesErr } = await sb.from('category_rules')
    .select('match_type, match_value, merchant_pattern, category, subcategory, is_active').eq('user_id', userId);
  if (rulesErr) return empty;
  const rules = (rulesData ?? []).filter((r: { is_active?: boolean | null }) => r.is_active !== false);

  const history = await pagedSelectAll<Tx>(() => sb.from('transactions')
    .select('id, merchant_name, category, category_source')
    .eq('user_id', userId)
    .not('category', 'is', null)
    .not('category', 'eq', 'Needs Review').not('category', 'eq', 'Other').not('category', 'eq', 'Uncategorized')
    .order('id', { ascending: true }) as unknown as PagedQuery);
  if (history.error || !history.complete) return empty;
  const merchantCats: Record<string, Record<string, number>> = {};
  for (const tx of history.rows) {
    const key = normalizeMerchant(tx.merchant_name || '');
    if (!key || !tx.category) continue;
    (merchantCats[key] ||= {})[tx.category] = (merchantCats[key][tx.category] || 0) + 1;
  }

  const groupMap = new Map<string, SuggestionGroup>();
  const unsureMap = new Map<string, { merchant_name: string; count: number }>();
  for (const tx of writable) {
    const normalized = normalizeMerchant(tx.merchant_name || '');
    let target: { category: string; subcategory: string | null } | null = null;
    const rule = rules.find((r: { match_type?: string; match_value?: string; merchant_pattern?: string }) => {
      const p = normalizeMerchant(r.match_value || r.merchant_pattern || '');
      return !!p && (r.match_type === 'exact' ? normalized === p : normalized.includes(p));
    }) as { category?: string; subcategory?: string | null } | undefined;
    if (rule) {
      const c = canonical(rule.category);
      if (c) target = { category: c.category, subcategory: rule.subcategory || c.subcategory };
    }
    if (!target) {
      const cats = merchantCats[normalized];
      if (cats) {
        const total = Object.values(cats).reduce((s, n) => s + n, 0);
        const top = Object.entries(cats).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
        const c = canonical(top[0]);
        if (c && total >= 3 && top[1] / total >= 0.8) target = c;
      }
    }
    if (!target) {
      const u = unsureMap.get(normalized) || { merchant_name: tx.merchant_name || '', count: 0 };
      u.count++; unsureMap.set(normalized, u);
      continue;
    }
    const key = `${normalized}|${target.category}|${target.subcategory ?? ''}`;
    const g = groupMap.get(key) || { merchant_name: tx.merchant_name || '', category: target.category, subcategory: target.subcategory, ids: [], count: 0 };
    g.ids.push(String(tx.id)); g.count++;
    groupMap.set(key, g);
  }
  return {
    complete: true,
    groups: [...groupMap.values()].sort((a, b) => b.count - a.count || a.merchant_name.localeCompare(b.merchant_name)),
    unsure: [...unsureMap.values()],
    skippedProtected,
    rowsScanned: importRows.rowsFetched,
  };
}
