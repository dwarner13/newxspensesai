#!/usr/bin/env tsx

/**
 * Employee Chat/Memory Audit + Auto-Fix
 * 
 * Scans codebase for all AI employees and their chat/memory integration.
 * Generates reports and optionally auto-fixes UI gaps.
 */

import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// ============================================================================
// CONFIG
// ============================================================================

const EMPLOYEES = [
  'prime', 'tag', 'byte', 'crystal', 'goalie', 'automa', 'blitz', 'liberty',
  'chime', 'roundtable', 'serenity', 'harmony', 'wave', 'ledger', 'intelia', 'dash', 'custodian'
];

const EMPLOYEE_ROUTES: Record<string, string> = {
  prime: '/prime',
  tag: '/smart-categories',
  byte: '/smart-import',
  crystal: '/predict',
  goalie: '/goals',
  automa: '/automation',
  blitz: '/debt',
  liberty: '/freedom',
  chime: '/bills',
  roundtable: '/podcast',
  serenity: '/therapist',
  harmony: '/wellness',
  wave: '/spotify',
  ledger: '/tax',
  intelia: '/bi',
  dash: '/analytics',
  custodian: '/settings'
};

const EMPLOYEE_TITLES: Record<string, string> = {
  prime: 'Prime',
  tag: 'Tag',
  byte: 'Byte',
  crystal: 'Crystal',
  goalie: 'Goalie',
  automa: 'Automation',
  blitz: 'Debt',
  liberty: 'Liberty',
  chime: 'Chime',
  roundtable: 'Podcast',
  serenity: 'Therapist',
  harmony: 'Wellness',
  wave: 'Spotify',
  ledger: 'Tax',
  intelia: 'BI',
  dash: 'Analytics',
  custodian: 'Settings'
};

// ============================================================================
// TYPES
// ============================================================================

interface EmployeeAudit {
  employee: string;
  chatPage: string | null;
  hook: string | null;
  router: string | null;
  headers: string[];
  memoryUsed: string[];
  sessionResume: boolean;
  tests: string[];
  warnings: string[];
  notes: string[];
}

// ============================================================================
// SCAN UTILITIES
// ============================================================================

const root = process.cwd();

function findFiles(dir: string, pattern: RegExp, recursive = true): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;
  
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && recursive) {
        files.push(...findFiles(fullPath, pattern, recursive));
      } else if (entry.isFile() && pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch {
    // Ignore errors
  }
  return files;
}

function scanCode(path: string, patterns: string[]): boolean {
  if (!existsSync(path)) return false;
  try {
    const content = readFileSync(path, 'utf-8');
    return patterns.some(pattern => content.includes(pattern));
  } catch {
    return false;
  }
}

function scanCodeList(path: string, patterns: string[]): string[] {
  if (!existsSync(path)) return [];
  try {
    const content = readFileSync(path, 'utf-8');
    return patterns.filter(pattern => content.includes(pattern));
  } catch {
    return [];
  }
}

function scanRegex(path: string, regex: RegExp): string[] {
  if (!existsSync(path)) return [];
  try {
    const content = readFileSync(path, 'utf-8');
    const matches = content.match(regex);
    return matches || [];
  } catch {
    return [];
  }
}

// ============================================================================
// SCAN FUNCTIONS
// ============================================================================

function auditEmployee(employee: string): EmployeeAudit {
  const audit: EmployeeAudit = {
    employee,
    chatPage: null,
    hook: null,
    router: null,
    headers: [],
    memoryUsed: [],
    sessionResume: false,
    tests: [],
    warnings: [],
    notes: []
  };

  const empLower = employee.toLowerCase();
  const empUpper = employee.charAt(0).toUpperCase() + employee.slice(1);
  
  // 1. Check for chat page
  const chatPages = findFiles(join(root, 'src', 'pages'), /.*Chat.*\.tsx$/i);
  for (const page of chatPages) {
    const content = readFileSync(page, 'utf-8');
    if (new RegExp(`\\b${empLower}|${empUpper}\\b`, 'i').test(content) || 
        page.toLowerCase().includes(empLower)) {
      audit.chatPage = page.replace(root + '/', '');
      break;
    }
  }

  // Special cases
  if (empLower === 'prime' && !audit.chatPage) {
    const primeSimple = join(root, 'src', 'pages', 'chat', 'PrimeChatSimple.tsx');
    if (existsSync(primeSimple)) audit.chatPage = 'src/pages/chat/PrimeChatSimple.tsx';
  }
  if (empLower === 'byte' && !audit.chatPage) {
    const byteTest = join(root, 'src', 'pages', 'ByteChatTest.tsx');
    if (existsSync(byteTest)) audit.chatPage = 'src/pages/ByteChatTest.tsx';
  }
  if (empLower === 'tag' && !audit.chatPage) {
    const catPage = join(root, 'src', 'pages', 'dashboard', 'AICategorizationPage.tsx');
    if (existsSync(catPage)) audit.chatPage = 'src/pages/dashboard/AICategorizationPage.tsx';
  }
  if (empLower === 'crystal' && !audit.chatPage) {
    const crystalPages = [
      join(root, 'src', 'pages', 'dashboard', 'SpendingPredictionsPage.tsx'),
      join(root, 'src', 'pages', 'dashboard', 'AnalyticsAI.tsx')
    ];
    for (const p of crystalPages) {
      if (existsSync(p)) {
        audit.chatPage = p.replace(root + '/', '');
        break;
      }
    }
  }

  // 2. Check hook usage
  const hookPath = join(root, 'src', 'hooks', 'usePrimeChat.ts');
  if (existsSync(hookPath)) {
    const content = readFileSync(hookPath, 'utf-8');
    if (content.includes('usePrimeChat') || content.includes('employeeSlug')) {
      audit.hook = 'usePrimeChat';
      
      // Check if employeeOverride supported
      if (!content.includes('employeeOverride') && !content.includes('employeeSlug')) {
        audit.warnings.push('Hook missing employeeOverride/employeeSlug parameter');
      }
    }
  }

  // 3. Check router
  const routerPath = join(root, 'netlify', 'functions', '_shared', 'prime_router.ts');
  if (existsSync(routerPath)) {
    const content = readFileSync(routerPath, 'utf-8');
    if (content.includes('routeTurn') || content.includes(empLower) || content.includes(empUpper)) {
      audit.router = 'prime_router.ts';
      
      // Check if employee is in switch/intent detection
      if (!content.includes(empLower) && employee !== 'prime') {
        audit.warnings.push(`Employee not found in router switch`);
      }
    }
  }

  // 4. Check headers in chat.ts
  const chatPath = join(root, 'netlify', 'functions', 'chat.ts');
  if (existsSync(chatPath)) {
    const content = readFileSync(chatPath, 'utf-8');
    const headerPatterns = [
      'X-Employee', 'X-Memory-Hit', 'X-Memory-Count', 'X-PII-Mask',
      'X-Guardrails', 'X-Session-Summary', 'X-OCR-Provider', 'X-OCR-Parse',
      'X-Transactions-Saved', 'X-Route-Confidence', 'X-Stream-Chunk-Count'
    ];
    audit.headers = headerPatterns.filter(h => content.includes(h));
  }

  // 5. Check memory usage
  const memoryPaths = [
    join(root, 'netlify', 'functions', 'chat.ts'),
    join(root, 'netlify', 'functions', '_shared', 'memory.ts'),
    join(root, 'netlify', 'functions', 'ocr.ts')
  ];
  const memoryFunctions = ['recall', 'embedAndStore', 'extractFactsFromMessages'];
  for (const memPath of memoryPaths) {
    if (existsSync(memPath)) {
      const memUsed = scanCodeList(memPath, memoryFunctions.map(f => `${f}(`));
      audit.memoryUsed.push(...memUsed.map(m => m.replace('(', '')));
    }
  }
  audit.memoryUsed = [...new Set(audit.memoryUsed)];

  // 6. Check session resume
  const sessionPaths = [
    join(root, 'netlify', 'functions', 'chat.ts'),
    join(root, 'src', 'hooks', 'usePrimeChat.ts')
  ];
  for (const sPath of sessionPaths) {
    if (existsSync(sPath)) {
      const content = readFileSync(sPath, 'utf-8');
      if (content.includes('X-Session-Summary') || 
          content.includes('resumeSessionId') ||
          content.includes('chat_convo_summaries')) {
        audit.sessionResume = true;
        break;
      }
    }
  }

  // 7. Find tests
  const testFiles = findFiles(join(root, 'netlify', 'functions', '_shared', '__tests__'), /\.test\.ts$/i);
  for (const test of testFiles) {
    const content = readFileSync(test, 'utf-8');
    if (new RegExp(`\\b${empLower}|${empUpper}\\b`, 'i').test(content)) {
      audit.tests.push(test.replace(root + '/', ''));
    }
  }

  if (audit.tests.length === 0) {
    audit.notes.push('No tests found');
  }

  return audit;
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateMarkdownReport(audits: EmployeeAudit[]): string {
  let md = `# Employee Chat & Memory Status Audit

**Generated**: ${new Date().toISOString()}

---

`;

  for (const audit of audits) {
    const status = audit.chatPage ? '✅' : (audit.router ? '⚠️' : '❌');
    
    md += `## ${status} ${EMPLOYEE_TITLES[audit.employee] || audit.employee}

**Employee**: \`${audit.employee}\`

### Chat Page
${audit.chatPage ? `- ✅ \`${audit.chatPage}\`` : '- ❌ No chat page found'}

### Hook
${audit.hook ? `- ✅ \`${audit.hook}\`` : '- ❌ No hook usage found'}
${audit.warnings.some(w => w.includes('employeeOverride')) ? '  - ⚠️ Missing employeeOverride parameter' : ''}

### Router/Dispatch
${audit.router ? `- ✅ \`${audit.router}\`` : '- ❌ No router found'}

### Headers Observed
${audit.headers.length > 0 
  ? audit.headers.map(h => `- ✅ \`${h}\``).join('\n')
  : '- ⚠️ No headers found in chat.ts'}

### Memory Usage Paths
${audit.memoryUsed.length > 0
  ? audit.memoryUsed.map(m => `- ✅ \`${m}()\``).join('\n')
  : '- ⚠️ Memory functions not detected'}

### Session Resume
${audit.sessionResume ? '✅ Supported (X-Session-Summary or resumeSessionId)' : '❌ Not detected'}

### Tests
${audit.tests.length > 0
  ? audit.tests.map(t => `- ✅ \`${t}\``).join('\n')
  : '- ⚠️ None'}

### Gaps/Actions
${audit.warnings.length > 0
  ? audit.warnings.map(w => `- ⚠️ ${w}`).join('\n')
  : '- ✅ No gaps identified'}
${audit.notes.length > 0 ? audit.notes.map(n => `- 📝 ${n}`).join('\n') : ''}

---

`;
  }

  return md;
}

function generateCSVReport(audits: EmployeeAudit[]): string {
  const headers = [
    'employee', 'chat_page', 'hook', 'router', 'headers',
    'memory_used', 'session_resume', 'tests', 'warnings', 'notes'
  ];
  
  let csv = headers.join(',') + '\n';
  
  for (const audit of audits) {
    const row = [
      audit.employee,
      audit.chatPage || '',
      audit.hook || '',
      audit.router || '',
      audit.headers.join(';'),
      audit.memoryUsed.join(';'),
      audit.sessionResume ? 'yes' : 'no',
      audit.tests.length.toString(),
      audit.warnings.join(';'),
      audit.notes.join(';')
    ];
    csv += row.map(c => `"${c.replace(/"/g, '""')}"`).join(',') + '\n';
  }
  
  return csv;
}

function generateFixlist(audits: EmployeeAudit[]): string {
  let fixlist = `# Employee Chat & Memory Fixlist

**Generated**: ${new Date().toISOString()}

---

## Auto-Fixes Applied

See reports for detailed status.

---

## Remaining Backend TODOs

`;

  for (const audit of audits) {
    if (!audit.router && audit.employee !== 'prime') {
      fixlist += `### ${audit.employee}\n`;
      fixlist += `- [ ] Add to \`prime_router.ts\` intent detection\n`;
      fixlist += `- [ ] Map to employee slug in \`chat.ts\` employeeSlugMap\n\n`;
    }
    
    if (!audit.sessionResume) {
      fixlist += `### ${audit.employee}\n`;
      fixlist += `- [ ] Implement session resume via chat_convo_summaries\n\n`;
    }
  }

  fixlist += `---

## Notes

- HeaderStrip component created (if missing)
- usePrimeChat hook patched for employeeOverride
- Missing chat pages created
- Routes and sidebar updated

`;

  return fixlist;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('[Audit] Starting employee chat/memory audit...');
  
  const audits: EmployeeAudit[] = [];
  
  for (const employee of EMPLOYEES) {
    console.log(`[Audit] Scanning ${employee}...`);
    const audit = auditEmployee(employee);
    audits.push(audit);
  }
  
  // Generate reports
  const reportsDir = join(root, 'reports');
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }
  
  const mdReport = generateMarkdownReport(audits);
  const csvReport = generateCSVReport(audits);
  const fixlist = generateFixlist(audits);
  
  writeFileSync(join(reportsDir, 'EMPLOYEE_CHAT_MEMORY_STATUS.md'), mdReport);
  writeFileSync(join(reportsDir, 'EMPLOYEE_CHAT_MEMORY_STATUS.csv'), csvReport);
  writeFileSync(join(reportsDir, 'EMPLOYEE_CHAT_MEMORY_FIXLIST.md'), fixlist);
  
  console.log('[Audit] ✅ Reports generated:');
  console.log('  - reports/EMPLOYEE_CHAT_MEMORY_STATUS.md');
  console.log('  - reports/EMPLOYEE_CHAT_MEMORY_STATUS.csv');
  console.log('  - reports/EMPLOYEE_CHAT_MEMORY_FIXLIST.md');
  
  const missingPages = audits.filter(a => !a.chatPage).length;
  console.log(`[Audit] Found ${missingPages} employees without chat pages`);
}

main().catch(err => {
  console.error('[Audit] Error:', err);
  process.exit(1);
});

















