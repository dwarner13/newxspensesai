/**
 * Employee Control Panel Component
 * 
 * Slide-in/slide-up panel that shows employee details, quick actions, and metrics.
 * Appears when clicking an employee card in Prime Workspace.
 * 
 * Features:
 * - Employee overview (avatar, name, role, status)
 * - Online/Offline indicator
 * - Last task / Current task
 * - Success rate
 * - Quick Actions (dynamic per employee)
 * - Mini Dashboard Metrics
 * - "Open Full Workspace" button
 */

import React, { useEffect } from 'react';
import { X, ExternalLink, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getEmployeeInfo } from '../../utils/employeeUtils';
import { getEmployeeActions, getEmployeeRoute, type EmployeeAction } from '../../data/employeeActions';
import { usePrimeLiveStats } from '../../hooks/usePrimeLiveStats';

export interface PrimeEmployee {
  slug: string;
  name: string;
  role: string;
  icon?: string;
  status?: 'online' | 'idle' | 'offline';
  lastActivityAt?: string | null;
}

interface EmployeeControlPanelProps {
  employee: PrimeEmployee | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Get mini dashboard metrics for an employee
 * Placeholder data - will be replaced with real API calls later
 */
function getEmployeeMetrics(slug: string): Array<{ label: string; value: string | number }> {
  const normalizedSlug = slug.toLowerCase().trim();
  const baseSlug = normalizedSlug.split('-')[0];

  switch (baseSlug) {
    case 'byte':
      return [
        { label: 'Files Processed Today', value: 12 },
        { label: 'Success Rate', value: '99%' },
        { label: 'Queue', value: '0 pending' },
      ];
    case 'tag':
      return [
        { label: '% Categorized', value: '94%' },
        { label: 'Auto-Rate', value: '87%' },
        { label: 'Pending Review', value: 3 },
      ];
    case 'blitz':
      return [
        { label: 'Interest Saved', value: '$1,250' },
        { label: 'Debt Remaining', value: '$12,400' },
        { label: 'Payoff Date', value: 'Jun 2026' },
      ];
    case 'crystal':
      return [
        { label: 'Anomalies Detected', value: 2 },
        { label: 'Insights Generated', value: 8 },
        { label: 'Trends Identified', value: 5 },
      ];
    case 'finley':
      return [
        { label: 'Forecasts Generated', value: 3 },
        { label: 'Wealth Projection', value: '+12%' },
        { label: 'Goals Tracked', value: 5 },
      ];
    case 'chime':
      return [
        { label: 'Upcoming Bills', value: 3 },
        { label: 'Reminders Set', value: 8 },
        { label: 'On-Time Rate', value: '100%' },
      ];
    default:
      return [
        { label: 'Tasks Completed', value: 0 },
        { label: 'Success Rate', value: 'N/A' },
      ];
  }
}

/**
 * Handle action click - placeholder for now
 */
function handleActionClick(action: string, employeeSlug: string) {
  console.log(`[EmployeeControlPanel] Action clicked: ${action} for ${employeeSlug}`);
  // TODO: Implement action handlers
  // - openSmartImport: navigate to /dashboard/smart-import-ai
  // - fixCategories: navigate to /dashboard/smart-categories
  // - etc.
}

export const EmployeeControlPanel: React.FC<EmployeeControlPanelProps> = ({
  employee,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const { data: liveStats } = usePrimeLiveStats();

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!employee) return null;

  const employeeInfo = getEmployeeInfo(employee.slug);
  const actions = getEmployeeActions(employee.slug);
  const metrics = getEmployeeMetrics(employee.slug);
  const route = getEmployeeRoute(employee.slug);

  // Get employee status from liveStats or fallback
  const liveEmployee = liveStats?.employees.find(e => e.slug === employee.slug);
  const status = liveEmployee?.status || employee.status || 'offline';
  const isOnline = status === 'online';
  const isIdle = status === 'idle';
  const lastActivity = liveEmployee?.lastActivityAt || employee.lastActivityAt;

  // Format last activity time
  const formatLastActivity = (isoString: string | null | undefined): string => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        className={`
          fixed z-[9999] bg-slate-900 border-l border-slate-800
          flex flex-col
          transition-all duration-300 ease-out
          ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}
          
          /* Desktop: slide from right, positioned to not overlap center chat column */
          /* Right edge aligns with right edge of viewport, but we'll adjust if needed */
          md:w-[420px] md:right-0 md:top-0 md:h-full md:shadow-2xl
          
          /* Mobile: slide up from bottom, full width */
          w-full h-[85vh] bottom-0 rounded-t-2xl border-t border-l-0 border-r-0 border-b-0
        `}
        style={{
          /* On desktop, ensure panel doesn't overlap center column (42% of viewport) */
          /* Panel slides from right, so it naturally appears to the left of Activity Feed */
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-panel-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 flex-shrink-0">
          <h2 id="employee-panel-title" className="text-lg font-semibold text-white">
            Employee Control
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Employee Overview */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center text-3xl flex-shrink-0">
                {employee.icon || employeeInfo.emoji}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-white mb-1">{employee.name}</h3>
                <p className="text-sm text-slate-400 mb-3">{employee.role || employeeInfo.role}</p>

                {/* Status Indicator */}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isOnline
                        ? 'bg-green-400 animate-pulse'
                        : isIdle
                        ? 'bg-slate-500'
                        : 'bg-slate-600'
                    }`}
                  />
                  <span
                    className={`text-xs font-medium ${
                      isOnline
                        ? 'text-green-400'
                        : isIdle
                        ? 'text-slate-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {isOnline ? 'Online' : isIdle ? 'Idle' : 'Offline'}
                  </span>
                  {lastActivity && (
                    <span className="text-xs text-slate-500">
                      • {formatLastActivity(lastActivity)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Last Task / Current Task */}
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400">Last Task:</span>
                <span className="text-white">Processed 24 transactions</span>
              </div>
              {isOnline && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-slate-400">Current:</span>
                  <span className="text-white">Categorizing transactions...</span>
                </div>
              )}
            </div>

            {/* Success Rate */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Success Rate</span>
                <span className="text-lg font-bold text-green-400">99%</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          {actions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                Quick Actions
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {actions.map((action: EmployeeAction, index: number) => (
                  <button
                    key={index}
                    onClick={() => handleActionClick(action.action, employee.slug)}
                    className="flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors text-left group"
                  >
                    {action.icon && (
                      <span className="text-xl flex-shrink-0">{action.icon}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white group-hover:text-slate-100">
                        {action.label}
                      </div>
                      {action.description && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          {action.description}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mini Dashboard Metrics */}
          {metrics.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                Metrics
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {metrics.map((metric, index) => (
                  <div
                    key={index}
                    className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50"
                  >
                    <div className="text-xs text-slate-400 mb-1">{metric.label}</div>
                    <div className="text-lg font-bold text-white">
                      {typeof metric.value === 'number'
                        ? metric.value.toLocaleString()
                        : metric.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex-shrink-0 space-y-3">
          <button
            onClick={() => {
              navigate(route);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open Full Workspace
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};

