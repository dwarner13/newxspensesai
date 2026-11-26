/**
 * LD-1 — one XspensesAI startup screen (owner GO 2026-11-25).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { splashStatus, APP_SPLASH_STATUS, APP_SPLASH_SLOW_MS } from '../appSplash';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const splash = read('src/components/ui/AppSplash.tsx');

describe('status text', () => {
  it('short and honest; a long wait says so', () => {
    expect(splashStatus('signing-in', false)).toBe('Signing you in…');
    expect(splashStatus('preparing', false)).toBe('Preparing your workspace…');
    expect(splashStatus('loading', true)).toBe('This is taking longer than usual.');
    expect(Object.values(APP_SPLASH_STATUS).join(' ')).not.toMatch(/%/);
    expect(APP_SPLASH_SLOW_MS).toBe(15000);
  });
});

describe('AppSplash', () => {
  it('brand, accessible status, reduced motion, reload recovery', () => {
    expect(splash).toMatch(/<PrimeLogoBadge size=\{56\} \/>/);
    expect(splash).toMatch(/role="status" aria-live="polite"/);
    expect(splash).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ \.xai-splash-ring \{ animation: none; \} \}/);
    expect(splash).toMatch(/onClick=\{\(\) => window\.location\.reload\(\)\}/);
    expect(splash).not.toMatch(/setTimeout\([^)]*resolve|await new Promise/); // no artificial delay
  });
});

describe('every startup screen uses it (no separate spinners)', () => {
  it('sign-in check, workspace preparation, onboarding check and page downloads', () => {
    expect(read('src/contexts/AuthContext.tsx')).toMatch(/<AppSplash stage="signing-in" \/>/);
    expect(read('src/components/auth/RouteDecisionGate.tsx')).toMatch(/<AppSplash stage="preparing" \/>/);
    expect(read('src/components/auth/OnboardingGuard.tsx')).toMatch(/<AppSplash stage="preparing" \/>/);
    expect(read('src/components/ui/DelayedLoadingSpinner.tsx')).toMatch(/<AppSplash stage="loading" showRing=\{shouldShow\} inline=\{inDashboard\} \/>/);
    for (const f of ['src/contexts/AuthContext.tsx', 'src/components/auth/RouteDecisionGate.tsx', 'src/components/auth/OnboardingGuard.tsx', 'src/components/ui/DelayedLoadingSpinner.tsx']) {
      expect(read(f)).not.toMatch(/authSpin|xai-spin/);
    }
  });

  it('auth conditions are unchanged (presentation only)', () => {
    expect(read('src/contexts/AuthContext.tsx')).toMatch(/if \(loading && initialLoad\) \{\s*return \(\s*<AppSplash/);
    expect(read('src/components/auth/OnboardingGuard.tsx')).toMatch(/if \(!ready \|\| loading \|\| isProfileLoading\) \{/);
  });
});

describe('SPLASH-1 — one continuous startup splash', () => {
  it('the route gate remembers boot across the suspended-tree remount', () => {
    const gate = read('src/components/auth/RouteDecisionGate.tsx');
    expect(gate).toMatch(/let gateBootedThisPage = false;/);
    expect(gate).toMatch(/const hasBootedRef = useRef\(gateBootedThisPage\);/);
  });
  it('later loaders keep the splash on screen until the shell has mounted', () => {
    expect(read('src/components/ui/AppSplash.tsx')).toMatch(/const continuing = startupSplashSeen && !appShellMounted;/);
    expect(read('src/layouts/DashboardLayout.tsx')).toMatch(/useEffect\(\(\) => \{ markAppShellMounted\(\); \}, \[\]\);/);
  });
});
