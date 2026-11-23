/**
 * H1-B — Custodian onboarding wizard: advance/navigate only after a confirmed save,
 * show a retryable error on failure, and count only the steps actually presented.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  getOnboardingProgress,
  assertSupabaseWriteOk,
  ONBOARDING_SAVE_ERROR_MESSAGE,
} from '../onboardingProgress';

const root = path.resolve(__dirname, '../../..');
const wizard = fs.readFileSync(path.join(root, 'src/components/onboarding/CustodianOnboardingWizard.tsx'), 'utf8');

const completeFn = wizard.slice(wizard.indexOf('const completeOnboarding'), wizard.indexOf('const advance'));
const advanceFn = wizard.slice(wizard.indexOf('const advance'), wizard.indexOf('const canAdvance'));

describe('getOnboardingProgress', () => {
  it('ends at 100% for the 6-step path (not self-employed)', () => {
    expect(getOnboardingProgress(0, 6)).toEqual({ current: 1, total: 6, percent: 17 });
    expect(getOnboardingProgress(5, 6)).toEqual({ current: 6, total: 6, percent: 100 });
  });

  it('ends at 100% for the 7-step path (self-employed)', () => {
    expect(getOnboardingProgress(5, 7)).toEqual({ current: 6, total: 7, percent: 86 });
    expect(getOnboardingProgress(6, 7)).toEqual({ current: 7, total: 7, percent: 100 });
  });

  it('clamps out-of-range input', () => {
    expect(getOnboardingProgress(-3, 6).current).toBe(1);
    expect(getOnboardingProgress(99, 6).current).toBe(6);
    expect(getOnboardingProgress(0, 0).total).toBe(1);
  });
});

describe('assertSupabaseWriteOk', () => {
  it('passes on success shapes', () => {
    expect(() => assertSupabaseWriteOk({ error: null }, 'x')).not.toThrow();
    expect(() => assertSupabaseWriteOk({}, 'x')).not.toThrow();
  });

  it('throws when Supabase reports an error, without echoing the server message', () => {
    expect(() => assertSupabaseWriteOk({ error: { message: 'secret detail' } }, 'Profile save')).toThrow('Profile save failed');
    try { assertSupabaseWriteOk({ error: { message: 'secret detail' } }, 'Profile save'); } catch (e) {
      expect(String(e)).not.toMatch(/secret detail/);
    }
  });
});

describe('CustodianOnboardingWizard', () => {
  it('derives the progress total from the presented steps, not a hard-coded 7', () => {
    expect(wizard).not.toMatch(/totalSteps\s*=\s*7/);
    expect(wizard).toMatch(/getOnboardingProgress\(step, STEPS\.length\)/);
    expect(wizard).toMatch(/\.\.\.\(isSelfEmployed \? \[/);
  });

  it('navigates only after a confirmed completion save (not from finally)', () => {
    const finallyBlock = completeFn.slice(completeFn.indexOf('finally'), completeFn.indexOf('if (saved)'));
    expect(finallyBlock).not.toMatch(/navigate\(/);
    expect(finallyBlock).not.toMatch(/onComplete\(/);
    expect(completeFn).toMatch(/assertSupabaseWriteOk\(completion, /);
    expect(completeFn.indexOf('saved = true')).toBeGreaterThan(completeFn.indexOf('assertSupabaseWriteOk(completion'));
    expect(completeFn.indexOf("navigate('/dashboard/upload?welcome=1'")).toBeGreaterThan(completeFn.indexOf('if (saved)'));
  });

  it('treats a missing session as a failure instead of silently continuing', () => {
    expect(completeFn).toMatch(/if \(!session\) throw new Error/);
    expect(wizard).not.toMatch(/if \(!session\) return;/);
  });

  it('advances a step only when its save succeeded', () => {
    expect(advanceFn).toMatch(/if \(ok\) setStep\(s => s \+ 1\)/);
    expect(advanceFn).not.toMatch(/^\s*setStep\(s => s \+ 1\);/m);
  });

  it('shows a retryable error on failure', () => {
    expect(wizard).toMatch(/setSaveError\(ONBOARDING_SAVE_ERROR_MESSAGE\)/);
    expect(wizard).toMatch(/role="alert"/);
    expect(wizard).toMatch(/'Try again \\u2192'/);
    expect(ONBOARDING_SAVE_ERROR_MESSAGE).toMatch(/try again/i);
  });

  it('keeps the existing questions, saved fields and destination', () => {
    expect(wizard).toMatch(/What should I call you\?/);
    expect(wizard).toMatch(/onboarding: \{ primary_goal: answers\.goal \}/);
    expect(wizard).toMatch(/custodian_ready: true/);
    expect(wizard).toMatch(/onboarding_completed: true/);
    expect(wizard).toMatch(/navigate\('\/dashboard\/upload\?welcome=1', \{ replace: true \}\)/);
  });
});
