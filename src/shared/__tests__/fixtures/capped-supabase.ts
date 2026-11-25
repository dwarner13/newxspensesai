/**
 * FST-1 test fixture: an in-memory Supabase-like client that behaves like the
 * hosted PostgREST API — every request returns AT MOST `cap` rows (default
 * 1,000), whatever .limit() or .range() asks for. An unpaged select therefore
 * silently returns the first `cap` rows of an unordered set, exactly the
 * production defect class.
 */

export interface FakeRow { [k: string]: unknown }

type Filter = (r: FakeRow) => boolean;

export interface CappedClientOptions {
  cap?: number;
  /** Shuffle unordered results (models "no ORDER BY = arbitrary subset"). */
  shuffleUnordered?: boolean;
  /** Fail the Nth request (1-based) with an error. */
  failOnRequest?: number;
}

export function makeCappedClient(tables: Record<string, FakeRow[]>, opts: CappedClientOptions = {}) {
  const cap = opts.cap ?? 1000;
  let requests = 0;
  const log: Array<{ table: string; range?: [number, number]; limit?: number; ordered: boolean }> = [];

  function builder(table: string) {
    const filters: Filter[] = [];
    const orders: Array<{ col: string; asc: boolean }> = [];
    let range: [number, number] | undefined;
    let limit: number | undefined;
    let head = false;

    const exec = () => {
      requests++;
      log.push({ table, range, limit, ordered: orders.length > 0 });
      if (opts.failOnRequest && requests === opts.failOnRequest) {
        return Promise.resolve({ data: null, error: { message: 'simulated failure' }, count: null });
      }
      let rows = (tables[table] || []).filter(r => filters.every(f => f(r)));
      const count = rows.length;
      if (orders.length > 0) {
        rows = [...rows].sort((a, b) => {
          for (const o of orders) {
            const av = a[o.col] as any; const bv = b[o.col] as any;
            if (av === bv) continue;
            if (av == null) return 1; if (bv == null) return -1;
            return (av < bv ? -1 : 1) * (o.asc ? 1 : -1);
          }
          return 0;
        });
      } else if (opts.shuffleUnordered) {
        // deterministic pseudo-shuffle
        rows = [...rows].sort((a, b) => hash(String(a.id)) - hash(String(b.id)));
      }
      if (range) rows = rows.slice(range[0], range[1] + 1);
      if (limit !== undefined) rows = rows.slice(0, limit);
      rows = rows.slice(0, cap);
      return Promise.resolve({ data: head ? null : rows.map(r => ({ ...r })), error: null, count });
    };

    const q: any = {
      select(_cols: string, o?: { head?: boolean }) { head = !!o?.head; return q; },
      eq(c: string, v: unknown) { filters.push(r => r[c] === v); return q; },
      neq(c: string, v: unknown) { filters.push(r => r[c] !== v); return q; },
      gte(c: string, v: any) { filters.push(r => r[c] != null && (r[c] as any) >= v); return q; },
      lte(c: string, v: any) { filters.push(r => r[c] != null && (r[c] as any) <= v); return q; },
      in(c: string, vs: unknown[]) { filters.push(r => vs.includes(r[c])); return q; },
      or(_f: string) { return q; },
      ilike(c: string, p: string) { const re = new RegExp('^' + p.replace(/%/g, '.*') + '$', 'i'); filters.push(r => re.test(String(r[c] ?? ''))); return q; },
      not() { return q; },
      is(c: string, v: unknown) { filters.push(r => (r[c] ?? null) === v); return q; },
      order(col: string, o: { ascending: boolean }) { orders.push({ col, asc: o?.ascending !== false }); return q; },
      range(a: number, b: number) { range = [a, b]; return q; },
      limit(n: number) { limit = n; return q; },
      maybeSingle() { return exec().then(r => ({ ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : null })); },
      single() { return q.maybeSingle(); },
      then(res: any, rej: any) { return exec().then(res, rej); },
    };
    return q;
  }

  return {
    from(table: string) { return builder(table); },
    get requests() { return requests; },
    log,
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Synthetic ledger: `n` transactions for `userId`, deterministic amounts and dates. */
export function syntheticTransactions(n: number, userId = 'u-synthetic', opts: { importId?: string; startYear?: number } = {}): FakeRow[] {
  const rows: FakeRow[] = [];
  const startYear = opts.startYear ?? 2025;
  for (let i = 0; i < n; i++) {
    const day = i % 28;
    const month = Math.floor(i / 28) % 12;
    const year = startYear + Math.floor(i / (28 * 12));
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}`;
    const isIncome = i % 10 === 0;
    rows.push({
      id: `tx-${String(i).padStart(6, '0')}`,
      user_id: userId,
      date,
      amount: isIncome ? 1000 : -((i % 50) + 1),
      type: isIncome ? 'income' : 'expense',
      category: isIncome ? 'Income' : ['Groceries', 'Dining', 'Fuel', 'Shopping'][i % 4],
      subcategory: null,
      merchant_name: isIncome ? 'Employer Payroll' : `Merchant ${i % 37}`,
      description: isIncome ? 'Payroll' : `Purchase ${i}`,
      import_id: opts.importId ?? 'imp-1',
    });
  }
  return rows;
}

/** Exact expected cents for syntheticTransactions(n) (the oracle). */
export function expectedTotals(n: number) {
  let income = 0; let spending = 0; let incomeCount = 0; let spendingCount = 0;
  for (let i = 0; i < n; i++) {
    if (i % 10 === 0) { income += 100000; incomeCount++; } else { spending += ((i % 50) + 1) * 100; spendingCount++; }
  }
  return { income, spending, incomeCount, spendingCount };
}
