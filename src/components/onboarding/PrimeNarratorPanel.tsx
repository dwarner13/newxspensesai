/**
 * Prime Narrator Panel
 * 
 * Shows Prime's explanatory messages during Custodian handoff.
 * Prime remains visible but dimmed, explaining the system calmly.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TypewriterStable } from '../ui/TypewriterStable';

interface PrimeNarratorPanelProps {
  messages: string[];
  onAllMessagesDone?: () => void;
  isDimmed?: boolean;
  accumulateMessages?: boolean; // If true, append new messages instead of replacing
}

export function PrimeNarratorPanel({
  messages,
  onAllMessagesDone,
  isDimmed = false,
  accumulateMessages = false,
}: PrimeNarratorPanelProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [completedMessages, setCompletedMessages] = useState<Set<number>>(new Set());
  const [currentMessageDone, setCurrentMessageDone] = useState(false);
  const [allMessages, setAllMessages] = useState<string[]>(messages);

  // Accumulate messages if accumulateMessages is true
  useEffect(() => {
    if (accumulateMessages) {
      setAllMessages(prev => {
        const newMessages = messages.filter(m => !prev.includes(m));
        return [...prev, ...newMessages];
      });
    } else {
      setAllMessages(messages);
    }
  }, [messages, accumulateMessages]);

  // Start typing first uncompleted message
  useEffect(() => {
    if (allMessages.length > 0) {
      // Find first uncompleted message
      const firstUncompleted = allMessages.findIndex((_, idx) => !completedMessages.has(idx));
      if (firstUncompleted !== -1 && firstUncompleted !== currentMessageIndex) {
        setCurrentMessageIndex(firstUncompleted);
        setCurrentMessageDone(false);
      } else if (firstUncompleted === -1 && currentMessageIndex < allMessages.length) {
        // All messages completed, but we're still on a message
        setCurrentMessageDone(true);
      }
    }
  }, [allMessages.length, completedMessages, currentMessageIndex]);

  const handleMessageDone = () => {
    setCurrentMessageDone(true);
    setCompletedMessages(prev => new Set([...prev, currentMessageIndex]));
    
    // Wait a bit before moving to next message or finishing
    setTimeout(() => {
      const nextIndex = currentMessageIndex + 1;
      if (nextIndex < allMessages.length) {
        setCurrentMessageIndex(nextIndex);
        setCurrentMessageDone(false);
      } else {
        // All messages done - wait a moment before calling callback
        setTimeout(() => {
          onAllMessagesDone?.();
        }, 500);
      }
    }, 1000); // Brief pause between messages
  };

  if (allMessages.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-[640px] px-8 md:px-12 py-8 md:py-10">
      {/* Crown Icon - Dimmed if narrator mode */}
      <div className="flex items-start mb-6 relative">
        <motion.div
          animate={{
            opacity: isDimmed ? 0.5 : 0.9,
          }}
          transition={{ duration: 0.5 }}
          style={{
            filter: isDimmed 
              ? 'drop-shadow(0 0 8px rgba(192, 132, 252, 0.3))'
              : 'drop-shadow(0 0 12px rgba(192, 132, 252, 0.5)) drop-shadow(0 0 24px rgba(59, 130, 246, 0.2))',
          }}
        >
          <span className="text-4xl md:text-5xl">👑</span>
        </motion.div>
      </div>

      {/* Prime's Original Headline - Dimmed but visible */}
      <motion.div
        animate={{ opacity: isDimmed ? 0.4 : 0.7 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <h1 
          className="text-3xl md:text-4xl lg:text-5xl font-semibold text-white/70 tracking-tight leading-tight"
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            lineHeight: '1.15',
          }}
        >
          I'm Prime — your financial operating system.
        </h1>
      </motion.div>

      {/* Prime's Explanation Messages */}
      <div className="space-y-4">
        {allMessages.map((message, index) => {
          const isActive = index === currentMessageIndex;
          const isCompleted = completedMessages.has(index);
          const shouldShow = isActive || isCompleted;

          if (!shouldShow) return null;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ 
                opacity: isCompleted ? 0.7 : (isActive ? 0.7 : 0.5),
                y: 0,
              }}
              transition={{ duration: 0.4 }}
              className="text-sm md:text-base text-slate-300 leading-relaxed"
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                opacity: isCompleted ? 0.7 : (isActive ? 0.7 : 0.5),
              }}
            >
              {isActive && !isCompleted ? (
                <TypewriterStable
                  text={message}
                  msPerChar={35}
                  startDelayMs={index === 0 ? 300 : 0}
                  cursor={true}
                  className="text-slate-300"
                  onDone={handleMessageDone}
                />
              ) : (
                <span>{message}</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

