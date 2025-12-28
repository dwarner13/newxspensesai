/**
 * AIWorkspaceContainer Component
 * 
 * Universal container wrapper for AI workspace overlays
 * Handles backdrop, animation, ESC key, body scroll lock, and click-outside
 */

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

export interface AIWorkspaceContainerProps {
  open: boolean;
  onClose: () => void;
  minimized?: boolean; // When true, overlay is hidden but component stays mounted (preserves chat state)
  maxWidthClass?: string; // default: 'max-w-5xl'
  heightClass?: string;   // default: 'h-[72vh]'
  children: React.ReactNode;
  ariaLabelledBy?: string;
}

export function AIWorkspaceContainer({
  open,
  onClose,
  minimized = false,
  maxWidthClass = 'max-w-5xl',
  heightClass = 'h-[72vh]',
  children,
  ariaLabelledBy,
}: AIWorkspaceContainerProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle animation state - trigger immediately when opening
  useEffect(() => {
    if (open && !minimized) {
      // Small delay to ensure DOM is ready, then trigger animation
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
    }
  }, [open, minimized]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  // Prevent body scroll when overlay is open (but not when minimized)
  useEffect(() => {
    if (open && !minimized) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open, minimized]);

  // When minimized or closed, hide the overlay but keep component mounted if minimized
  // This preserves chat state when minimized
  if (!open && !minimized) return null;
  
  // When minimized, render nothing visible but keep component mounted
  if (minimized) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] bg-slate-950/50 backdrop-blur-md transition-opacity duration-200',
        isAnimating ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Modal Container - Offset from left (sidebar) and right (floating buttons) on desktop */}
      {/* Mobile: full-width centered, Desktop: offset from sidebar (lg:left-64 = 256px) and floating buttons (lg:right-16 = 64px) */}
      <div className={cn(
        'absolute inset-y-0 left-0 right-0 lg:left-64 lg:right-16 flex items-center justify-center p-4 overflow-hidden',
        'transition-all duration-200',
        isAnimating ? 'opacity-100' : 'opacity-0'
      )}>
        {/* Floating Panel - Responsive sizing */}
        {/* Mobile: full-width, tall height, smaller radius */}
        {/* Desktop: use provided maxWidthClass and heightClass, larger radius */}
        <div
          ref={containerRef}
          className={cn(
            'relative w-full max-w-none h-[92vh] rounded-2xl border border-slate-500/40',
            'bg-slate-950/90 shadow-2xl overflow-hidden flex flex-col',
            'transition-all duration-200 ease-out',
            // Desktop overrides - use provided classes with md: prefix
            // Use explicit classes for common cases to ensure Tailwind JIT includes them
            maxWidthClass === 'max-w-5xl' && 'md:max-w-5xl',
            maxWidthClass === 'max-w-4xl' && 'md:max-w-4xl',
            maxWidthClass === 'max-w-6xl' && 'md:max-w-6xl',
            maxWidthClass === 'max-w-7xl' && 'md:max-w-7xl',
            // For arbitrary values, use Tailwind's arbitrary value syntax
            maxWidthClass && !maxWidthClass.match(/^(max-w-5xl|max-w-4xl|max-w-6xl|max-w-7xl)$/) && `md:[${maxWidthClass}]`,
            heightClass === 'h-[72vh]' && 'md:h-[72vh]',
            heightClass === 'h-[80vh]' && 'md:h-[80vh]',
            heightClass === 'h-[85vh]' && 'md:h-[85vh]',
            // For arbitrary height values
            heightClass && !heightClass.match(/^(h-\[72vh\]|h-\[80vh\]|h-\[85vh\])$/) && `md:[${heightClass}]`,
            'md:rounded-3xl',
            // Animation states
            isAnimating ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

