/**
 * X-1 — Transactions toolbar filters kept in the URL (?from=&to=&type=), so they survive
 * opening a transaction, Tag, Prime, other pages and reload. Year, issuer and the other
 * existing params keep their own handling; this only adds and preserves these keys.
 */

export type TxType = 'all' | 'expenses' | 'income';

export interface TxToolbarParams {
  from: string;
  to: string;
  type: TxType;
  /** X-3: show only transactions that need a category (?review=1). */
  needsCategory?: boolean;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function readTxToolbarParams(search: string): TxToolbarParams {
  const sp = new URLSearchParams(search);
  const from = sp.get('from') || '';
  const to = sp.get('to') || '';
  const type = sp.get('type');
  return {
    from: DAY.test(from) ? from : '',
    to: DAY.test(to) ? to : '',
    type: type === 'expenses' || type === 'income' ? type : 'all',
    needsCategory: sp.get('review') === '1',
  };
}

/** New query string with from / to / type replaced; every other param is kept. */
export function writeTxToolbarParams(search: string, p: TxToolbarParams): string {
  const sp = new URLSearchParams(search);
  const set = (k: string, v: string) => { if (v) sp.set(k, v); else sp.delete(k); };
  set('from', DAY.test(p.from) ? p.from : '');
  set('to', DAY.test(p.to) ? p.to : '');
  set('type', p.type === 'all' ? '' : p.type);
  set('review', p.needsCategory ? '1' : '');
  return sp.toString();
}
