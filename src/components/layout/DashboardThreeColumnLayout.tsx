/**
 * DashboardThreeColumnLayout Component
 * 
 * Shared 2-column layout for all dashboard workspaces (35% left, 65% right)
 * Desktop: Always 2 columns with Activity Feed pinned to bottom of right column
 * Mobile: Single column with Activity Feed below
 * 
 * Layout:
 * - Left column: 35% (workspace panel)
 * - Right column: 65% (main content + Activity Feed at bottom)
 * 
 * Both columns align at the bottom with no endless scroll
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { ActivityFeedSidebar } from '../dashboard/ActivityFeedSidebar';

interface DashboardThreeColumnLayoutProps {
  className?: string;
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
}

/**
 * Check if a React node has renderable content (not empty)
 * Handles: undefined, null, empty fragments, empty divs, whitespace-only strings
 */
function hasRenderableContent(node: React.ReactNode): boolean {
  if (node === undefined || node === null) return false;
  if (typeof node === 'string') return node.trim().length > 0;
  if (typeof node === 'number') return true;
  if (typeof node === 'boolean') return false;
  
  if (React.isValidElement(node)) {
    // Empty div or fragment
    if (node.type === React.Fragment) {
      return React.Children.count(node.props.children) > 0;
    }
    if (node.type === 'div') {
      const children = node.props.children;
      if (!children) return false;
      if (typeof children === 'string') return children.trim().length > 0;
      if (React.Children.count(children) === 0) return false;
      // Check if all children are empty
      return React.Children.toArray(children).some(child => hasRenderableContent(child));
    }
    return true; // Other element types are considered content
  }
  
  // Array of nodes
  if (Array.isArray(node)) {
    return node.some(child => hasRenderableContent(child));
  }
  
  return false;
}

export function DashboardThreeColumnLayout({
  className,
  left,
  center,
  right,
}: DashboardThreeColumnLayoutProps) {
  const hasLeftContent = hasRenderableContent(left);
  const hasRightContent = hasRenderableContent(right);
  
  // Track breakpoint for desktop detection
  const [isDesktop, setIsDesktop] = React.useState(() => 
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false
  );
  
  // Update breakpoint state on resize
  React.useEffect(() => {
    const lgQuery = window.matchMedia('(min-width: 1024px)');
    
    const handleLgChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    
    // Set initial state
    setIsDesktop(lgQuery.matches);
    
    // Listen for changes
    lgQuery.addEventListener('change', handleLgChange);
    
    return () => {
      lgQuery.removeEventListener('change', handleLgChange);
    };
  }, []);

  return (
    <section 
      data-grid-wrapper
      className="w-full max-w-full min-w-0 overflow-x-hidden h-full min-h-[520px]"
      style={
        isDesktop
          ? {
              // Force full width on desktop to prevent any parent constraints
              width: '100%',
              maxWidth: 'none',
              // Reserve space for floating rail on desktop (96px default, 112px on md+)
              paddingRight: 'var(--rail-space, 96px)',
            }
          : undefined
      }
    >
      {/* Desktop: 2-column layout (35% left, 65% right) */}
      {/* Mobile: Single column */}
      <div 
        data-dashboard-three-col
        className={cn(
          'xai-dash-grid',
          hasLeftContent ? 'has-left' : 'no-left',
          className
        )}
        style={
          isDesktop
            ? {
                // Desktop: Always 2 columns (35% left, 65% right)
                gridTemplateColumns: hasLeftContent 
                  ? 'minmax(320px, 35%) minmax(0, 65%)'
                  : 'minmax(0, 1fr)',
                width: '100%',
                maxWidth: 'none'
              }
            : undefined
        }
      >
        {/* Left Column - Workspace Panel (35%) */}
        {hasLeftContent && (
          <div className="min-w-0 w-full h-full min-h-0 flex items-stretch">
            <div className="w-full h-full min-h-0 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
              {left}
            </div>
          </div>
        )}

        {/* Right Column - Main Content + Activity Feed Stack (65%) */}
        <div className="min-w-0 w-full h-full min-h-0 flex flex-col gap-6 items-stretch">
          {/* Main Center Content - Takes remaining space */}
          <div className="min-w-0 min-h-0 flex-1">
            <div className="w-full h-full min-h-0 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
              {center}
            </div>
          </div>

          {/* Activity Feed - Pinned to bottom with max height */}
          {hasRightContent && isDesktop && (
            <div className="min-w-0 shrink-0">
              <div 
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                style={{
                  maxHeight: '420px',
                  overflow: 'auto'
                }}
              >
                {/* Render ActivityFeedSidebar with embedded variant, or clone other components */}
                {(() => {
                  if (!React.isValidElement(right)) return right;
                  
                  const componentName = typeof right.type === 'function' ? (right.type as any).name : null;
                  const isActivityFeedSidebar = componentName === 'ActivityFeedSidebar';
                  
                  if (isActivityFeedSidebar) {
                    return (
                      <ActivityFeedSidebar 
                        scope={(right.props as any).scope}
                        lastUploadSummary={(right.props as any).lastUploadSummary}
                        className={(right.props as any).className}
                        variant="embedded"
                      />
                    );
                  }
                  
                  // Fallback: clone with variant prop
                  return React.cloneElement(right as React.ReactElement<any>, { 
                    ...(right.props as Record<string, any>),
                    variant: 'embedded' as const
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity Feed - Mobile only: below grid */}
      {hasRightContent && !isDesktop && (
        <div className="mt-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
            {right}
          </div>
        </div>
      )}
    </section>
  );
}
