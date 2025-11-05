/**
 * 🛡️ Security Wrapper HOC (Higher-Order Component)
 * 
 * Automatically enforces security controls on dashboard pages.
 * 
 * Features:
 * - Auth gating (redirect if !user)
 * - Consent banner injection (if required)
 * - Dev-mode security toolbar (shows active controls)
 * - Runtime compliance tracking
 * - Error boundary for security failures
 * - PII-safe logging of security events
 * - Automatic audit trail for wrapped pages
 * 
 * Usage:
 *   const SecureTransactionsPage = withSecurity('transactions')(TransactionsPage);
 * 
 * Or with async pages:
 *   const SecureSmartImport = withSecurity('smartImport', { async: true })(SmartImportAI);
 */

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { safeLog } from "@/netlify/functions/_shared/guardrail-log";
import {
  SecurityRegistry,
  PageKey,
  getRequiredControls,
  ControlMetadata,
  ComplianceAudit,
  auditPageCompliance,
} from "./registry";

// ============================================================================
// TYPES
// ============================================================================

export interface WithSecurityOptions {
  /** Enable async page rendering (Suspense-compatible) */
  async?: boolean;
  /** Custom loading skeleton component */
  loadingComponent?: React.ComponentType<any>;
  /** Custom error component */
  errorComponent?: React.ComponentType<{ error: Error; page: PageKey }>;
  /** Override required controls (for testing) */
  overrideRequired?: string[];
  /** Custom auth gate message */
  authGateMessage?: string;
  /** Track page view in analytics */
  trackView?: boolean;
  /** Emit compliance events */
  emitAudit?: boolean;
}

// ============================================================================
// DEVELOPMENT TOOLBAR
// ============================================================================

interface SecurityToolbarProps {
  page: PageKey;
  controls: string[];
  audit: ComplianceAudit;
}

function SecurityToolbar({ page, controls, audit }: SecurityToolbarProps) {
  const isDev =
    typeof process !== "undefined" && process.env.NODE_ENV !== "production";

  if (!isDev) return null;

  const statusColor =
    audit.status === "compliant"
      ? "bg-green-100 border-green-300 text-green-900"
      : audit.percentage >= 75
        ? "bg-yellow-100 border-yellow-300 text-yellow-900"
        : audit.percentage >= 50
          ? "bg-orange-100 border-orange-300 text-orange-900"
          : "bg-red-100 border-red-300 text-red-900";

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-xl border shadow-lg p-3 bg-white/90 backdrop-blur max-w-sm ${statusColor}`}
      title={`Page: ${page}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-sm">🛡️ Security</div>
        <div className="text-xs font-semibold">
          {audit.percentage.toFixed(0)}% • {audit.implemented.length}/{audit.required.length}
        </div>
      </div>

      {/* Required Controls */}
      <div className="mb-2">
        <div className="text-xs font-semibold mb-1 opacity-75">Required:</div>
        <div className="flex flex-wrap gap-1">
          {audit.required.map((control) => {
            const isImpl = audit.implemented.includes(control);
            const meta = ControlMetadata[control];
            return (
              <span
                key={control}
                className={`text-xs px-2 py-1 rounded ${
                  isImpl
                    ? "bg-green-200/50 text-green-900"
                    : "bg-red-200/50 text-red-900 line-through"
                }`}
                title={meta?.description}
              >
                {control}
              </span>
            );
          })}
        </div>
      </div>

      {/* Missing Controls */}
      {audit.missing.length > 0 && (
        <div className="mb-2 p-2 bg-red-200/30 rounded border border-red-300/50">
          <div className="text-xs font-bold mb-1">⚠️ Missing:</div>
          <ul className="text-xs space-y-0.5">
            {audit.missing.map((control) => (
              <li key={control}>
                • {control} ({ControlMetadata[control]?.severity || "?"})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Page Info */}
      <div className="mt-2 pt-2 border-t border-gray-300/50 text-xs opacity-75">
        <div>Page: <code className="font-mono text-xs">{page}</code></div>
        <div>Status: <span className="font-bold">{audit.status}</span></div>
      </div>
    </div>
  );
}

// ============================================================================
// ERROR BOUNDARY
// ============================================================================

interface SecurityErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  page: PageKey;
}

interface SecurityErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SecurityErrorBoundary extends React.Component<
  SecurityErrorBoundaryProps,
  SecurityErrorBoundaryState
> {
  constructor(props: SecurityErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SecurityErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    safeLog("error", "SecurityErrorBoundary caught error", {
      page: this.props.page,
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-6 bg-red-50 rounded-lg border border-red-200">
            <h1 className="text-lg font-bold text-red-900">Security Error</h1>
            <p className="text-sm text-red-700 mt-2">
              {this.state.error?.message || "An error occurred while loading this page."}
            </p>
            <a
              href="/dashboard"
              className="inline-block mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Return to Dashboard
            </a>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// MAIN HOC
// ============================================================================

export function withSecurity(
  pageKey: PageKey,
  options: WithSecurityOptions = {}
) {
  const {
    async: asyncMode = false,
    loadingComponent: LoadingComponent,
    errorComponent: ErrorComponent,
    overrideRequired = [],
    authGateMessage = "Please sign in to access this page.",
    trackView = true,
    emitAudit = true,
  } = options;

  return function withSecurityWrapper<P extends object>(
    Component: React.ComponentType<P>
  ): React.FC<P> {
    const WrappedComponent: React.FC<P> = (props) => {
      // ========== Auth & Session ==========
      const { user, session, loading: authLoading } = useAuth();

      // ========== State ==========
      const [mounted, setMounted] = useState(false);
      const [securityError, setSecurityError] = useState<Error | null>(null);

      // ========== Security Audit ==========
      const requiredControls = useMemo(
        () => getRequiredControls(pageKey),
        [pageKey]
      );

      const implementedControls = useMemo(
        () => overrideRequired || requiredControls,
        [overrideRequired, requiredControls]
      );

      const audit = useMemo(
        () => auditPageCompliance(pageKey, implementedControls as any),
        [implementedControls, pageKey]
      );

      // ========== Lifecycle ==========
      useEffect(() => {
        setMounted(true);

        // Track page view (if enabled)
        if (trackView && user) {
          safeLog("info", `page_view`, {
            page: pageKey,
            userId: user.id,
            compliance: `${audit.percentage.toFixed(0)}%`,
          });
        }

        // Emit audit event (if enabled)
        if (emitAudit && user) {
          // Emit to your analytics/telemetry service
          const event = new CustomEvent("security:page-load", {
            detail: {
              page: pageKey,
              userId: user.id,
              audit,
              timestamp: new Date().toISOString(),
            },
          });
          window.dispatchEvent(event);
        }
      }, [user, audit, pageKey, trackView, emitAudit]);

      // ========== Auth Gate ==========
      const needsAuth = requiredControls.includes("authGate");

      if (needsAuth) {
        if (authLoading || !mounted) {
          return LoadingComponent ? (
            <LoadingComponent page={pageKey} />
          ) : (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="animate-spin mb-3">
                  <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full" />
                </div>
                <p className="text-gray-600">Loading...</p>
              </div>
            </div>
          );
        }

        if (!session || !user) {
          safeLog("warn", "security:auth-gate-blocked", {
            page: pageKey,
            reason: "no-session",
          });

          return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
              <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
                <div className="text-4xl mb-4">🔐</div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Authentication Required
                </h1>
                <p className="text-slate-600 mb-6">{authGateMessage}</p>
                <a
                  href="/login"
                  className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Sign In
                </a>
              </div>
            </div>
          );
        }
      }

      // ========== Security Error ==========
      if (securityError) {
        const error = securityError;
        safeLog("error", "security:error-boundary", {
          page: pageKey,
          error: error.message,
        });

        return ErrorComponent ? (
          <ErrorComponent error={error} page={pageKey} />
        ) : (
          <div className="p-6 bg-red-50 rounded-lg border border-red-200 m-4">
            <h2 className="text-lg font-bold text-red-900">Security Error</h2>
            <p className="text-sm text-red-700 mt-2">{error.message}</p>
            <button
              onClick={() => {
                setSecurityError(null);
                window.location.reload();
              }}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        );
      }

      // ========== Render ==========
      return (
        <SecurityErrorBoundary page={pageKey} fallback={null}>
          <div className="relative">
            {/* Consent Banner (if required) */}
            {requiredControls.includes("consent") && (
              <UniversalConsentBanner page={pageKey} />
            )}

            {/* Page Content */}
            <Component {...(props as P)} />

            {/* Dev Security Toolbar */}
            <SecurityToolbar page={pageKey} controls={implementedControls as string[]} audit={audit} />
          </div>
        </SecurityErrorBoundary>
      );
    };

    WrappedComponent.displayName = `withSecurity(${
      Component.displayName || Component.name || "Component"
    })`;

    return WrappedComponent;
  };
}

// ============================================================================
// BATCH WRAPPER (for applying to multiple pages at once)
// ============================================================================

export function withSecurityBatch<
  T extends Record<string, React.ComponentType<any>>
>(
  pages: T,
  pageKeyMap: Record<keyof T, PageKey>,
  options?: WithSecurityOptions
): Record<keyof T, React.ComponentType<any>> {
  const wrapped = {} as Record<keyof T, React.ComponentType<any>>;

  for (const [key, Component] of Object.entries(pages)) {
    const pageKey = pageKeyMap[key as keyof T];
    if (pageKey) {
      wrapped[key as keyof T] = withSecurity(pageKey, options)(
        Component as React.ComponentType<any>
      );
    }
  }

  return wrapped;
}

// ============================================================================
// UTILITIES FOR TESTING & AUDIT
// ============================================================================

/**
 * Hook to check if current page meets security requirements
 * @param pageKey - The page to check
 * @returns Audit object with compliance status and missing controls
 */
export function useSecurityAudit(pageKey: PageKey) {
  const requiredControls = useMemo(
    () => getRequiredControls(pageKey),
    [pageKey]
  );

  // This would be populated by actual implementations
  // For now, return empty (caller should fill in via context or props)
  const implementedControls: any[] = [];

  return useMemo(
    () => auditPageCompliance(pageKey, implementedControls),
    [pageKey, implementedControls]
  );
}

/**
 * Hook to emit security events for analytics
 * @param pageKey - The page emitting the event
 * @param eventType - Type of security event
 * @param data - Additional event data
 */
export function useSecurityEvent(
  pageKey: PageKey,
  eventType: "auth-gate" | "rate-limit" | "pii-detected" | "consent-accepted",
  data?: Record<string, unknown>
) {
  const { user } = useAuth();

  const emit = (details?: Record<string, unknown>) => {
    if (typeof window === "undefined") return;

    const event = new CustomEvent("security:event", {
      detail: {
        page: pageKey,
        eventType,
        userId: user?.id,
        timestamp: new Date().toISOString(),
        ...data,
        ...details,
      },
    });

    window.dispatchEvent(event);
    safeLog("info", `security:${eventType}`, {
      page: pageKey,
      ...data,
      ...details,
    });
  };

  return emit;
}

/**
 * Verify page compliance programmatically (for tests)
 * @param pageKey - The page to verify
 * @param implementedControls - Array of controls the page has implemented
 * @returns true if page is compliant, false otherwise
 */
export function verifyPageCompliance(
  pageKey: PageKey,
  implementedControls: string[]
): boolean {
  const audit = auditPageCompliance(pageKey, implementedControls as any);
  return audit.status === "compliant";
}

export type { ComplianceAudit } from "./registry";






