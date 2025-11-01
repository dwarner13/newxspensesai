/**
 * Sync a local Markdown file into employee_profiles.system_prompt
 * 
 * This script enables zero-downtime persona updates by reading a local Markdown file
 * and syncing it directly into the Supabase employee_profiles table.
 * 
 * Usage:
 *   ts-node scripts/sync-employee-prompt.ts <slug> <filePath>
 *   ts-node scripts/sync-employee-prompt.ts crystal-analytics ./docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
 *   ts-node scripts/sync-employee-prompt.ts prime-boss ./docs/PRIME_CEO_PERSONA.md
 *
 * Prerequisites:
 *   - SUPABASE_URL environment variable
 *   - SUPABASE_SERVICE_ROLE_KEY environment variable
 *   - File must exist at the provided path
 *
 * Exit codes:
 *   0 - Success
 *   1 - Error (missing args, env, file, or DB error)
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// ========================================================================
// PARSE COMMAND LINE ARGUMENTS
// ========================================================================

const slug = process.argv[2];
const filePath = process.argv[3];

if (!slug || !filePath) {
  console.error('❌ Missing required arguments');
  console.error('Usage: ts-node scripts/sync-employee-prompt.ts <slug> <filePath>');
  console.error('');
  console.error('Examples:');
  console.error('  ts-node scripts/sync-employee-prompt.ts crystal-analytics ./docs/CRYSTAL_2.0_SYSTEM_PROMPT.md');
  console.error('  ts-node scripts/sync-employee-prompt.ts prime-boss ./docs/PRIME_CEO_PERSONA.md');
  process.exit(1);
}

// ========================================================================
// VALIDATE ENVIRONMENT
// ========================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  if (!SUPABASE_URL) console.error('  - SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Set them in your .env file or export them:');
  console.error('  export SUPABASE_URL="https://your-project.supabase.co"');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  process.exit(1);
}

// ========================================================================
// MAIN SYNC LOGIC
// ========================================================================

(async () => {
  try {
    // Resolve file path
    const abs = path.resolve(filePath);
    
    // Check file exists
    if (!fs.existsSync(abs)) {
      console.error(`❌ File not found: ${abs}`);
      process.exit(1);
    }

    // Read file content
    console.log(`📖 Reading file: ${abs}`);
    const content = fs.readFileSync(abs, 'utf8');
    const lineCount = content.split('\n').length;
    const charCount = content.length;
    console.log(`   Lines: ${lineCount}, Characters: ${charCount}`);

    // Initialize Supabase client with service role key (admin privileges)
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    // Determine title based on slug
    let title = slug;
    if (slug === 'crystal-analytics') {
      title = 'Crystal — Financial Intelligence (AI CFO)';
    } else if (slug === 'prime-boss') {
      title = 'Prime — AI Financial CEO & Orchestrator';
    } else if (slug === 'byte-docs') {
      title = 'Byte — Document Processing & OCR';
    } else if (slug === 'tag-categorizer') {
      title = 'Tag — Transaction Categorization';
    } else if (slug === 'ledger-tax') {
      title = 'Ledger — Tax & Compliance';
    } else if (slug === 'goalie-agent') {
      title = 'Goalie — Goals & Reminders';
    }

    console.log(`💾 Syncing to employee: ${slug}`);
    console.log(`   Title: ${title}`);

    // Call upsert_employee_prompt RPC function
    const { error } = await sb.rpc('upsert_employee_prompt', {
      p_slug: slug,
      p_title: title,
      p_prompt: content,
      p_capabilities: [
        'spending-intelligence',
        'income-intelligence',
        'trend-analysis',
        'cashflow',
        'budgeting',
        'forecasting',
        'profitability',
        'roi',
        'benchmarking',
        'goal-alignment',
        'decision-support',
        'proactive-insights',
        'industry-aware'
      ],
      p_tools: ['delegate'],
      p_active: true
    });

    if (error) {
      console.error(`❌ Database error: ${error.message}`);
      process.exit(1);
    }

    console.log(`✅ Successfully synced employee "${slug}"`);
    console.log(`   Source: ${abs}`);
    console.log(`   Prompt size: ${charCount} characters`);
    console.log('');
    console.log('🚀 Changes will be picked up by production code immediately');
    console.log('   (no code deployment required)');

  } catch (err: any) {
    console.error(`❌ Unexpected error: ${err.message}`);
    process.exit(1);
  }
})();






