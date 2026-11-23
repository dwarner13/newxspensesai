/**
 * UX-N1 N0-d — the sidebar Inbox item no longer shows tag-inbox's uncategorized-merchant
 * count (it did not represent Inbox messages). The Categories review badge is unchanged.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const sidebar = fs.readFileSync(path.join(root, 'src/components/navigation/DesktopSidebar.tsx'), 'utf8');

describe('DesktopSidebar', () => {
  it('has no Inbox badge sourced from tag-inbox', () => {
    expect(sidebar).not.toMatch(/inboxBadge/);
    expect(sidebar).not.toMatch(/\/\.netlify\/functions\/tag-inbox/);
    expect(sidebar).not.toMatch(/item\.to === '\/dashboard\/inbox'/);
  });

  it('keeps the Categories review badge', () => {
    expect(sidebar).toMatch(/useSmartCategoriesStats\(\)/);
    expect(sidebar).toMatch(/!!uncatBadge && item\.to === '\/dashboard\/categories'/);
  });
});
