/**
 * TypingMessage Component
 * 
 * Progressively reveals assistant message text (ChatGPT-like typing effect).
 * Only applies to assistant messages that haven't been typed yet.
 * Respects prefers-reduced-motion and handles streaming messages.
 */

import React, { useState, useEffect, useRef } from 'react';

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
  /** Character delay in ms (default: 12-20ms with randomness) */
  charDelay?: number;
  /** Maximum animation duration in ms (default: 5000ms) */
  maxDuration?: number;
}

export function TypingMessage({
  content,
  messageId,
  isStreaming = false,
  isTyped,
  onTyped,
  charDelay = 18, // Default: ~18ms per character (ChatGPT-like speed, adjustable)
  maxDuration = 5000, // Cap at 5 seconds for long messages
}: TypingMessageProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);
  
  // Check for prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    // If already typed, show full content immediately
    if (isTyped) {
      setDisplayedText(content);
      setShowCursor(false);
      return;
    }

    // If streaming, show content immediately (no typewriter during stream)
    if (isStreaming) {
      setDisplayedText(content);
      setShowCursor(true); // Show cursor while streaming
      return;
    }

    // If prefers-reduced-motion, show full content immediately
    if (prefersReducedMotion) {
      setDisplayedText(content);
      setShowCursor(false);
      onTyped(messageId); // Mark as typed immediately
      return;
    }

    // Calculate typing speed (with slight randomness)
    const baseDelay = charDelay;
    const randomVariation = Math.random() * 8; // 0-8ms variation
    const actualDelay = baseDelay + randomVariation;

    // Calculate total characters and estimated duration
    const totalChars = content.length;
    const estimatedDuration = totalChars * actualDelay;

    // If message is too long, speed up to cap duration
    const finalDelay = estimatedDuration > maxDuration 
      ? Math.max(5, maxDuration / totalChars) // Minimum 5ms per char
      : actualDelay;

    // Start typing animation
    isTypingRef.current = true;
    startTimeRef.current = Date.now();
    let currentIndex = 0;

    const typeNextChar = () => {
      if (!isTypingRef.current || currentIndex >= totalChars) {
        // Typing complete
        setDisplayedText(content);
        setShowCursor(false);
        isTypingRef.current = false;
        onTyped(messageId);
        return;
      }

      // Check if we've exceeded max duration
      const elapsed = Date.now() - (startTimeRef.current || 0);
      if (elapsed >= maxDuration) {
        // Show remaining text immediately
        setDisplayedText(content);
        setShowCursor(false);
        isTypingRef.current = false;
        onTyped(messageId);
        return;
      }

      // Reveal next character
      currentIndex++;
      setDisplayedText(content.slice(0, currentIndex));
      setShowCursor(true);

      // Schedule next character
      animationRef.current = window.setTimeout(typeNextChar, finalDelay);
    };

    // Start typing after a small delay (feels more natural, ChatGPT-like)
    animationRef.current = window.setTimeout(typeNextChar, 150);

    // Cleanup on unmount or content change
    return () => {
      if (animationRef.current !== null) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
      isTypingRef.current = false;
    };
  }, [content, messageId, isStreaming, isTyped, charDelay, maxDuration, prefersReducedMotion, onTyped]);

  // Cursor blink animation
  useEffect(() => {
    if (!showCursor) return;

    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530); // Blink every ~530ms

    return () => clearInterval(cursorInterval);
  }, [showCursor]);

  return (
    <span className="whitespace-pre-wrap break-words">
      {displayedText}
      {showCursor && (
        <span className="inline-block w-0.5 h-4 bg-slate-400 ml-0.5 align-middle animate-pulse" aria-hidden="true">
          ▍
        </span>
      )}
    </span>
  );
}

