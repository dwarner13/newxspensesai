/**
 * C2-E1 — Global Ask Prime.
 *
 * One Prime panel (PrimeBriefingPanel → PrimeChatV2Content) opened from every dashboard
 * workspace by the shared isPrimeBriefingOpenAtom. No new chat system, no new session path:
 * the panel reads the shared per-user Prime session key, so closing/reopening or switching
 * pages resumes the same conversation instead of creating a new one.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const header = read('src/components/ui/DashboardHeader.tsx');
const layout = read('src/layouts/DashboardLayout.tsx');
const tx = read('src/pages/dashboard/TransactionsPageV2.tsx');
const panel = read('src/pages/PrimeChatV2/PrimeBriefingPanel.tsx');
const v2 = read('src/pages/PrimeChatV2/PrimeChatV2.tsx');
const app = read('src/App.tsx');
const gate = read('src/components/layout/MobileLayoutGate.tsx');

const slice = (s: string, from: string, len = 900) => s.slice(s.indexOf(from), s.indexOf(from) + len);

describe('C2-E1 — Ask Prime entry points open the existing Prime panel', () => {
  it('desktop shell header (every dashboard workspace) has Ask Prime → isPrimeBriefingOpenAtom', () => {
    expect(header).toContain("import { isPrimeBriefingOpenAtom } from '../../lib/uiStore';");
    expect(header).toContain('const setIsPrimeBriefingOpen = useSetAtom(isPrimeBriefingOpenAtom);');
    const btn = slice(header, 'data-testid="ask-prime-header"', 400);
    expect(header).toMatch(/onClick=\{\(\) => setIsPrimeBriefingOpen\(true\)\}\s+aria-label="Ask Prime"\s+data-testid="ask-prime-header"/);
    expect(btn).toContain('Ask Prime');
  });

  it('the shell header is rendered by DashboardLayout for all dashboard routes (Dashboard, Transactions, Reports, Categories)', () => {
    expect(layout).toContain('<DashboardHeaderWithBadges />');
    const dash = app.slice(app.indexOf('<Route path="/dashboard" element={'));
    expect(dash).toMatch(/Desktop=\{DashboardLayout\}/);
    for (const r of ['reports', 'categories', 'transactions']) expect(dash).toContain(`<Route path="${r}" element=`);
  });

  it('mobile: the gate renders DashboardLayout, whose mobile header has Ask Prime', () => {
    expect(gate).toMatch(/shouldRenderMobile \? \(\s*\/\/[^\n]*\n\s*<Desktop \{\.\.\.desktopProps\} \/>/);
    const mobile = layout.slice(layout.indexOf('if (isMobile) {'), layout.indexOf('<MobileSidebar'));
    expect(mobile).toMatch(/onClick=\{\(\) => setIsPrimeBriefingOpen\(true\)\}\s+aria-label="Ask Prime"\s+data-testid="ask-prime-mobile"/);
  });

  it('Transactions has a clearly visible Ask Prime that opens the same panel', () => {
    expect(tx).toMatch(/const handleOpenPrime = useCallback\(\(\) => \{\s+setIsPrimeBriefingOpen\(true\);\s+\}, \[setIsPrimeBriefingOpen\]\);/);
    expect(tx).toMatch(/onClick=\{handleOpenPrime\}\s+aria-label="Ask Prime about your transactions"\s+data-testid="ask-prime-transactions"/);
  });

  it('Dashboard keeps its existing Prime launchers', () => {
    const home = read('src/pages/DashboardV2/DashboardHomeV2.tsx');
    expect(home).toContain('label="Open Prime"');
  });
});

describe('C2-E1 — one panel, one session, page stays visible', () => {
  it('the panel is an overlay portal over the current page (the page is not navigated away)', () => {
    expect(panel).toContain('createPortal(');
    // UX-P2a: width now follows primeChatModeAtom (560 Quick / 820 Expanded; full width on mobile).
    // PW-1: the stacking order moved to style (51; 120 in Workspace, above the app sidebar).
    expect(panel).toContain('className="fixed top-0 right-0 h-full');
    expect(panel).toContain('zIndex: mode === "workspace" ? 120 : 51,');
    expect(panel).toContain('width: isMobile ? "100%" : primePanelWidth(mode),');
    for (const s of [header, slice(tx, 'data-testid="ask-prime-transactions"', 200)]) expect(s).not.toMatch(/navigate\(['"]\/dashboard\/prime|window\.location/);
  });

  it('exactly one PrimeBriefingPanel per layout branch (mobile / desktop) — no duplicate panels', () => {
    expect(layout.match(/<PrimeBriefingPanel \/>/g)?.length).toBe(2);
    const m0 = layout.indexOf('if (isMobile) {');
    const mobile = layout.slice(m0, layout.indexOf('<PrimeOverlayProvider>', m0));
    expect(mobile.match(/<PrimeBriefingPanel \/>/g)?.length).toBe(1);
  });

  it('reopening resumes the shared Prime session (no new session per open or per page)', () => {
    expect(v2).toContain('localStorage.getItem(primeSessionStorageKey(userId))');
    // the only place that mints a new Prime session id is the explicit New Chat action
    const mints = v2.match(/localStorage\.setItem\(primeSessionStorageKey\(userId\), newId\)/g) ?? [];
    expect(mints.length).toBe(1);
    expect(v2.slice(v2.indexOf('const handleNewChat = useCallback(')).indexOf('localStorage.setItem(primeSessionStorageKey(userId), newId)')).toBeGreaterThan(0);
  });

  it('New Chat, History and cross-device resume stay wired in the panel', () => {
    // TB-2: the universal ChatToolbar replaced Prime's individual header buttons.
    expect(v2).toContain('onNew={handleNewChat}');
    expect(v2).toContain('onToggle: toggleSessionsOpen');
    expect(v2).toContain('handleResumeContinue');
  });
});

describe('C2-E1 — safe cleanup', () => {
  it('the never-rendered legacy PrimeFloatingButton is removed and unreferenced', () => {
    expect(fs.existsSync(path.join(root, 'src/components/chat/PrimeFloatingButton.tsx'))).toBe(false);
    expect(layout).not.toMatch(/import \{ PrimeFloatingButton \}|<PrimeFloatingButton/);
  });
});
