function collapseBlankLines(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function sanitizePrimeResponse(text: string): string {
  const raw = String(text || '');
  if (!raw.trim()) return '';

  const lines = raw.split(/\r?\n/);
  const filtered: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      filtered.push(line);
      continue;
    }

    // Strip internal agent-tag scaffolding — these leak from worker chain
    // outputs and should never be shown to the user.
    if (/^(?:[-*]\s*)?(byte|tag|crystal|finley|memory):/i.test(trimmed)) {
      continue;
    }
    if (/^(?:[-*]\s*)?tag insights:/i.test(trimmed)) {
      continue;
    }
    // Drop snapshot lines entirely. Previously this injected the canned
    // "Your data has been processed." string — we now let Prime's actual
    // response stand and only strip the leaked tag.
    if (/^(?:[-*]\s*)?snapshot:/i.test(trimmed)) {
      continue;
    }

    filtered.push(line);
  }

  let sanitized = filtered.join('\n');
  // Term normalization only — replace internal jargon with user-facing terms.
  // We do NOT rewrite full sentences here. If Prime says something wrong,
  // the fix belongs in the system prompt or the routing layer, not here.
  sanitized = sanitized
    .replace(/\bprocessing staged\b/gi, 'ready')
    .replace(/\bpipeline snapshot\b/gi, 'latest data')
    .replace(/\bworker chain\b/gi, 'analysis flow')
    .replace(/\bdeterministic_brains\b/gi, 'analysis step')
    .replace(/\bI used your greeting to understand your intent to start a conversation\.?/gi, '')
    .replace(/\bWhat I used:\s*$/gim, '')
    .replace(/\bNext steps:\s*$/gim, '');

  // P-1: only the legacy rigid scaffold — a line starting "(a) Direct answer:" followed by a line
  // starting "(b)" — is reduced to the direct answer. Ordinary "(a)"/"(b)" options inside a sentence
  // or a list are never truncated.
  if (/^\s*\(\s*a\s*\)\s*Direct answer:/im.test(sanitized) && /^\s*\(\s*b\s*\)/im.test(sanitized)) {
    sanitized = sanitized
      .replace(/^(\s*)\(\s*a\s*\)\s*Direct answer:\s*/im, '$1')
      .replace(/\n\s*\(\s*b\s*\)[\s\S]*$/i, '');
  }

  return collapseBlankLines(sanitized);
}