/**
 * S-1 — MobileDebugPanel renders only in development builds.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { isMobileDebugEnabled } from '../../components/dev/mobileDebugGate';

const root = path.resolve(__dirname, '../../..');
const panel = fs.readFileSync(path.join(root, 'src/components/dev/MobileDebugPanel.tsx'), 'utf8');

describe('isMobileDebugEnabled', () => {
  it('is always off in production builds, even with ?debugMobile=1 or the env flag', () => {
    expect(isMobileDebugEnabled(false, undefined, '?debugMobile=1')).toBe(false);
    expect(isMobileDebugEnabled(false, 'true', '?debugMobile=1')).toBe(false);
  });

  it('can be turned on in development', () => {
    expect(isMobileDebugEnabled(true, undefined, '?debugMobile=1')).toBe(true);
    expect(isMobileDebugEnabled(true, 'true', '')).toBe(true);
  });

  it('is off in development without a switch', () => {
    expect(isMobileDebugEnabled(true, undefined, '')).toBe(false);
    expect(isMobileDebugEnabled(true, 'false', '?debugMobile=0')).toBe(false);
    expect(isMobileDebugEnabled(true, undefined, null)).toBe(false);
  });
});

describe('MobileDebugPanel', () => {
  it('uses the gate with import.meta.env.DEV', () => {
    expect(panel).toMatch(/isMobileDebugEnabled\(\s*import\.meta\.env\.DEV,/);
    expect(panel).not.toMatch(/search\?\.get\('debugMobile'\) === '1'/);
  });
});
