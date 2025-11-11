/**
 * 🧠 Memory Capabilities Endpoint
 * 
 * GET /api/memory_capabilities
 * 
 * Reports what's built for MEMORY + PROMPTS + "BRAIN" system.
 * Performs static code checks and optional live DB checks.
 */

import type { Handler } from '@netlify/functions';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// ============================================================================
// TYPES
// ============================================================================

interface MemoryCapabilities {
  ok: boolean;
  meta: {
    branch: string;
    commit: string;
    time: string;
  };
  memory: {
    codeSignals: {
      recallInChat: boolean;
      extractInChat: boolean;
      embedStoreUsed: boolean;
      headersPresent: boolean;
    };
    tables: {
      user_memory_facts: boolean;
      memory_embeddings: boolean;
      chat_threads: boolean;
      chat_messages: boolean;
      chat_convo_summaries: boolean;
    };
    rpc: {
      match_memory: boolean;
    };
  };
  prompts: {
    files: string[];
    primeMaster: boolean;
    rolePrompts: {
      prime: boolean;
      tag: boolean;
      crystal: boolean;
      byte: boolean;
    };
    usedInChat: boolean;
  };
  brain: {
    router: boolean;
    tools: string[];
    sseMask: boolean;
    streamingHeaders: boolean;
  };
  endpoints: {
    chat: boolean;
    ocr: boolean;
    bank_ingest: boolean;
  };
  tests: {
    total: number;
    names: string[];
  };
  sqlIdempotentCount: number;
  warnings: string[];
}

// ============================================================================
// SCAN FUNCTIONS
// ============================================================================

function getGitBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

function getGitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
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

function scanRegex(path: string, regex: RegExp): boolean {
  if (!existsSync(path)) return false;
  try {
    const content = readFileSync(path, 'utf-8');
    return regex.test(content);
  } catch {
    return false;
  }
}

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

function countIdempotentSQL(): number {
  let count = 0;
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  if (!existsSync(migrationsDir)) return 0;
  
  try {
    const files = readdirSync(migrationsDir);
    for (const file of files) {
      if (file.endsWith('.sql')) {
        const path = join(migrationsDir, file);
        try {
          const content = readFileSync(path, 'utf-8');
          const matches = content.match(/IF NOT EXISTS|ON CONFLICT DO NOTHING/gi);
          if (matches) count += matches.length;
        } catch {
          // Ignore
        }
      }
    }
  } catch {
    // Ignore
  }
  return count;
}

async function checkTable(table: string): Promise<boolean> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) return false;
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from(table).select('*').limit(1).maybeSingle();
    // Error might mean table doesn't exist OR it's empty (which is fine)
    // We check if it's a "relation does not exist" error specifically
    return error?.code !== 'PGRST116' && error?.message?.includes('does not exist') === false;
  } catch {
    return false;
  }
}

// ============================================================================
// MAIN SCAN
// ============================================================================

async function scanCapabilities(): Promise<MemoryCapabilities> {
  const warnings: string[] = [];
  const root = process.cwd();
  
  // ========================================================================
  // MEMORY CODE SIGNALS
  // ========================================================================
  const chatPath = join(root, 'netlify', 'functions', 'chat.ts');
  const recallInChat = scanCode(chatPath, ['recall(', 'memory.recall']);
  const extractInChat = scanCode(chatPath, ['extractFactsFromMessages(', 'memory.extractFactsFromMessages']);
  const embedStoreUsed = scanCode(chatPath, ['embedAndStore(', 'memory.embedAndStore']);
  const headersPresent = scanCode(chatPath, ['X-Memory-Hit', 'X-Memory-Count']) ||
                         scanRegex(chatPath, /X-Memory-(Hit|Count)/);
  const contextMemory = scanCode(chatPath, ['Context-Memory', 'context-memory']);
  
  // ========================================================================
  // MEMORY TABLES (DB Check)
  // ========================================================================
  const userMemoryFacts = await checkTable('user_memory_facts');
  const memoryEmbeddings = await checkTable('memory_embeddings');
  const chatThreads = await checkTable('chat_threads');
  const chatMessages = await checkTable('chat_messages');
  const chatConvoSummaries = await checkTable('chat_convo_summaries');
  
  if (!process.env.SUPABASE_URL) {
    warnings.push('SUPABASE_URL not set - table checks skipped');
  }
  
  // ========================================================================
  // RPC FUNCTION
  // ========================================================================
  const memoryModulePath = join(root, 'netlify', 'functions', '_shared', 'memory.ts');
  const matchMemoryRpc = scanCode(memoryModulePath, ['match_memory_embeddings', 'match_memory']);
  
  // ========================================================================
  // PROMPTS
  // ========================================================================
  const promptFiles: string[] = [];
  const docsDir = join(root, 'docs');
  if (existsSync(docsDir)) {
    promptFiles.push(...findFiles(docsDir, /.*PROMPT.*\.md$/i));
    promptFiles.push(...findFiles(docsDir, /.*PERSONA.*\.md$/i));
  }
  
  const primeMaster = scanCode(join(root, 'docs', 'PRIME_PROMPT.md'), ['Prime', 'PRIME']) ||
                      promptFiles.some(f => f.toLowerCase().includes('prime'));
  
  const primePrompt = scanCode(chatPath, ['prime', 'PRIME', 'Prime']) || primeMaster;
  const tagPrompt = scanCode(chatPath, ['tag', 'TAG', 'Tag']) || promptFiles.some(f => f.toLowerCase().includes('tag'));
  const crystalPrompt = scanCode(chatPath, ['crystal', 'CRYSTAL', 'Crystal']) || promptFiles.some(f => f.toLowerCase().includes('crystal'));
  const bytePrompt = scanCode(chatPath, ['byte', 'BYTE', 'Byte']) || promptFiles.some(f => f.toLowerCase().includes('byte'));
  
  const usedInChat = scanCode(chatPath, ['systemPrompt', 'system_prompt', 'buildEmployeeSystemPrompt']);
  
  // ========================================================================
  // BRAIN (Router/Tools/Streaming)
  // ========================================================================
  const routerPath = join(root, 'netlify', 'functions', '_shared', 'prime_router.ts');
  const router = existsSync(routerPath);
  
  const tools: string[] = [];
  const toolsDir = join(root, 'netlify', 'functions', 'tools');
  if (existsSync(toolsDir)) {
    tools.push(...findFiles(toolsDir, /\.ts$/, true).map(f => f.replace(root + '/', '')));
  }
  
  const sseMaskPath = join(root, 'netlify', 'functions', '_shared', 'sse_mask_transform.ts');
  const sseMask = existsSync(sseMaskPath);
  
  const streamingHeaders = scanCode(chatPath, ['X-Stream-Chunk-Count', 'streamChunkCount']);
  
  // ========================================================================
  // ENDPOINTS
  // ========================================================================
  const chat = existsSync(chatPath);
  const ocr = existsSync(join(root, 'netlify', 'functions', 'ocr.ts'));
  const bankIngest = existsSync(join(root, 'netlify', 'functions', 'bank_ingest.ts'));
  
  // ========================================================================
  // TESTS
  // ========================================================================
  const testFiles: string[] = [];
  const testDirs = [
    join(root, 'netlify', 'functions', '_shared', '__tests__'),
    join(root, '__tests__'),
    join(root, 'src'),
  ];
  
  for (const testDir of testDirs) {
    if (existsSync(testDir)) {
      testFiles.push(...findFiles(testDir, /\.test\.tsx?$/i));
    }
  }
  
  // ========================================================================
  // SQL IDEMPOTENCY
  // ========================================================================
  const sqlIdempotentCount = countIdempotentSQL();
  
  return {
    ok: true,
    meta: {
      branch: getGitBranch(),
      commit: getGitCommit(),
      time: new Date().toISOString()
    },
    memory: {
      codeSignals: {
        recallInChat: recallInChat || contextMemory,
        extractInChat,
        embedStoreUsed,
        headersPresent
      },
      tables: {
        user_memory_facts: userMemoryFacts,
        memory_embeddings: memoryEmbeddings,
        chat_threads: chatThreads,
        chat_messages: chatMessages,
        chat_convo_summaries: chatConvoSummaries
      },
      rpc: {
        match_memory: matchMemoryRpc
      }
    },
    prompts: {
      files: promptFiles.map(f => f.replace(root + '/', '')),
      primeMaster,
      rolePrompts: {
        prime: primePrompt,
        tag: tagPrompt,
        crystal: crystalPrompt,
        byte: bytePrompt
      },
      usedInChat
    },
    brain: {
      router,
      tools,
      sseMask,
      streamingHeaders
    },
    endpoints: {
      chat,
      ocr,
      bank_ingest
    },
    tests: {
      total: testFiles.length,
      names: testFiles.map(f => f.replace(root + '/', '')).slice(0, 20) // Limit to 20
    },
    sqlIdempotentCount,
    warnings
  };
}

// ============================================================================
// HANDLER
// ============================================================================

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Method not allowed' })
    };
  }
  
  try {
    const capabilities = await scanCapabilities();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(capabilities)
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        error: error.message,
        warnings: [error.message]
      })
    };
  }
};







