/**
 * DashboardSection Component
 * 
 * Consistent wrapper for dashboard page content that ensures:
 * - Consistent top margin under the header
 * - Standard vertical spacing between sections
 * - All pages start at the same vertical position
 * 
 * Enhanced version supports section headers with title and subtitle
 * matching the Main Dashboard section styling.
 */

import { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface DashboardSectionProps {
  children: ReactNode;
  className?: string;
  /** Optional section title (e.g., "CORE AI TOOLS") */
  title?: string;
  /** Optional section subtitle/description */
  subtitle?: string;
  /** Whether this is the first section (adds extra top margin) */
  isFirstSection?: boolean;
}

export function DashboardSection({ 
  children, 
  className = "",
  title,
  subtitle,
  isFirstSection = false,
}: DashboardSectionProps) {
  return (
    <section className={cn(
      isFirstSection ? "mt-16 md:mt-20" : "mt-16 md:mt-20",
      "space-y-6",
      className
    )}>
      {(title || subtitle) && (
        <div className="text-center mb-6">
          {title && (
            <h2 className="text-sm font-semibold tracking-wide text-slate-300 uppercase mb-1">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

