/**
 * TypingMessage Component
 * 
 * Progressively reveals assistant message text (ChatGPT-like typing effect).
 * Only applies to assistant messages that haven't been typed yet.
 * Respects prefers-reduced-motion and handles streaming messages.
 */

import { useState, useEffect, useRef } from 'react';

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

function renderInlineStrong(text: string): Array<string | JSX.Element> {
  const chunks: Array<string | JSX.Element> = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIdx) {
      chunks.push(text.slice(lastIdx, match.index));
    }
    chunks.push(<strong key={`strong-${key++}`} className="font-semibold text-slate-100">{match[1]}</strong>);
    lastIdx = pattern.lastIndex;
  }
  if (lastIdx < text.length) {
    chunks.push(text.slice(lastIdx));
  }
  return chunks;
}

export function FormattedMessageText({ text }: { text: string }) {
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
              {renderInlineStrong(trimmed.slice(3))}
            </div>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <div key={`line-${idx}`} className="mt-2 mb-1 font-semibold text-slate-100">
              {renderInlineStrong(trimmed.slice(4))}
            </div>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          const body = trimmed.replace(/^[-•]\s+/, '');
          return (
            <div key={`line-${idx}`} className="mb-1 flex items-start gap-2">
              <span className="text-slate-300">•</span>
              <span>{renderInlineStrong(body)}</span>
            </div>
          );
        }
        return (
          <div key={`line-${idx}`} className="mb-1 whitespace-pre-wrap">
            {renderInlineStrong(line)}
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

