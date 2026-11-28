/**
 * A-2 step 1 (owner "FINAL A-2 APPROVAL", 2026-11-27): the code-owned employee tool table.
 * Pins the approved matrix (snapshot), and the structural rules every later step relies on.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  EMPLOYEE_TOOLS, FORECAST_TOOLS, VERIFIED_FORECAST_TOOLS, effectiveEmployeeTools, toolAssignmentDrift, canonicalEmployee,
} from '../../../../src/shared/employee-tool-authorization';
import { TRANSACTION_MUTATION_TOOLS } from '../../../../src/shared/ai-action-safety';
import { TOOL_TO_ACTION } from '../../_shared/tagProposals';

const ROOT = path.join(__dirname, '../../../..');
const registry = fs.readFileSync(path.join(ROOT, 'src/agent/tools/index.ts'), 'utf8');
const tagCopilot = fs.readFileSync(path.join(ROOT, 'netlify/functions/tag-copilot.ts'), 'utf8');
const registeredBlock = (id: string) => {
  const s = registry.indexOf(`['${id}',`);
  return s < 0 ? null : registry.slice(s, registry.indexOf('}],', s));
};

describe('A-2 table: structure', () => {
  it('no entry names a prohibited transaction-changing tool', () => {
    for (const [emp, auth] of Object.entries(EMPLOYEE_TOOLS)) {
      for (const t of auth.tools) expect(TRANSACTION_MUTATION_TOOLS.has(t.id), `${emp}:${t.id}`).toBe(false);
      for (const banned of ['tag_bulk_recategorize']) expect(auth.tools.some(t => t.id === banned), `${emp}:${banned}`).toBe(false);
    }
  });

  it('every chat-hosted tool is registered; registry mutation flags agree with the access class', () => {
    for (const [emp, auth] of Object.entries(EMPLOYEE_TOOLS)) {
      if (emp === 'tag-copilot') continue;
      for (const t of auth.tools) {
        const block = registeredBlock(t.id);
        expect(block, `${emp}:${t.id} registered`).not.toBeNull();
        const mutates = /mutates:\s*true/.test(block!);
        expect(mutates, `${emp}:${t.id} access ${t.access}`).toBe(t.access === 'confirm_mutate');
      }
    }
  });

  it('confirm_mutate is exactly the three non-transaction writes', () => {
    const cm = new Set(Object.values(EMPLOYEE_TOOLS).flatMap(a => a.tools.filter(t => t.access === 'confirm_mutate').map(t => t.id)));
    expect([...cm].sort()).toEqual(['byte_rename_import', 'goalie_create_goal', 'goalie_update_goal_progress']);
  });

  it('tag-copilot: declared tools equal the table; every propose tool maps to a signed proposal action', () => {
    const declared = [...tagCopilot.matchAll(/^\s+name: '([a-z_]+)',$/gm)].map(m => m[1]).sort();
    expect(declared).toEqual(EMPLOYEE_TOOLS['tag-copilot'].tools.map(t => t.id).sort());
    for (const t of EMPLOYEE_TOOLS['tag-copilot'].tools) {
      if (t.access !== 'propose') continue;
      const mapped = t.id === 'update_single_transaction' ? /TAG_SINGLE_ACTION/.test(tagCopilot) : !!TOOL_TO_ACTION[t.id];
      expect(mapped, t.id).toBe(true);
    }
    expect(EMPLOYEE_TOOLS['tag-copilot'].tools.find(t => t.id === 'rename_merchant')?.access).toBe('propose');
  });

  it('consultations and handoff targets name known employees', () => {
    for (const [emp, auth] of Object.entries(EMPLOYEE_TOOLS)) {
      for (const x of [...auth.consults, ...auth.handoffTargets]) expect(EMPLOYEE_TOOLS[x], `${emp}→${x}`).toBeDefined();
    }
  });

  it('aliases resolve; unknown slugs are denied', () => {
    expect(canonicalEmployee('prime')).toBe('prime-boss');
    expect(canonicalEmployee('goalie-goals')).toBe('goalie-ai');
    expect(canonicalEmployee('crystal-analytics')).toBe('crystal');
    expect(canonicalEmployee('someone-new')).toBeNull();
    expect(effectiveEmployeeTools('someone-new', { chatDocuments: true })).toEqual([]);
  });
});

describe('A-2 table: owner decisions', () => {
  it('safeguard 1: forecasts are offered to nobody until verified (global)', () => {
    for (const emp of Object.keys(EMPLOYEE_TOOLS)) {
      const eff = effectiveEmployeeTools(emp, { chatDocuments: true });
      for (const f of FORECAST_TOOLS) if (!VERIFIED_FORECAST_TOOLS.has(f)) expect(eff, `${emp}:${f}`).not.toContain(f);
    }
  });
  it('G-1 / LT-1 / B-1: Goalie Coach, Ledger and Blitz have no tools', () => {
    for (const emp of ['goalie-coach', 'ledger-tax', 'blitz-debt']) expect(EMPLOYEE_TOOLS[emp].tools).toEqual([]);
  });
  it('L-1: Liberty cannot create goals; Goalie owns goal creation', () => {
    expect(EMPLOYEE_TOOLS['liberty-ai'].tools.map(t => t.id)).not.toContain('goalie_create_goal');
    const creators = Object.entries(EMPLOYEE_TOOLS).filter(([, a]) => a.tools.some(t => t.id === 'goalie_create_goal')).map(([e]) => e);
    expect(creators).toEqual(['goalie-ai']);
  });
  it('Prime document findings only when chat documents are allowed', () => {
    expect(effectiveEmployeeTools('prime-boss', { chatDocuments: false })).not.toContain('tag_document_findings');
    expect(effectiveEmployeeTools('prime-boss', { chatDocuments: true })).toContain('tag_document_findings');
  });
});

describe('A-2 table: approved snapshot (a change here is a permission change — review it)', () => {
  it('effective tools per employee', () => {
    const snap = Object.fromEntries(Object.keys(EMPLOYEE_TOOLS).map(e => [e, effectiveEmployeeTools(e, { chatDocuments: true }).sort().join(',')]));
    expect(snap).toEqual({
      'prime-boss': 'account_balances_query,analytics_forecast,cash_flow_summary,finley_debt_payoff_forecast,finley_loan_forecast,finley_savings_forecast,goalie_list_goals,merchant_analysis_refine,merchant_totals,request_employee_handoff,select_transaction,statement_coverage,tag_document_findings,tag_status,tax_summary,transaction_category_totals,tx_get,tx_search',
      'tag-ai': 'request_employee_handoff,tag_category_brain,tag_explain_category,tag_merchant_insights,transactions_query',
      'tag-copilot': 'bulk_recategorize,rename_merchant,search_transactions,set_category_rule,update_single_transaction',
      'byte-docs': 'byte_rename_import,get_document_by_id,get_recent_documents,request_employee_handoff,transaction_category_totals,transactions_query,vision_ocr_light',
      crystal: 'crystal_summarize_expenses,crystal_summarize_income',
      custodian: '',
      'finley-ai': 'account_balances_query,finley_debt_payoff_forecast,finley_loan_forecast,finley_savings_forecast,goals_query,transactions_query',
      'goalie-ai': 'crystal_summarize_expenses,crystal_summarize_income,finley_debt_payoff_forecast,finley_savings_forecast,goalie_create_goal,goalie_list_goals,goalie_suggest_actions,goalie_summarize_goals,goalie_update_goal_progress,request_employee_handoff,transactions_query',
      'goalie-coach': '',
      'liberty-ai': 'crystal_summarize_expenses,crystal_summarize_income,finley_debt_payoff_forecast,finley_loan_forecast,finley_savings_forecast,goalie_list_goals,goalie_suggest_actions,goalie_summarize_goals,request_employee_handoff,tag_explain_category,tag_merchant_insights,transactions_query',
      'ledger-tax': '',
      'blitz-debt': '',
      'chime-ai': 'chime_draft_notification_copy,chime_generate_notification,chime_list_obligations,chime_list_upcoming_notifications,chime_summarize_upcoming_obligations',
    });
  });

  it('database drift is reported (never applied): Prime example from the owner\'s 69 assignments', () => {
    const d = toolAssignmentDrift('prime-boss', ['delegate', 'sheet_export', 'bank_match', 'request_employee_handoff', 'account_balances_query', 'goalie_list_goals']);
    expect(d.extraInDatabase).toEqual(['bank_match', 'delegate', 'sheet_export']);
    expect(d.missingFromDatabase).toContain('cash_flow_summary');
  });
});
