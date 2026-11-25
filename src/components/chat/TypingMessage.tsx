/**
 * TypingMessage Component
 * 
 * Progressively reveals assistant message text (ChatGPT-like typing effect).
 * Only applies to assistant messages that haven't been typed yet.
 * Respects prefers-reduced-motion and handles streaming messages.
 */

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { safePartialMarkdown, nextRevealIndex } from './typingReveal';
import { parseMessageBlocks, isNumericCell } from '@/lib/messageBlocks';

interface TypingMessageProps {
  /** Full message content */
  content: string;
  /** Message ID (for tracking typed state) */
  messageId: string;
  /** Whether message is currently streaming */
  isStreaming?: boolean;
  /** Whether this message has already been typed (persisted state) */
  isTyped: boolean;
  /** Callback when typing completes */
  onTyped: (messageId: string) => void;
  /** Character delay in ms (default: 8-14ms with randomness) */
  charDelay?: number;
  /** Maximum animation duration in ms (default: 3000ms) */
  maxDuration?: number;
  /** Optional custom renderer for the displayed text. Defaults to FormattedMessageText. */
  renderer?: (text: string) => ReactNode;
}

export function renderInlineStrong(text: string): Array<string | JSX.Element> {
  const chunks: Array<string | JSX.Element> = [];
    // Matches explicit bold (**text**), currency ($1,234.56), percentages (45%), and common dates
  const pattern = /\*\*(.+?)\*\*|((?:C\$|CA\$|US\$|\$|€|£)\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)|(\b\d+(?:\.\d+)?%)|(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?,? \d{4}\b|\b\d{4}-\d{2}-\d{2}\b)|(7-eleven)/gi;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIdx) {
      chunks.push(text.slice(lastIdx, match.index));
    }
    const content = match[1] || match[2] || match[3] || match[4] || match[5];
    chunks.push(
      <strong
        key={`strong-${key++}`}
        className="font-extrabold tracking-tight text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.14)]"
      >
        {content}
      </strong>
    );
    lastIdx = pattern.lastIndex;
  }
  if (lastIdx < text.length) {
    chunks.push(text.slice(lastIdx));
  }
  return chunks;
}

function buildTransactionsFocusLink(label: string): string {
  const cleaned = String(label || '').replace(/\s+/g, ' ').trim();
  return `/dashboard/transactions?focus=${encodeURIComponent(cleaned)}`;
}

type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'link'; label: string; href: string; entity?: string; amount?: string; tone?: string };

function tokenizeInlineLinks(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let cursor = 0;

  // 1) Explicit markdown links.
  const markdownLinkPattern = /\[([^\]]+)\]\((\/dashboard\/transactions[^)\s]*)\)/gi;
  let mdMatch: RegExpExecArray | null;
  while ((mdMatch = markdownLinkPattern.exec(text)) !== null) {
    if (mdMatch.index > cursor) {
      tokens.push({ type: 'text', value: text.slice(cursor, mdMatch.index) });
    }
    const href = mdMatch[2];
    const toneMatch = href.match(/[?&]tone=([^&]+)/);
    const tone = toneMatch ? toneMatch[1] : undefined;
    
    tokens.push({ type: 'link', label: mdMatch[1], href, tone });
    cursor = markdownLinkPattern.lastIndex;
  }
  const afterMarkdown = cursor < text.length ? text.slice(cursor) : '';

  // 2) Auto-link "Name ($1,234.56)" patterns in remaining text.
  if (!afterMarkdown) return tokens;
  const amountPattern = /([A-Za-z][A-Za-z0-9&'./\- ]{2,}?)\s*\(\$[\d,]+\.\d{2}\)/g;
  let amountCursor = 0;
  let amountMatch: RegExpExecArray | null;
  while ((amountMatch = amountPattern.exec(afterMarkdown)) !== null) {
    if (amountMatch.index > amountCursor) {
      tokens.push({ type: 'text', value: afterMarkdown.slice(amountCursor, amountMatch.index) });
    }
    const full = amountMatch[0];
    const entity = amountMatch[1];
    tokens.push({
      type: 'link',
      label: full,
      href: buildTransactionsFocusLink(entity),
      entity: entity.trim(),
      amount: full.match(/\(\$[\d,]+\.\d{2}\)/)?.[0]?.replace(/[()]/g, '') || undefined,
    });
    amountCursor = amountPattern.lastIndex;
  }
  if (amountCursor < afterMarkdown.length) {
    tokens.push({ type: 'text', value: afterMarkdown.slice(amountCursor) });
  }

  return tokens;
}

export function FormattedMessageText({ text }: { text: string }) {
  const navigate = useNavigate();
  const [activeChipKey, setActiveChipKey] = useState<string | null>(null);
  const renderInlineRich = (line: string, keyPrefix: string): Array<string | JSX.Element> => {
    const tokens = tokenizeInlineLinks(line);
    const out: Array<string | JSX.Element> = [];
    let idx = 0;
    for (const token of tokens) {
      if (token.type === 'text') {
        out.push(...renderInlineStrong(token.value));
      } else {
        const tokenKey = `${keyPrefix}-link-${idx++}`;
        const isActionChip = Boolean(token.entity && token.amount);
        const isOpen = activeChipKey === tokenKey;
        out.push(
          <span key={tokenKey} className="relative inline-flex items-center">
            <button
              type="button"
              className={
                isActionChip
                  ? 'inline-flex items-center rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2 py-0.5 text-cyan-200 hover:border-amber-300/50 hover:text-amber-200 transition-colors'
                  : token.tone === 'BRUTAL_ROAST'
                  ? 'mt-2 inline-flex items-center px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 transition-all font-medium shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)]'
                  : token.tone === 'MINDFUL_THERAPIST'
                  ? 'mt-2 inline-flex items-center px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/30 transition-all font-medium shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]'
                  : token.tone === 'HYPE_MAN'
                  ? 'mt-2 inline-flex items-center px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-400 hover:bg-amber-500/30 transition-all font-bold tracking-wide uppercase shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)]'
                  : token.tone === 'PROFESSIONAL_CEO'
                  ? 'mt-2 inline-flex items-center px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-500/50 text-slate-200 hover:bg-slate-700/80 transition-all font-medium shadow-[0_0_15px_rgba(148,163,184,0.2)] hover:shadow-[0_0_25px_rgba(148,163,184,0.4)]'
                  : 'underline decoration-cyan-400/70 underline-offset-2 text-cyan-300 hover:text-amber-200 transition-colors'
              }
              onClick={(e) => {
                e.preventDefault();
                if (isActionChip) {
                  setActiveChipKey((prev) => (prev === tokenKey ? null : tokenKey));
                  return;
                }
                navigate(token.href);
              }}
              title={isActionChip ? 'Open action options' : 'Open filtered transactions'}
            >
              {token.label}
            </button>
            {isActionChip && isOpen ? (
              <div className="absolute left-0 top-full z-20 mt-1.5 w-64 rounded-lg border border-slate-700 bg-slate-950/95 p-2.5 shadow-xl backdrop-blur">
                <div className="text-[11px] text-slate-300">
                  <div className="font-semibold text-slate-100 truncate">{token.entity}</div>
                  <div className="text-slate-400">Recent amount: {token.amount}</div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-[10px] font-medium text-cyan-200 hover:bg-cyan-500/20"
                    onClick={() => {
                      setActiveChipKey(null);
                      navigate(token.href);
                    }}
                  >
                    Open in Transactions
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-[10px] font-medium text-violet-200 hover:bg-violet-500/20"
                    onClick={() => {
                      setActiveChipKey(null);
                      const joiner = token.href.includes('?') ? '&' : '?';
                      navigate(`${token.href}${joiner}trend=1`);
                    }}
                  >
                    View Trend
                  </button>
                </div>
              </div>
            ) : null}
          </span>
        );
      }
    }
    return out;
  };

  // Prime reply formatting (owner GO): headings 1–4, dividers, bullets, numbered steps, pipe
  // tables and paragraphs, from lib/messageBlocks.ts. React text nodes only; links still go
  // through renderInlineRich (app routes only).
  const blocks = parseMessageBlocks(text);
  const headingClass: Record<number, string> = {
    1: 'mt-3 mb-1.5 text-[1.15em] font-extrabold tracking-tight text-white',
    2: 'mt-3 mb-1.5 text-[1.08em] font-bold tracking-tight text-slate-50',
    3: 'mt-2.5 mb-1 font-semibold text-slate-100',
    4: 'mt-2 mb-1 text-[0.92em] font-semibold uppercase tracking-wider text-slate-300',
  };
  return (
    <div className="break-words">
      {blocks.map((b, idx) => {
        switch (b.type) {
          case 'blank':
            return <div key={`b-${idx}`} className="h-3" aria-hidden="true" />;
          case 'heading': {
            const Tag = (['h3', 'h4', 'h5', 'h6'] as const)[b.level - 1];
            return (
              <Tag key={`h-${idx}`} className={headingClass[b.level]}>
                {renderInlineRich(b.text, `h-${idx}`)}
              </Tag>
            );
          }
          case 'divider':
            return <hr key={`hr-${idx}`} className="my-3 border-0 border-t border-slate-600/50" />;
          case 'bullet':
            return (
              <div key={`li-${idx}`} className="mb-1.5 flex items-start gap-2">
                <span aria-hidden="true" className="text-slate-400">•</span>
                <span className="min-w-0">{renderInlineRich(b.text, `li-${idx}`)}</span>
              </div>
            );
          case 'numbered':
            return (
              <div key={`ol-${idx}`} className="mb-1.5 flex items-start gap-2">
                <span className="min-w-[1.6em] text-right font-semibold tabular-nums text-slate-300">{b.marker}</span>
                <span className="min-w-0">{renderInlineRich(b.text, `ol-${idx}`)}</span>
              </div>
            );
          case 'table': {
            const cols = Math.max(b.header?.length ?? 0, ...b.rows.map((r) => r.length));
            const numericCol = Array.from({ length: cols }, (_, c) => b.rows.length > 0 && b.rows.every((r) => !r[c] || isNumericCell(r[c])));
            return (
              <div key={`t-${idx}`} className="my-2 max-w-full overflow-x-auto rounded-lg border border-slate-700/60" role="region" aria-label="Table" tabIndex={0}>
                <table className="w-full border-collapse text-[0.92em]">
                  {b.header && (
                    <thead>
                      <tr className="bg-slate-800/60">
                        {Array.from({ length: cols }, (_, c) => (
                          <th key={c} scope="col" className={`whitespace-nowrap px-3 py-2 font-semibold text-slate-200 ${numericCol[c] ? 'text-right' : 'text-left'}`}>
                            {renderInlineRich(b.header?.[c] ?? '', `t-${idx}-h-${c}`)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {b.rows.map((r, ri) => (
                      <tr key={ri} className="border-t border-slate-700/50">
                        {Array.from({ length: cols }, (_, c) => (
                          <td key={c} className={`px-3 py-2 align-top ${numericCol[c] ? 'whitespace-nowrap text-right tabular-nums' : 'text-left'}`}>
                            {renderInlineRich(r[c] ?? '', `t-${idx}-${ri}-${c}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          default:
            return (
              <p key={`p-${idx}`} className="m-0 mb-1.5 whitespace-pre-wrap">
                {renderInlineRich(b.text, `p-${idx}`)}
              </p>
            );
        }
      })}
    </div>
  );
}

export function TypingMessage({
  content,
  messageId,
  isStreaming = false,
  isTyped,
  onTyped,
  charDelay = 12, // Default: faster reveal for snappier responses
  maxDuration = 3000, // Cap at 3 seconds for long messages
  renderer,
}: TypingMessageProps) {
  const [displayedText, setDisplayedText] = useState('');
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);
  const currentIndexRef = useRef(0);
  const displayedLengthRef = useRef(0);
  
  // Check for prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    displayedLengthRef.current = displayedText.length;
  }, [displayedText]);

  useEffect(() => {
    if (animationRef.current !== null) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
    isTypingRef.current = false;

    // If streaming, render content immediately (no typing delay)
    if (isStreaming) {
      setDisplayedText(content);
      currentIndexRef.current = content.length;
      displayedLengthRef.current = content.length;
      return;
    }

    // If already typed, show full content immediately
    if (isTyped) {
      setDisplayedText(content);
      currentIndexRef.current = content.length;
      displayedLengthRef.current = content.length;
      return;
    }

    // If prefers-reduced-motion, show full content immediately
    if (prefersReducedMotion) {
      setDisplayedText(content);
      currentIndexRef.current = content.length;
      displayedLengthRef.current = content.length;
      onTyped(messageId); // Mark as typed immediately
      return;
    }

    // Calculate typing speed (with slight randomness)
    const baseDelay = charDelay;
    const randomVariation = Math.random() * 4; // 0-4ms variation
    const actualDelay = baseDelay + randomVariation;

    // Calculate total characters and estimated duration
    const totalChars = content.length;
    currentIndexRef.current = Math.min(displayedLengthRef.current, totalChars);
    const estimatedDuration = totalChars * actualDelay;

    // Scale the cap to content length so long breakdowns aren't dumped instantly.
    const scaledMax = Math.max(maxDuration, totalChars * charDelay);
    const finalDelay = estimatedDuration > scaledMax
      ? Math.max(5, scaledMax / totalChars) // Minimum 5ms per char
      : actualDelay;

    // Start typing animation
    isTypingRef.current = true;
    startTimeRef.current = Date.now();

    const typeNextChar = () => {
      if (!isTypingRef.current) return;

      const currentIndex = Math.min(currentIndexRef.current, totalChars);
      if (currentIndex >= totalChars) {
        // Typing complete
        setDisplayedText(content);
        isTypingRef.current = false;
        if (!isStreaming) {
          onTyped(messageId);
        }
        return;
      }

      // Check if we've exceeded max duration
      if (!isStreaming) {
        const elapsed = Date.now() - (startTimeRef.current || 0);
        if (elapsed >= scaledMax) {
          // Show remaining text immediately
          setDisplayedText(content);
          isTypingRef.current = false;
          onTyped(messageId);
          return;
        }
      }

      // Reveal through the end of the next word (C2-D3), keeping the per-character pace
      const nextIndex = isStreaming ? currentIndex + 1 : nextRevealIndex(content, currentIndex);
      currentIndexRef.current = nextIndex;
      setDisplayedText(content.slice(0, nextIndex));

      // Schedule the next step: delay scales with the characters just revealed
      animationRef.current = window.setTimeout(typeNextChar, finalDelay * Math.max(1, nextIndex - currentIndex));
    };

    if (!isStreaming && totalChars === 0) {
      setDisplayedText('');
      return;
    }

    // If streaming, keep revealing new chars as they arrive
    if (isStreaming) {
      animationRef.current = window.setTimeout(typeNextChar, 12);
      return;
    }

    // Start typing after a small delay (feels more natural, ChatGPT-like)
    animationRef.current = window.setTimeout(typeNextChar, 40);

    // Cleanup on unmount or content change
    return () => {
      if (animationRef.current !== null) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
      isTypingRef.current = false;
    };
  }, [content, messageId, isStreaming, isTyped, charDelay, maxDuration, prefersReducedMotion, onTyped]);

  const settled = isStreaming || isTyped || displayedText.length >= content.length;
  // C2-D3: format progressively (bold, lists, links) instead of plain text then a jump.
  const visibleText = settled ? displayedText : safePartialMarkdown(displayedText);
  return (
    <span className="break-words" aria-busy={!settled}>
      {/* Screen readers get the complete reply once, not every revealed word. */}
      {!settled && <span className="sr-only">{content}</span>}
      <span aria-hidden={!settled || undefined}>
        {renderer ? renderer(visibleText) : <FormattedMessageText text={visibleText} />}
      </span>
    </span>
  );
}

