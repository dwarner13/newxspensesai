/**
 * C2-D3 — pure helpers for the shared progressive reveal (TypingMessage).
 */

/**
 * Make a partially revealed message safe to render with the full formatter, so
 * bold/lists/links render while the reply is still arriving (no raw "**" flash and no
 * layout jump at the end). Drops a trailing unmatched "**" opener and an unfinished
 * markdown link; the rest is rendered as-is and completes on the next step.
 */
export function safePartialMarkdown(text: string): string {
  let out = text;
  const lastOpen = out.lastIndexOf('[');
  if (lastOpen !== -1 && !/\]\([^)]*\)/.test(out.slice(lastOpen))) out = out.slice(0, lastOpen);
  const boldMarks = out.match(/\*\*/g)?.length ?? 0;
  if (boldMarks % 2 === 1) {
    const i = out.lastIndexOf('**');
    out = out.slice(0, i) + out.slice(i + 2);
  }
  return out;
}

/**
 * Reveal to the end of the next word (bounded), instead of one character per render —
 * same overall pace, a fraction of the renders (smoother on mobile).
 */
export function nextRevealIndex(content: string, from: number, maxStep = 12): number {
  const total = content.length;
  if (from >= total) return total;
  const limit = Math.min(total, from + maxStep);
  let i = from + 1;
  while (i < limit && !/\s/.test(content[i])) i++;
  return Math.min(total, i);
}
