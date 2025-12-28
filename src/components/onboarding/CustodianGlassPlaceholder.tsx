/**
 * Custodian Glass Placeholder
 * 
 * Beautiful Apple-like liquid glass placeholder for the right panel
 * before Custodian activates. Features shimmer, subtle particles, and gradient.
 */

import React from 'react';
import { motion } from 'framer-motion';

interface CustodianGlassPlaceholderProps {
  isMobile?: boolean;
}

export function CustodianGlassPlaceholder({ isMobile = false }: CustodianGlassPlaceholderProps) {
  if (isMobile) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98, filter: 'blur(8px)' }}
      transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
      className="w-full h-full flex items-center justify-center p-6 relative overflow-hidden"
    >
      {/* Main glass container */}
      <div
        className="relative w-full max-w-[420px] h-full rounded-3xl overflow-hidden"
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(255, 255, 255, 0.1) 0%,
              rgba(255, 255, 255, 0.05) 50%,
              rgba(255, 255, 255, 0.08) 100%
            )
          `,
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.2),
            0 0 0 1px rgba(255, 255, 255, 0.05)
          `,
        }}
      >
        {/* Animated gradient overlay (shimmer effect) */}
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            background: [
              'linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
              'linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.15) 50%, transparent 100%)',
              'linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            backgroundPosition: '200% 0',
          }}
        />

        {/* Subtle particles effect */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-white/20"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 3) * 20}%`,
              }}
              animate={{
                opacity: [0.2, 0.5, 0.2],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 2 + i * 0.3,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        {/* Inner glow */}
        <div
          className="absolute inset-0 rounded-3xl"
          style={{
            background: `
              radial-gradient(circle at 30% 40%, 
                rgba(139, 92, 246, 0.15) 0%,
                transparent 50%
              )
            `,
          }}
        />

        {/* Content placeholder (subtle) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
          <motion.div
            animate={{
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="text-center"
          >
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl opacity-60">🛡️</span>
            </div>
            <div className="h-2 w-24 bg-white/10 rounded-full mx-auto mb-2" />
            <div className="h-2 w-32 bg-white/8 rounded-full mx-auto" />
          </motion.div>
        </div>

        {/* Edge highlight */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
          }}
        />
      </div>
    </motion.div>
  );
}








