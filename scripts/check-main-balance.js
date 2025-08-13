/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..', 'src');
const exts = new Set(['.tsx', '.jsx']);

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) walk(p, files);
    else if (exts.has(path.extname(name))) files.push(p);
  }
  return files;
}

function countMains(code) {
  // crude but effective; AST parsing not required for a quick guard
  const open = (code.match(/<\s*main(\s|>)/g) || []).length;
  const close = (code.match(/<\/\s*main\s*>/g) || []).length;
  return { open, close };
}

const files = walk(ROOT);
let bad = 0;

for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  const { open, close } = countMains(c);
  if (open !== close) {
    console.error(`[MAIN MISMATCH] ${f}: open=${open} close=${close}`);
    bad++;
  }
}

if (bad > 0) {
  console.error(`\nFound ${bad} file(s) with <main> balance issues.`);
  process.exit(1);
} else {
  console.log('All good: <main> tags balanced.');
}
