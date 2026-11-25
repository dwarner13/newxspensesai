/**
 * HONEST-1 (owner: Goalie financial accuracy). The Goals & Debt page and Goalie must never
 * present example figures as the customer's own. Empty stays empty; missing storage and
 * load failures are stated plainly.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const data = read('src/pages/GoalsDebtV2/useGoalsData.ts');
const page = read('src/pages/GoalsDebtV2/GoalsDebtPageV2.tsx');
const panel = read('src/pages/GoalsDebtV2/GoalieCopilotPanel.tsx');

describe('HONEST-1 — no example goals or debts', () => {
  it('has no example goal / debt data and never falls back to it', () => {
    expect(data).not.toMatch(/EXAMPLE_GOALS|EXAMPLE_DEBTS/);
    expect(data).not.toMatch(/CIBC Visa|Canadian Tire MC|Student Loan/);
    expect(data).toMatch(/setGoals\(\[\]\)/);
    expect(data).toMatch(/setDebts\(\[\]\)/);
  });

  it('tells missing storage apart from a load failure', () => {
    expect(data).toMatch(/\["42P01", "42703", "PGRST204", "PGRST205"\]/);
    expect(data).toMatch(/if \(isSchemaMissing\(goalsErr\)\) setUnavailable\(true\); else setLoadError\(true\);/);
    expect(page).toContain("Goal and debt tracking isn&apos;t set up yet");
    expect(page).toMatch(/\{data\.loadError && !data\.unavailable && \(/);
  });

  it('shows no invented comparison', () => {
    expect(page).not.toContain('+12% vs last month');
  });

  it('Goalie does not summarise a plan the customer does not have', () => {
    expect(panel).toMatch(/const hasPlan = data\.goals\.length > 0 \|\| data\.debts\.length > 0;/);
    expect(panel).toMatch(/\{typeDone && hasPlan && \(/);
  });
});
