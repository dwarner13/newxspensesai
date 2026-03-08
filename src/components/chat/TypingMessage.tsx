/**
 * TypingMessage Component
 * 
 * Progressively reveals assistant message text (ChatGPT-like typing effect).
 * Only applies to assistant messages that haven't been typed yet.
 * Respects prefers-reduced-motion and handles streaming messages.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

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
}

export function renderInlineStrong(text: string): Array<string | JSX.Element> {
  const chunks: Array<string | JSX.Element> = [];
    // Matches explicit bold (**text**), currency ($1,234.56), percentages (45%), and common dates
  const pattern = /\*\*(.+?)\*\*|((?:C\$|CA\$|US\$|\$|€|£)\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)|(\b\d+(?:\.\d+)?%)|(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?,? \d{4}\b|\b\d{4}-\d{2}-\d{2}\b)/gi;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIdx) {
      chunks.push(text.slice(lastIdx, match.index));
    }
    const content = match[1] || match[2] || match[3] || match[4];
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

  const lines = String(text || '').split('\n');
  return (
    <div className="break-words">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={`line-${idx}`} className="h-2" />;
        }
        if (trimmed.startsWith('## ')) {
          return (
            <div key={`line-${idx}`} className="mt-2 mb-1 font-semibold tracking-wide text-slate-100">
              {renderInlineRich(trimmed.slice(3), `h2-${idx}`)}
            </div>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <div key={`line-${idx}`} className="mt-2 mb-1 font-semibold text-slate-100">
              {renderInlineRich(trimmed.slice(4), `h3-${idx}`)}
            </div>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          const body = trimmed.replace(/^[-•]\s+/, '');
          return (
            <div key={`line-${idx}`} className="mb-1 flex items-start gap-2">
              <span className="text-slate-300">•</span>
              <span>{renderInlineRich(body, `li-${idx}`)}</span>
            </div>
          );
        }
        return (
          <div key={`line-${idx}`} className="mb-1 whitespace-pre-wrap">
            {renderInlineRich(line, `p-${idx}`)}
          </div>
        );
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

    // If message is too long, speed up to cap duration
    const finalDelay = estimatedDuration > maxDuration 
      ? Math.max(5, maxDuration / totalChars) // Minimum 5ms per char
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
        if (elapsed >= maxDuration) {
          // Show remaining text immediately
          setDisplayedText(content);
          isTypingRef.current = false;
          onTyped(messageId);
          return;
        }
      }

      // Reveal next character
      currentIndexRef.current = currentIndex + 1;
      setDisplayedText(content.slice(0, currentIndexRef.current));

      // Schedule next character
      animationRef.current = window.setTimeout(typeNextChar, finalDelay);
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

  return (
    <span className="break-words">
      <FormattedMessageText text={displayedText} />
    </span>
  );
}

