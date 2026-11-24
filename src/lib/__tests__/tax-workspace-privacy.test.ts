/**
 * Tax Workspace privacy remediation (owner decision 2026-11-24).
 * The page showed the owner's own business ("ROWNMI Clients") and employer ("GFS", T2200 from GFS)
 * and their personal kilometre figures as placeholders to every customer. Visible text is now
 * generic and optional; the internal storage keys (businessGFS / businessROWNMI) are unchanged for
 * saved-data compatibility and are never rendered.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(path.resolve(__dirname, '../../pages/dashboard/TaxWorkspacePage.tsx'), 'utf8');

/**
 * The whole file minus comments and the four internal storage-key identifiers. Anything owner-
 * specific left after that would be rendered or sent somewhere, so none may remain (stricter than
 * trying to extract only "visible" strings).
 */
function visibleText(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\b(businessGFS|businessROWNMI|business_km_gfs|business_km_rownmi)\b/g, '');
}

describe('Tax Workspace shows no owner-specific information', () => {
  const visible = visibleText(src);
  it('no owner business or employer names in any visible text', () => {
    for (const re of [/ROWNMI/i, /\bGFS\b/, /Gordon Food/i, /FreshBooks/i, /Darrell/i]) {
      expect(visible).not.toMatch(re);
    }
  });
  it('no personal example figures as placeholders', () => {
    expect(src).not.toMatch(/placeholder: "e\.g\. 35000"/);
    expect(src).not.toMatch(/placeholder: "e\.g\. 7321"/);
  });
  it('generic, optional T777 / T2125 / T2200 guidance is preserved', () => {
    expect(src).toMatch(/Employment driving, if any \(T777\)/);
    expect(src).toMatch(/Self-employment driving, if any \(T2125\)/);
    expect(src).toMatch(/need a T2200 signed by your employer/);
    expect(src).toMatch(/If applicable:/);
  });
  it('saved-data compatibility: storage keys and calculation are unchanged', () => {
    expect(src).toMatch(/business_km_gfs: parseFloat\(vehicleKm\.businessGFS\) \|\| 0/);
    expect(src).toMatch(/business_km_rownmi: parseFloat\(vehicleKm\.businessROWNMI\) \|\| 0/);
    expect(src).toMatch(/business_km: \(parseFloat\(vehicleKm\.businessGFS\) \|\| 0\) \+ \(parseFloat\(vehicleKm\.businessROWNMI\) \|\| 0\)/);
  });
});
