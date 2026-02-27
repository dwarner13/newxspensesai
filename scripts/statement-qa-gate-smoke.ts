import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';

function loadLocalEnvFiles(): void {
  const files = ['.env.local', '.envlocal', '.env'];
  for (const file of files) {
    const absPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(absPath)) continue;
    const text = fs.readFileSync(absPath, 'utf8');
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      const key = match[1];
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

loadLocalEnvFiles();

type JsonMap = Record<string, any>;

const BASE_URL = process.env.BASE_URL || 'http://localhost:8888';
const SUPABASE_JWT = process.env.SUPABASE_JWT || '';
const EMPLOYEE_SLUG = 'prime-boss';

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

async function postChat(message: string): Promise<JsonMap> {
  const res = await fetch(`${BASE_URL}/.netlify/functions/chat`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${SUPABASE_JWT}`,
    },
    body: JSON.stringify({
      employeeSlug: EMPLOYEE_SLUG,
      message,
      stream: false,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) fail(`chat ${res.status} for "${message}": ${JSON.stringify(json)}`);
  return json;
}

function readAssistantText(json: JsonMap): string {
  return String(
    json?.content ||
    json?.assistantText ||
    json?.assistant_text ||
    json?.message ||
    json?.response ||
    ''
  );
}

async function main(): Promise<void> {
  if (!SUPABASE_JWT) fail('Missing SUPABASE_JWT');

  const prompts = [
    'How much did I spend on restaurants last month?',
    'Show my top 5 largest charges on the RBC statement.',
    'How much income did I have in January?',
  ];

  for (const prompt of prompts) {
    const json = await postChat(prompt);
    const text = readAssistantText(json);
    const deterministicPath = String(json?.meta?.deterministic || json?.deterministicPath || '');
    console.log('---');
    console.log(`Prompt: ${prompt}`);
    console.log(`Deterministic: ${deterministicPath || 'unknown'}`);
    console.log(text.slice(0, 700));
    if (!text.trim()) fail(`Empty assistant response for "${prompt}"`);
  }

  console.log('PASS statement-qa-gate-smoke');
}

main().catch((err: any) => fail(err?.message || String(err)));
