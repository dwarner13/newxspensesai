/**
 * Security hardening (owner GO 2026-11-25): debug output and fail-open paths are local-dev-only.
 * NODE_ENV is unset on the hosted sites, so nothing may rely on it for security.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { isLocalDev, isDev, localDebugEnabled } from '../_shared/isDev';

const root = path.resolve(__dirname, '../../..');
const fnDir = path.join(root, 'netlify/functions');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const KEYS = ['NETLIFY_DEV', 'NODE_ENV', 'AWS_LAMBDA_FUNCTION_NAME', 'LAMBDA_TASK_ROOT', 'AWS_EXECUTION_ENV', 'OCR_DEBUG_INCLUDE_CLEANED_TEXT'];
let saved: Record<string, string | undefined>;
beforeEach(() => { saved = Object.fromEntries(KEYS.map(k => [k, process.env[k]])); for (const k of KEYS) delete process.env[k]; });
afterEach(() => { for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });

describe('isLocalDev / localDebugEnabled (behavioural)', () => {
  it('hosted default (nothing set, as on Netlify) is NOT local dev — even though NODE_ENV is unset', () => {
    expect(isLocalDev()).toBe(false);
    expect(isDev()).toBe(false);
  });
  it('NODE_ENV values never make a context local', () => {
    for (const v of ['development', 'test', '', 'production']) { process.env.NODE_ENV = v; expect(isDev()).toBe(false); }
  });
  it('NETLIFY_DEV=true inside a hosted Lambda runtime is still hosted (copied dev env)', () => {
    process.env.NETLIFY_DEV = 'true';
    process.env.OCR_DEBUG_INCLUDE_CLEANED_TEXT = '1';
    for (const k of ['AWS_LAMBDA_FUNCTION_NAME', 'LAMBDA_TASK_ROOT', 'AWS_EXECUTION_ENV']) {
      process.env[k] = 'x';
      expect(isLocalDev()).toBe(false);
      expect(localDebugEnabled('OCR_DEBUG_INCLUDE_CLEANED_TEXT')).toBe(false);
      delete process.env[k];
    }
  });
  it('debug requires local dev AND the explicit flag', () => {
    process.env.NETLIFY_DEV = 'true';
    expect(localDebugEnabled('OCR_DEBUG_INCLUDE_CLEANED_TEXT')).toBe(false);
    process.env.OCR_DEBUG_INCLUDE_CLEANED_TEXT = 'true';
    expect(localDebugEnabled('OCR_DEBUG_INCLUDE_CLEANED_TEXT')).toBe(false); // only '1'
    process.env.OCR_DEBUG_INCLUDE_CLEANED_TEXT = '1';
    expect(localDebugEnabled('OCR_DEBUG_INCLUDE_CLEANED_TEXT')).toBe(true);
    delete process.env.NETLIFY_DEV;
    expect(localDebugEnabled('OCR_DEBUG_INCLUDE_CLEANED_TEXT')).toBe(false);
  });
});

describe('OCR debug output is never client-controlled', () => {
  it('no deployed function reads body.debugIncludeCleanedText', () => {
    const offenders = fs.readdirSync(fnDir).filter(f => f.endsWith('.ts'))
      .filter(f => /debugIncludeCleanedText/.test(fs.readFileSync(path.join(fnDir, f), 'utf8')));
    expect(offenders).toEqual([]);
  });
  it('byte-ocr-parse and smart-import-ocr-background gate on localDebugEnabled only', () => {
    for (const f of ['netlify/functions/byte-ocr-parse.ts', 'netlify/functions/smart-import-ocr-background.ts']) {
      const s = read(f);
      expect(s).toMatch(/const includeCleanedTextDebug =\s*\/\/[^\n]*\n\s*localDebugEnabled\('OCR_DEBUG_INCLUDE_CLEANED_TEXT'\);/);
      expect(s).not.toMatch(/NODE_ENV !== 'production' &&\s*\(process\.env\.OCR_DEBUG/);
    }
  });
});

describe('no NODE_ENV fail-open security gates in deployed functions', () => {
  it("no `NODE_ENV !== 'production'` remains in functions or the shared helpers used for security", () => {
    for (const f of ['netlify/functions/byte-ocr-parse.ts', 'netlify/functions/smart-import-ocr-background.ts',
      'netlify/functions/_shared/rate-limit-v2.ts', 'netlify/functions/_shared/isDev.ts', 'netlify/functions/debug-memory.ts']) {
      expect(read(f)).not.toMatch(/process\.env\.NODE_ENV !== 'production'/);
    }
  });
});

describe('rate limiter: no silent skip on hosted sites; DB limiter unavailable → deny', () => {
  const rl = read('netlify/functions/_shared/rate-limit-v2.ts');
  it('missing-table silent skip is local-dev only', () => {
    expect(rl.match(/isLocalDev\(\) &&\n\s+\(message\.includes\('does not exist'\)/g)?.length).toBe(2);
  });
  it('a hosted endpoint requiring the DB limiter fails closed with 503', () => {
    expect(rl).toMatch(/\} else if \(!isLocalDev\(\)\) \{[\s\S]{0,400}statusCode: 503/);
  });
});

describe('getUserIdOrDemo removed (client-supplied user ids are never trusted)', () => {
  it('the unsafe helper no longer exists in deployed code and nothing imports it', () => {
    expect(fs.existsSync(path.join(fnDir, '_shared/demo-user.ts'))).toBe(false);
    const offenders = fs.readdirSync(fnDir).filter(f => f.endsWith('.ts'))
      .filter(f => /getUserIdOrDemo|_shared\/demo-user/.test(fs.readFileSync(path.join(fnDir, f), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
