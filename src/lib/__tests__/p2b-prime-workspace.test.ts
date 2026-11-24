/**
 * P2-b — /dashboard/chat/prime opens the single mounted Prime chat in Workspace mode.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { workspaceSideGutter, primePanelWidth, WORKSPACE_COLUMN_PX } from '../primeChatMode';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const route = read('src/pages/PrimeChatV2/PrimeWorkspaceRoute.tsx');
const app = read('src/App.tsx');
const prime = read('src/pages/PrimeChatV2/PrimeChatV2.tsx');
const layout = read('src/layouts/DashboardLayout.tsx');

describe('Workspace layout helpers', () => {
  it('Workspace is full width with a centred 760px column', () => {
    expect(primePanelWidth('workspace')).toBe('100vw');
    expect(WORKSPACE_COLUMN_PX).toBe(760);
    expect(workspaceSideGutter('workspace')).toBe('max(16px, calc((100% - 760px) / 2))');
    expect(workspaceSideGutter('quick')).toBe('16px');
    expect(workspaceSideGutter('expanded')).toBe('16px');
  });
});

describe('routing', () => {
  it('chat/prime is a dashboard child route, declared before chat/:employeeId', () => {
    const primeIdx = app.indexOf('<Route path="chat/prime" element={<Suspense fallback={<LoadingSpinner />}><PrimeWorkspaceRoute /></Suspense>} />');
    const genericIdx = app.indexOf('<Route path="chat/:employeeId" element={<EmployeeChatPage />} />');
    expect(primeIdx).toBeGreaterThan(-1);
    expect(genericIdx).toBeGreaterThan(primeIdx);
    // Inside the same authenticated dashboard route block as the other dashboard pages.
    expect(app.lastIndexOf('<Route path="settings"', primeIdx)).toBeGreaterThan(-1);
  });

  it('Crystal, Tag and Blitz still use EmployeeChatPage', () => {
    expect(app).toMatch(/<Route path="chat\/:employeeId" element=\{<EmployeeChatPage \/>\} \/>/);
    expect(app).toMatch(/<Route path="blitz" element=\{<EmployeeChatPage \/>\} \/>/);
    expect(app).toMatch(/<Route path="chat" element=\{<Navigate to="\/dashboard\/chat\/prime" replace \/>\} \/>/);
  });
});

describe('PrimeWorkspaceRoute', () => {
  it('only sets the mode and opens the panel, deferred one frame and cancellable', () => {
    expect(route).toMatch(/const frame = requestAnimationFrame\(\(\) => \{\s*setMode\("workspace"\);\s*setOpen\(true\);/);
    expect(route).toMatch(/cancelAnimationFrame\(frame\);/);
    expect(route).not.toMatch(/useParams|useSearchParams|loadSessions|setRequestedSessionId|fetch\(/);
  });

  it('leaving the route resets Workspace to Quick so it never sticks for Ask Prime', () => {
    expect(route).toMatch(/return \(\) => \{\s*cancelAnimationFrame\(frame\);[\s\S]*?setMode\(\(m\) => \(m === "workspace" \? "quick" : m\)\);/);
  });

  it('closing Prime in Workspace returns to the dashboard', () => {
    expect(route).toMatch(/if \(openedRef\.current && !isOpen\) \{\s*setMode\("quick"\);\s*navigate\("\/dashboard", \{ replace: true \}\);/);
  });
});

describe('PrimeChatV2 in Workspace', () => {
  it('centres messages and composer via padding (same DOM in every mode)', () => {
    expect(prime).toMatch(/padding: `18px \$\{workspaceGutter\} 16px`/);
    expect(prime).toMatch(/padding: `10px \$\{workspaceGutter\} 12px`/);
  });

  it('hides Expand/Collapse in Workspace', () => {
    expect(prime).toMatch(/\{!isMobileWidth && chatMode !== 'workspace' && \(/);
  });
});

describe('DashboardLayout untouched', () => {
  it('keeps the route-change close effect and the daily Tag run', () => {
    expect(layout).toMatch(/if \(lastPathRef\.current !== location\.pathname\) \{\s*if \(isChatOpen\) closeChat\(\);\s*setIsPrimeBriefingOpen\(false\);/);
    expect(layout).toMatch(/xai_autofix_date/);
  });
});
