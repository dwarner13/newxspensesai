/**
 * UX-C3 — the Chat History sidebar is mounted hidden on every dashboard page; it must
 * not query chat sessions until it is opened. useChatSessions itself is unchanged.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const sidebar = read('src/components/chat/ChatHistorySidebar.tsx');
const hook = read('src/hooks/useChatSessions.ts');
const layout = read('src/layouts/DashboardLayout.tsx');

describe('ChatHistorySidebar', () => {
  it('loads sessions only while open', () => {
    expect(sidebar).toMatch(/autoLoad: isOpen,/);
    expect(sidebar).not.toMatch(/autoLoad: true/);
  });

  it('relies on the hook re-running its load when autoLoad turns true', () => {
    expect(hook).toMatch(/if \(autoLoad && userId\) \{\s*loadSessions\(\);/);
    expect(hook).toMatch(/\}, \[autoLoad, userId, loadSessions\]\);/);
  });

  it('is still mounted and opened by the existing event (nothing removed)', () => {
    expect(layout).toMatch(/<ChatHistorySidebar\s+isOpen=\{isChatHistoryOpen\}/);
    expect(layout).toMatch(/setIsChatHistoryOpen\(true\)/);
  });
});
