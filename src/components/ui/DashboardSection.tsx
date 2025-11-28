/**
 * DashboardSection Component
 * 
 * Consistent wrapper for dashboard page content that ensures:
 * - Consistent top margin under the header
 * - Standard vertical spacing between sections
 * - All pages start at the same vertical position
 */

import { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface DashboardSectionProps {
  children: ReactNode;
  className?: string;
}

export function DashboardSection({ children, className = "" }: DashboardSectionProps) {
  return (
    <section className={cn("mt-8 space-y-6", className)}>
      {children}
    </section>
  );
}

