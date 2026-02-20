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
  let insertedDataProcessedLine = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      filtered.push(line);
      continue;
    }

    if (/^(?:[-*]\s*)?(byte|tag|crystal|finley|memory):/i.test(trimmed)) {
      continue;
    }
    if (/^(?:[-*]\s*)?tag insights:/i.test(trimmed)) {
      continue;
    }
    if (/^(?:[-*]\s*)?snapshot:/i.test(trimmed)) {
      if (!insertedDataProcessedLine) {
        filtered.push('Your data has been processed.');
        insertedDataProcessedLine = true;
      }
      continue;
    }

    filtered.push(line);
  }

  let sanitized = filtered.join('\n');
  sanitized = sanitized
    .replace(/\bprocessing staged\b/gi, 'ready')
    .replace(/\bpipeline snapshot\b/gi, 'latest data')
    .replace(/\bworker chain\b/gi, 'analysis flow')
    .replace(/\bdeterministic_brains\b/gi, 'analysis step')
    .replace(
      /Prime summary:\s*upload\/import processing is staged and ready for the next actionable step\.?/gi,
      "You can upload bank statements, credit card statements, invoices, and insurance statements directly in chat using the + button. I'll process them automatically and organize your spending for you."
    )
    .replace(
      /\bI reviewed your statement context and prepared analysis and planning notes\.?/gi,
      'I reviewed your information and prepared a clear summary with next steps.'
    )
    // Remove meta-commentary patterns that can leak from prompt templates.
    .replace(/\bI used your greeting to understand your intent to start a conversation\.?/gi, '')
    .replace(/\bWhat I used:\s*$/gim, '')
    .replace(/\bNext steps:\s*$/gim, '');

  // If model returns rigid "(a)/(b)/(c)" format, keep only the direct answer.
  if (/\(\s*a\s*\)/i.test(sanitized) && /\(\s*b\s*\)/i.test(sanitized)) {
    sanitized = sanitized
      .replace(/\(\s*a\s*\)\s*/i, '')
      .replace(/\bDirect answer:\s*/i, '')
      .replace(/\n*\(\s*b\s*\)[\s\S]*$/i, '');
  }

  return collapseBlankLines(sanitized);
}
