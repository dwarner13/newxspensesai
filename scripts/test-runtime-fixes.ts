/**
 * Runtime Fixes — Timing TDZ + Financial Position Import
 *
 * RT1-RT5: Timing instrumentation safety
 * FPI1-FPI4: Financial Position import path
 */
import { readFileSync } from 'fs';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

// ═══════════════════════════════════════════════════════════════════════════
// RT1-RT5: Timing instrumentation cannot crash request
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== RT: Timing instrumentation safety ===\n');
{
  // Read chat.ts source and check for duplicate requestStartTime declarations
  const chatSrc = readFileSync('netlify/functions/chat.ts', 'utf8');
  const declarations = chatSrc.match(/const requestStartTime\b/g) || [];
  assert('RT1. only one requestStartTime declaration', declarations.length === 1);

  // Verify no [ChatTiming] log references an uninitialized variable
  // The single declaration at ~line 5414 is before any [ChatTiming] usage
  const firstDecl = chatSrc.indexOf('const requestStartTime = Date.now()');
  const firstTiming = chatSrc.indexOf('[ChatTiming]');
  assert('RT2. requestStartTime declared before first [ChatTiming] log', firstDecl < firstTiming);

  // Verify FATAL catch uses safe fallback
  assert('RT3. FATAL catch uses (requestStartTime || Date.now())',
    chatSrc.includes('Date.now() - (requestStartTime || Date.now())'));

  // Verify memory_start timing uses requestStartTime (not a renamed/second variable)
  const memoryStartLine = chatSrc.match(/stage=memory_start.*requestStartTime/);
  assert('RT4. memory_start uses canonical requestStartTime', !!memoryStartLine);

  // Verify no requestStartTime2 exists in source
  assert('RT5. no requestStartTime2 in source', !chatSrc.includes('requestStartTime2'));
}

// ═══════════════════════════════════════════════════════════════════════════
// FPI1-FPI4: Financial Position import path
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== FPI: Financial Position import path ===\n');
{
  // FPI1: The import path in chat.ts must reference _shared/
  const chatSrc = readFileSync('netlify/functions/chat.ts', 'utf8');
  const importMatch = chatSrc.match(/await import\(['"](.*financial-position.*)['"]\)/);
  assert('FPI1. import path contains _shared', importMatch?.[1]?.includes('_shared') === true);
  assert('FPI2. import path is ./_shared/financial-position.js',
    importMatch?.[1] === './_shared/financial-position.js');

  // FPI3: The actual file exists at the expected location
  let fileExists = false;
  try {
    readFileSync('netlify/functions/_shared/financial-position.ts', 'utf8');
    fileExists = true;
  } catch { fileExists = false; }
  assert('FPI3. financial-position.ts exists in _shared/', fileExists);

  // FPI4: The module can actually be loaded
  try {
    const mod = await import('../netlify/functions/_shared/financial-position');
    assert('FPI4a. buildFinancialPosition is exported', typeof mod.buildFinancialPosition === 'function');
    assert('FPI4b. formatPositionForPrompt is exported', typeof mod.formatPositionForPrompt === 'function');
  } catch (e: any) {
    console.error('  FPI4 import failed:', e.message);
    assert('FPI4a. buildFinancialPosition is exported', false);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FPS1-FPS7: financialPositionText scope safety
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== FPS: financialPositionText scope ===\n');
{
  const chatSrc = readFileSync('netlify/functions/chat.ts', 'utf8');

  // FPS1: declared before any later reference AND before the bare block scope
  const declIdx = chatSrc.indexOf("let financialPositionText = ''");
  const primeContextIf = chatSrc.indexOf('if (isPrime && effectivePrimeContext)');
  assert('FPS1a. declared before Prime context block', declIdx < primeContextIf);
  // The critical structural check: declaration must be BEFORE the bare block `{`
  // that encloses the prompt assembly. Find the specific PHASE 1 FIX comment
  // about removing the isPrimeBoss gate (not the earlier one at line ~6446).
  const phase1Comment = chatSrc.indexOf('Removed the `if (!(isPrimeBoss))` gate');
  const bareBlockOpen = chatSrc.indexOf('{', phase1Comment);
  assert('FPS1b. declared before bare block scope', declIdx < bareBlockOpen);
  // And the debug reference is AFTER the bare block closes
  const debugRef2 = chatSrc.indexOf('financialPosition: financialPositionText.length > 0');
  assert('FPS1c. debug reference is after declaration (structural)', debugRef2 > declIdx);

  // FPS2: assignment occurs inside try block
  assert('FPS2. assigned inside FP try block', chatSrc.includes('financialPositionText = fmtFP(fpResult)'));

  // FPS3: default value is empty string (safe fallback)
  assert('FPS3. default is empty string', chatSrc.includes("let financialPositionText = ''"));

  // FPS4: prompt debug can reference without ReferenceError
  const debugRef = chatSrc.indexOf('financialPosition: financialPositionText.length > 0');
  assert('FPS4. debug reference exists after declaration', debugRef > declIdx);

  // FPS5: debug logging references are all after declaration
  const charRef = chatSrc.indexOf('financialPositionChars: financialPositionText.length');
  assert('FPS5. char-count reference after declaration', charRef > declIdx);

  // FPS6: only one declaration of each variable
  const textDecls = chatSrc.match(/let financialPositionText/g) || [];
  const missDecls = chatSrc.match(/let financialPositionMissing/g) || [];
  assert('FPS6a. one financialPositionText declaration', textDecls.length === 1);
  assert('FPS6b. one financialPositionMissing declaration', missDecls.length === 1);

  // FPS7: financialPositionMissing also declared before references
  const missDeclIdx = chatSrc.indexOf("let financialPositionMissing");
  const missRef = chatSrc.indexOf('financialPositionMissing: financialPositionMissing');
  assert('FPS7. financialPositionMissing declared before reference', missDeclIdx < missRef);
}

console.log(`\n${'='.repeat(60)}`);
console.log(`RUNTIME FIXES: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);
if (failed > 0) process.exit(1);
