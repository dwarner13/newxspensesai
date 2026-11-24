/**
 * P-1 — Prime personality recovery (owner GO "Prime Personality and Memory Recovery").
 *
 * Behavioural checks run the real functions (personality message, response sanitizer, brain pack);
 * structural guards pin the chat.ts wiring that cannot be exercised without the model.
 * Model-level behaviour (tone, when it chooses a table) is covered by the staging acceptance script.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildPrimePersonalityMessage } from '../_shared/primePersonality';
import { sanitizePrimeResponse } from '../_shared/primeResponseSanitizer';
import { PRIME_PERSONALITY_V1 } from '../../../src/shared/prime-personality-contract';
import { buildEmployeeBrainSystemPrompt } from '../../../src/lib/ai/brains/registry';

const root = path.resolve(__dirname, '../../..');
const chat = fs.readFileSync(path.join(root, 'netlify/functions/chat.ts'), 'utf8');

describe('P-1 personality: adaptive length and structure', () => {
  const msg = buildPrimePersonalityMessage({ preferredName: 'Sam Lee' });
  it('no global sentence, bullet or word caps; no global heading ban', () => {
    expect(msg).not.toMatch(/usually \d–\d sentences|at most 3 short bullets|well under 150 words|No headings or "What to do next"/);
    expect('typicalSentences' in PRIME_PERSONALITY_V1.length).toBe(false);
  });
  it('simple questions concise; complex questions structured with observations', () => {
    expect(msg).toMatch(/Simple or everyday question: answer it directly in a sentence or a short paragraph/);
    expect(msg).toMatch(/structured explanation/);
    expect(msg).toMatch(/close with one or two meaningful observations/);
  });
  it('recovers V2.4 conversational wording (client across the table; missing input in prose)', () => {
    expect(msg).toContain('as you would speak to a client across the table');
    expect(msg).toContain('mention it naturally in prose');
  });
  it('warm, knowledgeable, confident, curious and professional', () => {
    for (const t of ['warm', 'knowledgeable', 'confident', 'curious', 'professional']) {
      expect(PRIME_PERSONALITY_V1.voice.traits).toContain(t);
    }
    expect(msg).toMatch(/Confident when the evidence supports it, professional always, and genuinely curious/);
  });
  it('financial accuracy preserved: tables and figures only from verified evidence', () => {
    expect(msg).toContain('Tables contain only verified figures from this conversation.');
    expect(msg).toContain('Use only figures from verified evidence in this conversation');
    expect(msg).toContain('Tone never changes a number, a period, a source or a security rule');
    expect(msg).not.toMatch(/\$\d/);
  });
  it('employee specialization preserved', () => {
    expect(msg).toContain('Tag handles category changes. Byte handles document extraction.');
    expect(msg).toContain('Do not pretend to personally own specialist mutation capabilities');
  });
});

describe('P-1 personalization: one name, used naturally, never from email', () => {
  it('preferred first name, natural and occasional', () => {
    const m = buildPrimePersonalityMessage({ preferredName: 'Sam Lee' });
    expect(m).toContain("The user's preferred name is Sam.");
    expect(m).toContain('never in every reply and never as a mechanical opener');
  });
  it('no name → says so; the placeholder "there" is never treated as a name', () => {
    expect(buildPrimePersonalityMessage({ preferredName: null })).toContain('The user has not provided a name.');
    expect(buildPrimePersonalityMessage({ preferredName: 'there' })).toContain('The user has not provided a name.');
  });
  it('the brain pack no longer repeats the name', () => {
    const brain = buildEmployeeBrainSystemPrompt({ employee_key: 'prime', preferredName: 'Sam', currency: 'CAD' });
    expect(brain).not.toMatch(/User: Sam/);
    expect(brain).toContain('Currency: CAD');
  });
  it('chat.ts: server profile is the only source; never the email; never client page context', () => {
    expect(chat).not.toMatch(/email\?\.split\('@'\)\[0\]/);
    expect(chat).toContain('let preferredNameForPrime: string | null = null;');
    expect(chat).not.toMatch(/primeContextMessage \+= `User: \$\{pc\.displayName/);
  });
  it('chat.ts: Prime gets no second "User Name Context" block and no profile name line', () => {
    expect(chat).toMatch(/if \(isPrimeBoss\) \{\n\s+\/\/ P-1: Prime's single name rule lives in PRIME PERSONALITY/);
    expect(chat).toContain("formatUserContextForPrompt(userProfile, { omitName: finalEmployeeSlug === 'prime-boss' })");
  });
  it('chat.ts: no forced "Name," prefixes anywhere', () => {
    expect(chat).not.toMatch(/sanitized = `\$\{firstName\}, /);
    expect(chat).not.toMatch(/`\$\{firstName\}, (here is|using your last)/);
  });
});

describe('P-1: no fixed small-talk replies', () => {
  it('the canned replies and their overrides are gone; the model answers', () => {
    expect(chat).not.toContain('I am doing well and ready to help');
    expect(chat).not.toContain('Your profile name is');
    expect(chat).not.toMatch(/buildPrimeSmallTalkDeterministicReply|shouldForcePrimeSmallTalk/);
  });
});

describe('P-1: prompt order — personality is the last system block', () => {
  it('personality follows all other system messages', () => {
    const block = chat.slice(chat.indexOf('const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = ['));
    const iSys = block.indexOf('...systemMessages,');
    const iPers = block.indexOf('...(primePersonalityHint ? [primePersonalityHint] : []),');
    const iHist = block.indexOf('...recentMessages.map(');
    expect(iSys).toBeGreaterThan(0);
    expect(iPers).toBeGreaterThan(iSys);
    expect(iHist).toBeGreaterThan(iPers);
  });
});

describe('P-1: (b) truncation narrowed (behavioural)', () => {
  it('ordinary (a)/(b) options are kept in full', () => {
    const t = 'You have two options: (a) pay the card in full, or (b) split it over two months.\n\nOption (b) costs about **[$X]** more in interest.';
    expect(sanitizePrimeResponse(t)).toBe(t);
  });
  it('a list of (a)/(b) items is kept', () => {
    const t = '## Your choices\n(a) Keep the subscription\n(b) Cancel it this month';
    expect(sanitizePrimeResponse(t)).toBe(t);
  });
  it('only the legacy rigid scaffold is reduced to the direct answer', () => {
    const t = '(a) Direct answer: Groceries were your top category.\n(b) What I used: imported statements\n(c) Next: nothing';
    expect(sanitizePrimeResponse(t)).toBe('Groceries were your top category.');
  });
  it('rich formatting survives the sanitizer (headings, tables, numbered lists, bold)', () => {
    const t = [
      '## May at a glance',
      '',
      '| Category | Total |',
      '|---|---|',
      '| Groceries | **[$X]** |',
      '',
      '1. Review the dining spike',
      '2. Keep groceries steady',
      '',
      '---',
    ].join('\n');
    expect(sanitizePrimeResponse(t)).toBe(t);
  });
  it('internal scaffolding is still stripped', () => {
    expect(sanitizePrimeResponse('Here it is.\nbyte: raw extraction\nsnapshot: x')).toBe('Here it is.');
  });
});

import { resolvePreferredName } from '../../../src/shared/preferred-name';
describe('P-1: shared preferred-name resolver (server + greeting)', () => {
  it('chain order display → first → full → metadata full_name → metadata name', () => {
    expect(resolvePreferredName({ display_name: 'sam lee', first_name: 'X' })).toEqual({ fullName: 'Sam Lee', firstName: 'Sam', source: 'display_name' });
    expect(resolvePreferredName({ display_name: ' ', first_name: 'alex' }).source).toBe('first_name');
    expect(resolvePreferredName({ full_name: 'Jo Smith' }).firstName).toBe('Jo');
    expect(resolvePreferredName(null, { full_name: 'Pat Doe' }).source).toBe('metadata_full_name');
    expect(resolvePreferredName({}, { name: 'kim' }).fullName).toBe('Kim');
  });
  it('never an email address; "there" and blanks are no name', () => {
    expect(resolvePreferredName({ display_name: 'someone@example.com' })).toEqual({ fullName: null, firstName: null, source: 'none' });
    expect(resolvePreferredName({ display_name: 'there' }).source).toBe('none');
    expect(resolvePreferredName(null, null).firstName).toBeNull();
  });
  it('chat.ts uses the shared resolver for both paths', () => {
    expect(chat.match(/resolvePreferredName\(/g)?.length).toBe(3);
  });
});
