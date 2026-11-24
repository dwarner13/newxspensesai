/**
 * Tax report privacy remediation (owner GO 2026-11-24).
 * generate-tax-report.ts embedded the owner's employer (Gordon Food Service / GFS), business
 * (ROWNMI, FreshBooks), bank (BMO) and insurance-benefit details (Manulife disability) in EVERY
 * customer's exported report. All customer-facing text is now generic; the internal vehicle keys
 * (business_km_gfs / business_km_rownmi) are unchanged for saved-data compatibility.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(path.resolve(__dirname, '../generate-tax-report.ts'), 'utf8');
const visible = src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/\b(business_km_gfs|business_km_rownmi)\b/g, '');

describe('tax report contains no owner-specific information', () => {
  it.each([/ROWNMI/i, /\bGFS\b/, /Gordon Food/i, /FreshBooks/i, /\bBMO\b/, /Manulife/i, /disability/i, /Darrell/i])('no %s', (re) => {
    expect(visible).not.toMatch(re);
  });
  it('keeps generic Canadian tax-organizing guidance', () => {
    expect(src).toMatch(/Employment driving, if any — T777/);
    expect(src).toMatch(/Self-employment driving, if any — T2125/);
    expect(src).toMatch(/require a T2200 signed by the employer/);
    expect(src).toMatch(/Employment income, if any, should be verified against the T4 slip\(s\)\./);
  });
  it('vehicle calculations and saved keys are unchanged', () => {
    expect(src).toMatch(/const business_km = vehicleCfgInput\.business_km \|\| \(business_km_gfs \+ business_km_rownmi\);/);
  });
});
