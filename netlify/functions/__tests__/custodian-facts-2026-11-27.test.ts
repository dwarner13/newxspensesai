/**
 * Custodian's facts (owner GO 2026-11-27, direct): no hidden Xspense Score, no AI model names in
 * customer-facing text, Byte's OCR described as Claude Vision and Google Vision OCR together.
 * Prime HQ's approved tax wording is untouched (pinned by its own test).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(path.resolve(__dirname, '../custodian-chat.ts'), 'utf8');
const prompt = src.slice(0, src.indexOf("model: '"));

describe('Custodian facts', () => {
  it('does not describe the hidden Xspense Score', () => {
    expect(prompt).not.toMatch(/Xspense Score|xspense-score/);
  });
  it('names no AI models in its description', () => {
    expect(prompt).not.toMatch(/Sonnet|Haiku|Anthropic Claude API/);
  });
  it('describes Byte\'s OCR as both together, not primary / fallback', () => {
    expect(prompt).toMatch(/Byte reads the statement with Claude Vision and Google Vision OCR together/);
    expect(prompt).not.toMatch(/primary, Claude Vision|Claude Vision as fallback/);
  });
  it('keeps the approved business-expense wording', () => {
    expect(src).toMatch(/Possible business expense — requires review by your accountant\./);
  });
});
