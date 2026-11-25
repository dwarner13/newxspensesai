/**
 * Owner decision (2026-11-25): no browser-side destructive financial-data deletion in
 * Settings; an honest support-contact option instead.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const page = fs.readFileSync(path.resolve(__dirname, '../../pages/SettingsV2/SettingsPageV2.tsx'), 'utf8');

describe('Settings data & privacy', () => {
  it('no Nuke button and no browser-side table deletes', () => {
    expect(page).not.toMatch(/Nuke All Financial Data<\/button>/);
    expect(page).not.toMatch(/\.delete\(\)/);
    expect(page).not.toMatch(/"transactions_staging","transactions"/);
  });
  it('offers a support contact instead', () => {
    expect(page).toMatch(/href="mailto:support@xspensesai\.com\?subject=Remove%20my%20financial%20data"/);
    expect(page).toMatch(/isn't available in the app yet/);
  });
});
