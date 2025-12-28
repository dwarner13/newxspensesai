/**
 * Prime Logo Badge Component
 * 
 * Premium dark badge for Prime with navy background, gradient border, and optional glow ring.
 * Matches the dark neon dashboard theme. Single source of truth for all Prime logos.
 */

import React from 'react';
import { cn } from '../../lib/utils';

interface PrimeLogoBadgeProps {
  /** Inner circle diameter in pixels, default 40 */
  size?: number;
  /** Whether to show the outer glow ring, default true */
  showGlow?: boolean;
  /** Additional className */
  className?: string;
}

export const PrimeLogoBadge: React.FC<PrimeLogoBadgeProps> = ({
  size = 40,
  showGlow = true,
  className,
}) => {
  const innerSize = size;
  const borderWidth = 2;
  const badgeWithBorder = innerSize + (borderWidth * 2); // 2px border on each side
  const outerSize = showGlow ? badgeWithBorder + 16 : badgeWithBorder;
  
  // Calculate crown size based on badge size (60-70% of inner circle)
  const crownSize = Math.max(Math.round(size * 0.65), 16);
  const crownTextSize = size <= 32 ? 'text-base' : size <= 48 ? 'text-xl' : size <= 64 ? 'text-2xl' : 'text-3xl';

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: outerSize, height: outerSize }}
    >
      {/* Outer glow ring - soft blur, low opacity, gradient */}
      {showGlow && (
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/20 via-orange-500/20 to-rose-500/20 blur-lg opacity-60"
          style={{
            width: outerSize,
            height: outerSize,
          }}
          aria-hidden="true"
        />
      )}

      {/* Main badge circle - dark navy background with gradient border */}
      {/* Outer wrapper for gradient border */}
      <div
        className="relative rounded-full"
        style={{
          background: 'linear-gradient(135deg, #fbbf24, #f97316, #f43f5e)',
          width: badgeWithBorder,
          height: badgeWithBorder,
          padding: `${borderWidth}px`,
        }}
      >
        {/* Inner circle with dark navy background */}
        <div
          className={cn(
            'relative rounded-full',
            'bg-[#050816]', // Dark navy matching dashboard theme
            'shadow-xl shadow-amber-500/40',
            'flex items-center justify-center',
            'w-full h-full'
          )}
        >
          {/* Crown icon - gold, slightly glowing */}
          <span
            className={cn(
              'relative z-10',
              'text-amber-300',
              'drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]',
              crownTextSize,
              'select-none'
            )}
            style={{ fontSize: `${crownSize}px`, lineHeight: 1 }}
          >
            👑
          </span>
        </div>
      </div>
    </div>
  );
};

