/**
 * C2-D — Prime personality consolidation.
 *
 * One authoritative personality path: PRIME_PERSONALITY_V1 (src/shared/prime-personality-contract.ts)
 * rendered by buildPrimePersonalityMessage (primePersonality.ts) and injected once by chat.ts.
 * primePolicy.ts (fact integrity) and the brain pack (role/reasoning) defer to it for length/tone.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildPrimePersonalityMessage } from '../_shared/primePersonality';
import { buildPrimeAuthoritySystemMessage } from '../_shared/primePolicy';
import { PRIME_PERSONALITY_V1 } from '../../../src/shared/prime-personality-contract';
import { buildEmployeeBrainSystemPrompt } from '../../../src/lib/ai/brains/registry';

const root = path.resolve(__dirname, '../../..');
const chat = fs.readFileSync(path.join(root, 'netlify/functions/chat.ts'), 'utf8');
const personaSrc = fs.readFileSync(path.join(root, 'netlify/functions/_shared/primePersonality.ts'), 'utf8');
const msg = buildPrimePersonalityMessage({ preferredName: 'Sam Lee' });

describe('C2-D — one authoritative personality path', () => {
  it('the personality message is rendered from PRIME_PERSONALITY_V1', () => {
    expect(personaSrc).toContain("import { PRIME_PERSONALITY_V1 as P } from '../../../src/shared/prime-personality-contract';");
    const [lo, hi] = PRIME_PERSONALITY_V1.length.typicalSentences;
    expect(msg).toContain(`Everyday questions: usually ${lo}–${hi} sentences.`);
    expect(msg).toContain(`at most ${PRIME_PERSONALITY_V1.expression.maxEmojiPerReply} per reply`);
    expect(msg).toContain(`Ask at most ${PRIME_PERSONALITY_V1.clarification.maxQuestionsPerTurn} follow-up question`);
  });

  it('chat.ts injects exactly one personality message, for Prime only', () => {
    expect(chat.match(/buildPrimePersonalityMessage\(/g)?.length).toBe(1);
    expect(chat).toMatch(/const primePersonalityHint =\s+isPrimeBoss\s+\?/);
    expect(chat.match(/\.\.\.\(primePersonalityHint \? \[primePersonalityHint\] : \[\]\)/g)?.length).toBe(1);
  });

  it('primePolicy no longer sets its own response length; it defers to PRIME PERSONALITY', () => {
    for (const lane of ['fast', 'deep'] as const) {
      const p = buildPrimeAuthoritySystemMessage({ lane, intent: 'x', hasDocs: false, hasSnapshot: false });
      expect(p).not.toMatch(/2-6 lines|keep it brief/);
      expect(p).toMatch(/follows? PRIME PERSONALITY/);
      // fact integrity and safety stay intact
      expect(p).toContain('NEVER state a material user fact as known');
      expect(p).toContain('Server-verified financial evidence');
    }
  });

  it('the brain pack keeps role/reasoning/delegation but no competing tone sample', () => {
    const brain = buildEmployeeBrainSystemPrompt({ employee_key: 'prime', preferredName: 'Sam', currency: 'CAD' });
    expect(brain).not.toContain('You spent $2,340 on Food & Dining');
    expect(brain).toContain('governed by PRIME PERSONALITY');
    for (const s of ['PRIME OWNS:', 'DELEGATION RULES:', 'Category mutation remains Tag-owned', 'FINANCIAL TRUTH OVERRIDES CONVERSATIONAL FLUENCY', 'RULE 1 - NO INVENTED DATA']) {
      expect(brain).toContain(s);
    }
  });

  it('specialist personalities are untouched (their brain packs do not get Prime personality)', () => {
    for (const key of ['tag', 'byte', 'crystal', 'goalie']) {
      const b = buildEmployeeBrainSystemPrompt({ employee_key: key, preferredName: 'Sam', currency: 'CAD' });
      expect(b).not.toContain('PRIME PERSONALITY');
    }
  });
});

describe('C2-D — owner-approved style rules', () => {
  it('warm, expressive, natural language; emotional awareness', () => {
    expect(msg).toContain('Warm, expressive, knowledgeable and engaged');
    expect(msg).toContain('Shopping took the top spot in May');
    expect(msg).toMatch(/share the excitement.*calm and steady.*frustration.*uncertain/);
    expect(msg).toContain('Expressive, never theatrical');
  });

  it('occasional emoji, never in serious moments', () => {
    expect(msg).toMatch(/one fitting emoji is welcome/);
    expect(msg).toMatch(/None in bad news, debt stress, frustration or serious planning/);
  });

  it('no canned openers or automatic endings; follow-ups only when useful', () => {
    expect(msg).toContain('"Great question!"');
    expect(msg).toContain('Start with the answer.');
    expect(msg).toMatch(/Never end with an automatic offer in any form/);
    expect(msg).toMatch(/only when it would genuinely change the answer/);
  });

  it('short by default, longer only when needed, key figures bolded sparingly', () => {
    expect(msg).toMatch(/Go longer only when the question genuinely needs it/);
    expect(msg).toMatch(/well under 150 words unless the user asks for depth/);
    expect(msg).toContain('Bold the one or two figures that matter most');
  });

  it('name used sparingly; profile name only', () => {
    expect(msg).toContain("The user's name is Sam. Use it sparingly");
    expect(buildPrimePersonalityMessage({ preferredName: 'there' })).toContain('The user has not provided a name.');
  });
});

describe('C2-D — personality never overrides accuracy, provenance or specialist boundaries', () => {
  it('figures only from verified evidence; examples contain placeholders, never real amounts', () => {
    expect(msg).toContain('Use only figures from verified evidence in this conversation');
    const examples = msg.slice(msg.indexOf('STYLE EXAMPLES'), msg.indexOf('PERSONALITY NEVER OVERRIDES TRUTH'));
    expect(examples).toContain('placeholders in [brackets] are never real figures');
    expect(examples).not.toMatch(/\$\d|\b\d{2,}\b/);
  });

  it('no unsupported specialist actions', () => {
    expect(msg).toContain('never say a specialist did something unless the conversation shows it happened');
    expect(msg).toContain('Do not pretend to personally own specialist mutation capabilities');
  });

  it('accuracy wins over expressiveness', () => {
    expect(msg).toContain('Tone never changes a number, a period, a source or a security rule');
  });

  it('the contract stays presentation policy, never authority', () => {
    expect(PRIME_PERSONALITY_V1.authority).toBe('presentation_policy');
    expect(PRIME_PERSONALITY_V1.facts.inventNumbers).toBe(false);
    expect(PRIME_PERSONALITY_V1.expression.cannedOpeners).toBe(false);
    expect(PRIME_PERSONALITY_V1.length.automaticClosingOffer).toBe(false);
  });
});
