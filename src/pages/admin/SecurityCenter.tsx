/**
 * 🔐 Security Center Dashboard
 *
 * Purpose:
 * - Real-time security posture monitoring
 * - Compliance scoring & trend visualization
 * - Gap detection & risk prioritization
 * - RLS policy validation
 * - Audit log analytics
 * - Incident response helpers
 *
 * Features:
 * - Live compliance rate (0-100%)
 * - Per-page security status (23 pages)
 * - Control implementation tracking
 * - RLS policy snapshot
 * - Gap recommendations
 * - Performance metrics
 * - Export compliance reports
 * - Alert indicators
 */

import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Download,
  Clock,
  Shield,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface PageSecurityStatus {
  page: string;
  required: string[];
  implemented: string[];
  missing: string[];
  count: {
    required: number;
    implemented: number;
    missing: number;
  };
  compliance: number;
  riskLevel: "critical" | "high" | "medium" | "low";
  checks: any[];
}

interface SecurityStatusData {
  ok: boolean;
  version: string;
  timestamp: string;
  pages: PageSecurityStatus[];
  summary: {
    totalPages: number;
    compliant: number;
    nonCompliant: number;
    complianceRate: number;
    avgCompliance: number;
    criticalGaps: number;
    highRiskPages: string[];
  };
  rls: {
    enabled: boolean;
    policiesCount: number;
    issues: string[];
  };
  metrics: {
    avgControlsPerPage: number;
    totalControlsRequired: number;
    totalControlsImplemented: number;
  };
  recommendations: string[];
  lastStatusCheck: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get color for compliance score
 */
function getComplianceColor(compliance: number): string {
  if (compliance >= 90) return "text-green-700";
  if (compliance >= 70) return "text-yellow-700";
  if (compliance >= 50) return "text-orange-700";
  return "text-red-700";
}

/**
 * Get background color for compliance score
 */
function getComplianceBg(compliance: number): string {
  if (compliance >= 90) return "bg-green-50 border-green-200";
  if (compliance >= 70) return "bg-yellow-50 border-yellow-200";
  if (compliance >= 50) return "bg-orange-50 border-orange-200";
  return "bg-red-50 border-red-200";
}

/**
 * Get risk level badge color
 */
function getRiskLevelBadge(
  riskLevel: string
): [string, string] {
  switch (riskLevel) {
    case "critical":
      return ["bg-red-100 text-red-800", "🚨"];
    case "high":
      return ["bg-orange-100 text-orange-800", "⚠️"];
    case "medium":
      return ["bg-yellow-100 text-yellow-800", "⚡"];
    default:
      return ["bg-green-100 text-green-800", "✅"];
  }
}

/**
 * Format compliance timestamp
 */
function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString();
}

/**
 * Export report as CSV
 */
function exportReport(data: SecurityStatusData): void {
  const rows = [
    ["Security Compliance Report"],
    [`Generated: ${new Date(data.timestamp).toLocaleString()}`],
    [],
    ["Summary"],
    [
      "Total Pages",
      "Compliant",
      "Non-Compliant",
      "Compliance Rate",
      "Avg Compliance",
      "Critical Gaps",
    ],
    [
      data.summary.totalPages,
      data.summary.compliant,
      data.summary.nonCompliant,
      `${data.summary.complianceRate}%`,
      `${data.summary.avgCompliance}%`,
      data.summary.criticalGaps,
    ],
    [],
    ["Per-Page Compliance"],
    ["Page", "Required", "Implemented", "Missing", "Compliance %", "Risk Level"],
    ...data.pages.map((p) => [
      p.page,
      p.count.required,
      p.count.implemented,
      p.count.missing,
      p.compliance,
      p.riskLevel,
    ]),
  ];

  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `security-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SecurityCenter() {
  const [data, setData] = useState<SecurityStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // ========== Fetch security status ==========
  const runCheck = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/.netlify/functions/security-status");

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = (await res.json()) as SecurityStatusData;
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to fetch security status: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  // ========== Auto-refresh effect ==========
  useEffect(() => {
    runCheck();

    if (!autoRefresh) return;

    const interval = setInterval(runCheck, 60000); // Every 60 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (!data && !error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600">Loading security status...</p>
        </div>
      </div>
    );
  }

  // ========== Render ==========
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Security Center</h1>
            <p className="text-sm text-slate-600 mt-1">
              Real-time compliance monitoring & security posture dashboard
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                autoRefresh
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-slate-200 text-slate-800 hover:bg-slate-300"
              }`}
              title="Auto-refresh every 60 seconds"
            >
              <RefreshCw size={16} />
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </button>

            <button
              onClick={runCheck}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm transition-colors"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              {loading ? "Checking…" : "Run Check"}
            </button>

            {data && (
              <button
                onClick={() => exportReport(data)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 font-medium text-sm transition-colors"
                title="Export as CSV"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {data?.ok && (
          <>
            {/* Summary Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Compliance Rate */}
              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">
                      Compliance Rate
                    </p>
                    <p className={`text-3xl font-bold mt-1 ${getComplianceColor(data.summary.complianceRate)}`}>
                      {data.summary.complianceRate}%
                    </p>
                  </div>
                  <div className="text-4xl">
                    {data.summary.complianceRate >= 90 ? "✅" : data.summary.complianceRate >= 70 ? "⚡" : "🚨"}
                  </div>
                </div>
              </div>

              {/* Avg Compliance */}
              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">
                  Avg per Page
                </p>
                <p className={`text-3xl font-bold mt-1 ${getComplianceColor(data.summary.avgCompliance)}`}>
                  {data.summary.avgCompliance}%
                </p>
                <p className="text-xs text-slate-600 mt-2">
                  {data.summary.compliant} compliant, {data.summary.nonCompliant} gaps
                </p>
              </div>

              {/* Critical Gaps */}
              <div className={`rounded-lg border p-4 shadow-sm ${data.summary.criticalGaps > 0 ? "bg-red-50 border-red-200" : "bg-white"}`}>
                <p className={`text-xs font-medium uppercase tracking-wide ${data.summary.criticalGaps > 0 ? "text-red-700" : "text-slate-600"}`}>
                  Critical Gaps
                </p>
                <p className={`text-3xl font-bold mt-1 ${data.summary.criticalGaps > 0 ? "text-red-700" : "text-slate-700"}`}>
                  {data.summary.criticalGaps}
                </p>
              </div>

              {/* Last Check */}
              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">
                  Last Checked
                </p>
                <p className="text-sm font-mono text-slate-700 mt-1">
                  {formatTime(data.lastStatusCheck)}
                </p>
                <p className="text-xs text-slate-500 mt-2">v{data.version}</p>
              </div>
            </div>

            {/* RLS Status */}
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">Database Security (RLS)</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {data.rls.enabled
                      ? `✅ RLS enabled with ${data.rls.policiesCount} active policies`
                      : "❌ RLS not properly configured"}
                  </p>
                </div>
                <div className="text-3xl">
                  {data.rls.enabled ? "🔒" : "⚠️"}
                </div>
              </div>

              {data.rls.issues.length > 0 && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  {data.rls.issues.map((issue, i) => (
                    <p key={i} className="text-sm text-red-700 flex items-start gap-2">
                      <span className="flex-shrink-0">•</span>
                      <span>{issue}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Recommendations */}
            {data.recommendations.length > 0 && (
              <div className="rounded-lg border bg-blue-50 border-blue-200 p-4 shadow-sm">
                <h3 className="font-semibold text-blue-900 mb-3">📋 Recommendations</h3>
                <ul className="space-y-2">
                  {data.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                      <span className="flex-shrink-0 text-base">→</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Per-Page Security Status */}
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4">Security by Page (23 Pages)</h3>

              <div className="grid gap-3">
                {data.pages.map((page) => {
                  const [badgeBg, icon] = getRiskLevelBadge(page.riskLevel);

                  return (
                    <div
                      key={page.page}
                      className={`rounded-lg border p-3 transition-colors ${getComplianceBg(page.compliance)}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-slate-900">
                              {page.page}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeBg}`}>
                              {icon} {page.riskLevel}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
                            <span>
                              <strong className="text-slate-900">{page.implemented}</strong>/{page.required} controls
                            </span>
                            {page.missing.length > 0 && (
                              <span className="text-red-700">
                                Missing: {page.missing.join(", ")}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className={`text-lg font-bold ${getComplianceColor(page.compliance)}`}>
                            {page.compliance}%
                          </div>
                          <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full transition-all ${
                                page.compliance >= 90
                                  ? "bg-green-500"
                                  : page.compliance >= 70
                                    ? "bg-yellow-500"
                                    : page.compliance >= 50
                                      ? "bg-orange-500"
                                      : "bg-red-500"
                              }`}
                              style={{ width: `${page.compliance}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Metrics */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">
                  Avg Controls/Page
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {data.metrics.avgControlsPerPage.toFixed(1)}
                </p>
              </div>

              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">
                  Total Required
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {data.metrics.totalControlsRequired}
                </p>
              </div>

              <div className="rounded-lg border bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">
                  Implemented
                </p>
                <p className="text-2xl font-bold text-green-700 mt-1">
                  {data.metrics.totalControlsImplemented}
                </p>
                <p className="text-xs text-slate-600 mt-2">
                  {Math.round((data.metrics.totalControlsImplemented / data.metrics.totalControlsRequired) * 100)}% coverage
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-slate-600 py-4 border-t">
              <p>Last updated {formatTime(data.lastStatusCheck)}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}





