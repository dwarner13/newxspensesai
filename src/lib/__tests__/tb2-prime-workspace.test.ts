/**
 * TB-2 / PW-1 — Prime adopts the universal header; the full Workspace is a real workspace.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const v2 = read('src/pages/PrimeChatV2/PrimeChatV2.tsx');
const panel = read('src/pages/PrimeChatV2/PrimeBriefingPanel.tsx');
const drawer = read('src/components/chat/ConversationHistoryDrawer.tsx');

describe('Workspace no longer under the app sidebar', () => {
  it('panel and backdrop sit above the dashboard sidebar (z-index 100) in Workspace', () => {
    expect(panel).toContain('zIndex: mode === "workspace" ? 120 : 51,');
    expect(panel).toContain('style={{ zIndex: mode === "workspace" ? 119 : 50 }}');
  });
});

describe('Workspace layout', () => {
  it('collapsible history sidebar (same drawer component), main column keyed so it never remounts', () => {
    expect(v2).toMatch(/\{workspaceSidebar && workspaceHistoryOpen && \(\s*<ConversationHistoryDrawer\s+key="prime-history-sidebar"\s+variant="sidebar"/);
    expect(v2).toMatch(/<div key="prime-main" style=\{\{ flex: 1, minWidth: 0, height: "100%"/);
    expect(drawer).toMatch(/variant\?: "overlay" \| "sidebar";/);
    expect(drawer).toMatch(/role: "complementary", "aria-label": "Conversations"/);
  });
  it('conversation and composer share the centred column gutter', () => {
    expect(v2.match(/\$\{workspaceGutter\}/g)?.length).toBe(2);
  });
});

describe('header and replies', () => {
  it('universal identity + toolbar; brand crown artwork; no duplicate security badge in the header', () => {
    expect(v2).toMatch(/<ChatIdentity\s+isMobile=\{isMobileWidth\}\s+renderLogo=\{\(px\) => <PrimeLogoBadge size=\{px\} \/>\}/);
    expect(v2).toMatch(/<ChatToolbar\s+employeeName="Prime"/);
    expect(v2).not.toMatch(/>Secured<\/span>/);
    expect(v2).not.toMatch(/\{"\\u2655"\}<\/div>/);
  });
  it('mode changes keep the same conversation (no new engine)', () => {
    expect(v2).toMatch(/const selectPrimeMode = useCallback\(\(target: 'quick' \| 'expanded' \| 'workspace'\) => \{/);
    expect(v2.match(/useUnifiedChatEngine\(/g)?.length).toBe(1);
  });
  it('assistant replies have no heavy bubble background', () => {
    expect(v2).toMatch(/background: "transparent", borderLeft: `2px solid \$\{AGENT_COLORS\[agentForMsg\]\}55`/);
    expect(v2).not.toMatch(/AGENT_BG\[/);
  });
});
