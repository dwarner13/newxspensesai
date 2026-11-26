/**
 * AR-SCHEMA (owner 2026-11-26): schema-aware tests that reject nonexistent database columns.
 * Owner: Prime HQ (scanner + baseline); every team fixes its own baseline entries.
 *
 * The scanner checks every literal column a `.from('<table>')` chain selects, filters, orders by or
 * writes against live-schema.json (names only, from the database's REST schema). Pre-existing drift
 * is recorded in schema-drift-baseline.json; NEW drift fails here, and a FIXED entry must be removed
 * from the baseline (it can only shrink). This is what would have caught the notifications defect
 * (employee_slug / message / payload written to user_notifications).
 */
import { describe, it, expect } from 'vitest';
import path from 'path';
import { scanTree, scanSource, LIVE_SCHEMA } from '../../../../src/shared/__tests__/fixtures/schema-scan';
import BASELINE from '../../../../src/shared/__tests__/fixtures/schema-drift-baseline.json';

const ROOT = path.join(__dirname, '../../../..');
const key = (v: { file: string; table: string; column: string; usage: string }) => `${v.file}|${v.table}.${v.column}|${v.usage}`;

describe('AR-SCHEMA: code never names a column the live database does not have', () => {
  const current = new Set(scanTree(ROOT, ['netlify/functions', 'src']).map(key));
  const baseline = new Set((BASELINE as { entries: string[] }).entries);

  it('no NEW nonexistent column anywhere in netlify/functions or src', () => {
    const added = [...current].filter(k => !baseline.has(k));
    expect(added).toEqual([]);
  });

  it('fixed drift is removed from the baseline (the baseline only shrinks)', () => {
    const stale = [...baseline].filter(k => !current.has(k));
    expect(stale).toEqual([]);
  });

  it('Tag import notices and Prime briefings are read/written on a table that has their columns', () => {
    for (const c of ['employee_slug', 'type', 'title', 'message', 'priority', 'payload', 'sent_at']) {
      expect(LIVE_SCHEMA.notifications).toContain(c);
    }
    const prime = [...current].filter(k => k.startsWith('netlify/functions/prime-briefing.ts|'));
    expect(prime).toEqual([]);
  });

  it('the scanner itself rejects nonexistent columns (select, filter, order, insert, update)', () => {
    const src = `
      sb.from('user_notifications').select('id, payload').eq('employee_slug', 'x').order('sent_at', { ascending: false });
      sb.from('user_notifications').insert({ user_id: u, message: m, meta: { nested_key: 1 } });
      sb.from('notifications').update({ read_at: now, read: true }).eq('id', id);
      sb.from('not_a_rest_table').select('anything');
    `;
    const v = scanSource('x.ts', src).map(x => `${x.table}.${x.column}/${x.usage}`);
    expect(v).toEqual(expect.arrayContaining([
      'user_notifications.payload/select', 'user_notifications.employee_slug/eq', 'user_notifications.sent_at/order',
      'user_notifications.message/insert', 'notifications.read/update',
    ]));
    expect(v).not.toContain('user_notifications.nested_key/insert'); // nested keys are values, not columns
    expect(v).not.toContain('user_notifications.meta/insert');       // meta exists
    expect(v.some(s => s.startsWith('not_a_rest_table'))).toBe(false);
  });
});
