/**
 * P-UI-4 — safe activity labels (owner GO). Whitelist only; never args, results or model text.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { activityLabelForTool, PRIME_ACTIVITY_LABELS } from '../../shared/prime-activity-labels';

const hook = fs.readFileSync(path.resolve(__dirname, '../../hooks/usePrimeChat.ts'), 'utf8');

describe('activityLabelForTool', () => {
  it("uses the owner's wording", () => {
    expect(activityLabelForTool('tx_search')).toBe('Reviewing your transactions');
    expect(activityLabelForTool('statement_coverage')).toBe('Checking your statement coverage');
    expect(activityLabelForTool('tag_status')).toBe('Consulting Tag');
    expect(activityLabelForTool('cash_flow_summary')).toBe('Preparing your financial summary');
  });
  it('unknown, mutating or malformed tools show nothing', () => {
    for (const t of ['tx_update_category', 'delete_my_data', 'request_employee_handoff', 'toString', '__proto__', 'Tx_Search', '<b>x</b>', '', null, 42, { tool: 'tx_search' }]) {
      expect(activityLabelForTool(t)).toBeNull();
    }
  });
  it('labels are fixed plain text with no figures or placeholders', () => {
    for (const label of Object.values(PRIME_ACTIVITY_LABELS)) expect(label).toMatch(/^[A-Z][a-zA-Z ]+$/);
  });
});

describe('usePrimeChat wiring', () => {
  it('sets the label only from the whitelist and clears it on result, first text, done and stream end', () => {
    expect(hook).toContain('setActiveToolLabel(activityLabelForTool(j.tool));');
    expect(hook).toContain("if (j.type === 'tool_result') setActiveToolLabel(null);");
    expect(hook.match(/if \(frag\) setActiveToolLabel\(null\)/g)?.length).toBe(2);
    expect(hook).toMatch(/if \(!isStreaming\) setActiveToolLabel\(null\);/);
    expect(hook).toContain('activeToolLabel, // P-UI-4');
  });
  it('never exposes tool args to the label', () => {
    expect(hook).not.toMatch(/setActiveToolLabel\([^)]*args/);
  });
});

describe('usePrimeChat: save-failure reporting (owner: never silent)', () => {
  it('a persisted:false done event or payload marks the reply meta.persisted = false', () => {
    expect(hook).toMatch(/if \(j\.persisted === false && messageId\)[\s\S]{0,400}extraMeta: \{ persisted: false \}/);
    expect(hook).toContain('if (payload?.persisted === false) extraMetaFromPayload.persisted = false;');
  });
});
