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
    expect(PRIME_PERSONALITY_V1.specialists.promiseActionOnlyWithRealHandoff).toBe(true);
  });
});

describe('C2-D2 — no real figures, labelled estimates, honest specialist wording', () => {
  const groundingContract = chat.slice(chat.indexOf('PRIME FINANCIAL GROUNDING CONTRACT:'), chat.indexOf('6. NEVER FABRICATE'));

  it('D2-A: the personality message contains no dollar figures at all (placeholders only)', () => {
    expect(msg).not.toMatch(/\$\d/);
    expect(msg).toContain('**[$X]**');
    expect(personaSrc).not.toContain('15,057');
  });

  it('D2-A: the live Prime grounding contract no longer embeds a real total', () => {
    expect(chat).not.toContain('You spent $6,472.65 on fuel');
    expect(groundingContract).toContain('"You spent [$X] on fuel"');
    expect(groundingContract).not.toMatch(/\$\d/);
  });

  it('D2-C: estimates and hypotheticals must be labelled with their assumption', () => {
    expect(msg).toMatch(/Anything you work out yourself .* is an estimate: say so and give the assumption/);
    expect(msg).toContain('Label hypotheticals as hypothetical.');
  });

  it('D2-D: a specialist action is promised only with a real handoff in the same reply', () => {
    expect(msg).toContain('Only say a specialist will act');
    expect(msg).toContain('when you are actually calling request_employee_handoff in this same reply');
    expect(groundingContract).not.toContain("I'll have Tag handle that category change");
    expect(groundingContract).toContain('Only say a specialist will act when you call request_employee_handoff in this reply');
    const brain = buildEmployeeBrainSystemPrompt({ employee_key: 'prime', preferredName: 'Sam', currency: 'CAD' });
    expect(brain).not.toContain("I'll have Tag handle that category change");
    expect(brain).toContain('Do not promise a specialist action you are not initiating in this reply.');
  });

  it('D2-D: offers real navigation instead of an unbacked promise', () => {
    expect(msg).toContain('"Upload Statement" in the left sidebar on desktop, or the upload button in the bottom bar on mobile');
    expect(msg).toContain('the Tag button on the Transactions page');
    const sidebar = fs.readFileSync(path.join(root, 'src/components/navigation/DesktopSidebar.tsx'), 'utf8');
    const bottom = fs.readFileSync(path.join(root, 'src/components/layout/MobileBottomNav.tsx'), 'utf8');
    const tx = fs.readFileSync(path.join(root, 'src/pages/dashboard/TransactionsPageV2.tsx'), 'utf8');
    expect(sidebar).toContain('Upload Statement');
    expect(bottom).toContain('title: "Upload Statement"');
    expect(tx).toContain('label="Open Tag Copilot"');
  });
});
