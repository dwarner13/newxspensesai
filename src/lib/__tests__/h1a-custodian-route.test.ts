/**
 * H1-A — /dashboard/custodian no longer crashes; it hands off to Settings and opens the
 * existing Custodian chat only for that explicit launch.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  CUSTODIAN_SETTINGS_PATH,
  buildCustodianLaunchState,
  shouldOpenCustodianFromState,
} from '../custodianLaunch';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const page = read('src/pages/dashboard/CustodianPage.tsx');
const settings = read('src/pages/SettingsV2/SettingsPageV2.tsx');

describe('custodian launch flag', () => {
  it('opens only for the explicit launch state', () => {
    expect(shouldOpenCustodianFromState(buildCustodianLaunchState())).toBe(true);
  });

  it('does not open for ordinary navigation', () => {
    for (const s of [undefined, null, {}, 'openCustodian', { openCustodian: 'true' }, { openCustodian: 1 }, { other: true }]) {
      expect(shouldOpenCustodianFromState(s)).toBe(false);
    }
  });

  it('targets the Settings route', () => {
    expect(CUSTODIAN_SETTINGS_PATH).toBe('/dashboard/settings');
  });
});

describe('CustodianPage', () => {
  it('no longer calls the nonexistent openWorkerChat launcher', () => {
    expect(page).not.toMatch(/openWorkerChat/);
    expect(page).not.toMatch(/useUnifiedChatLauncher/);
  });

  it('redirects to Settings with the one-time launch state', () => {
    expect(page).toMatch(/<Navigate\s+to=\{CUSTODIAN_SETTINGS_PATH\}\s+replace\s+state=\{buildCustodianLaunchState\(\)\}/);
  });
});

describe('SettingsPageV2', () => {
  it('opens Custodian only from the launch state and clears it afterwards', () => {
    expect(settings).toMatch(/shouldOpenCustodianFromState\(location\.state\)/);
    expect(settings).toMatch(/navigate\(location\.pathname \+ location\.search, \{ replace: true, state: null \}\)/);
  });

  it('keeps Custodian closed by default and keeps the floating bubble', () => {
    expect(settings).toMatch(/const \[custodianOpen, setCustodianOpen\] = useState\(false\)/);
    expect(settings).toMatch(/onClick=\{\(\) => setCustodianOpen\(true\)\} label="Open Custodian"/);
  });
});
