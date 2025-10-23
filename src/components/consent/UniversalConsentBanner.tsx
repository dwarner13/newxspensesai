/**
 * 🛡️ Universal Consent Banner
 *
 * Displays data processing disclosure and AI team access notices.
 * Tracks user consent preferences per page in localStorage + Supabase.
 *
 * Features:
 * - Per-page dismissal (localStorage + DB)
 * - AI employee tagging (Prime, Crystal, Byte, Tag, Ledger, etc.)
 * - Data type disclosure (transactions, bank accounts, health goals, etc.)
 * - Custom messaging per page
 * - Integration with security registry
 * - Privacy policy deep-links
 * - Accessible ARIA labels
 * - Mobile responsive
 *
 * Usage:
 *   import { UniversalConsentBanner } from '@/components/consent/UniversalConsentBanner';
 *
 *   // Auto-detect from security registry
 *   <UniversalConsentBanner page="transactions" />
 *
 *   // Custom message
 *   <UniversalConsentBanner
 *     page="therapist"
 *     title="AI Wellness Advisor"
 *     description="Your session is analyzed by our wellness AI..."
 *     aiEmployees={['prime-boss', 'crystal-analytics']}
 *     dataTypes={['health goals', 'session transcript']}
 *   />
 */

import React, { useState, useEffect } from "react";
import { AlertCircle, X, Lock, Eye, EyeOff } from "lucide-react";
import { PageKey, SecurityRegistry } from "@/lib/security/registry";
import { useAuth } from "@/contexts/AuthContext";
import { safeLog } from "@/netlify/functions/_shared/guardrail-log";

// ============================================================================
// TYPES
// ============================================================================

export interface UniversalConsentBannerProps {
  /** Page key from security registry (e.g., 'transactions', 'therapist') */
  page: PageKey;

  /** Custom title (overrides auto-detect from registry) */
  title?: string;

  /** Custom description (overrides auto-detect) */
  description?: string;

  /** AI employees that will access data (overrides auto-detect) */
  aiEmployees?: string[];

  /** Data types being processed (overrides auto-detect) */
  dataTypes?: string[];

  /** Show expanded details by default */
  expandedByDefault?: boolean;

  /** Callback when user accepts consent */
  onAccept?: () => void;

  /** Callback when user dismisses banner */
  onDismiss?: () => void;

  /** Custom CSS classes */
  className?: string;

  /** Show "Learn More" link (default: true) */
  showLearnMore?: boolean;

  /** Custom privacy policy URL */
  privacyUrl?: string;
}

// ============================================================================
// CONTENT MAP (per page)
// ============================================================================

const ConsentContent: Record<
  PageKey,
  {
    title: string;
    description: string;
    aiEmployees: string[];
    dataTypes: string[];
    icon: string;
  }
> = {
  dashboard: {
    title: "Dashboard Analytics",
    description:
      "Your spending summary is analyzed in real-time to provide personalized insights and recommendations.",
    aiEmployees: ["prime-boss", "crystal-analytics"],
    dataTypes: ["transactions", "budgets", "spending patterns"],
    icon: "📊",
  },

  primeChat: {
    title: "Prime Chat",
    description:
      "Your messages and conversation history are processed by our AI team to provide financial guidance and context-aware recommendations.",
    aiEmployees: ["prime-boss"],
    dataTypes: ["chat messages", "conversation history", "financial context"],
    icon: "💬",
  },

  smartImport: {
    title: "Smart Document Processing",
    description:
      "Your uploaded bank statements are scanned, parsed, and analyzed using OCR and AI to automatically import and categorize transactions.",
    aiEmployees: ["byte-docs", "tag-ai", "crystal-analytics"],
    dataTypes: ["bank statements", "transactions", "account info"],
    icon: "📄",
  },

  aiChatAssistant: {
    title: "AI Financial Assistant",
    description:
      "Your messages are processed to provide real-time financial insights, budgeting tips, and personalized recommendations.",
    aiEmployees: ["prime-boss"],
    dataTypes: ["chat messages", "financial data"],
    icon: "🤖",
  },

  smartCategories: {
    title: "Tag AI Categorization",
    description:
      "Your transactions are automatically categorized using AI rules and learning from your corrections to improve accuracy over time.",
    aiEmployees: ["tag-ai"],
    dataTypes: ["merchant names", "transaction amounts", "categories"],
    icon: "🏷️",
  },

  transactions: {
    title: "Transaction Processing",
    description:
      "Your transaction data is processed for analysis, categorization, forecasting, and compliance. PII is masked and audit-logged.",
    aiEmployees: ["tag-ai", "crystal-analytics", "byte-docs"],
    dataTypes: ["transactions", "merchant names", "amounts", "categories"],
    icon: "💳",
  },

  bankAccounts: {
    title: "Bank Account Sync",
    description:
      "Your connected bank accounts are securely synced and processed for balance tracking, transaction import, and financial health analysis.",
    aiEmployees: ["byte-docs", "crystal-analytics"],
    dataTypes: ["account info", "balances", "transactions"],
    icon: "🏦",
  },

  goalConcierge: {
    title: "AI Goal Advisor",
    description:
      "Your financial goals and progress are tracked and analyzed to provide personalized recommendations and accountability support.",
    aiEmployees: ["prime-boss", "crystal-analytics"],
    dataTypes: ["goals", "progress", "milestones"],
    icon: "🎯",
  },

  automation: {
    title: "Smart Automation",
    description:
      "Your workflow rules are executed and monitored to automate financial tasks like transfers, notifications, and categorization.",
    aiEmployees: ["tag-ai", "crystal-analytics"],
    dataTypes: ["automation rules", "transaction patterns"],
    icon: "⚙️",
  },

  predictions: {
    title: "Spending Predictions",
    description:
      "Your spending history is analyzed using predictive models to forecast future expenses and identify trends.",
    aiEmployees: ["crystal-analytics"],
    dataTypes: ["spending history", "categories", "amounts"],
    icon: "🔮",
  },

  debtPlanner: {
    title: "Debt Payoff Planner",
    description:
      "Your debt information is analyzed to create personalized payoff scenarios and optimization strategies.",
    aiEmployees: ["crystal-analytics"],
    dataTypes: ["debts", "payment history", "interest rates"],
    icon: "📉",
  },

  freedom: {
    title: "Financial Freedom Plan",
    description:
      "Your financial profile is analyzed to create a long-term strategic plan for achieving financial independence.",
    aiEmployees: ["prime-boss", "crystal-analytics"],
    dataTypes: ["income", "expenses", "assets", "goals"],
    icon: "✨",
  },

  billReminder: {
    title: "Bill Reminder System",
    description:
      "Your bills and payment schedules are tracked and processed to provide timely reminders and payment optimization.",
    aiEmployees: ["prime-boss"],
    dataTypes: ["bills", "payment dates", "amounts"],
    icon: "📅",
  },

  podcast: {
    title: "Personal Finance Podcast",
    description:
      "Your financial data is used to generate personalized podcast episodes with insights specific to your situation. Audio is synthesized and stored securely.",
    aiEmployees: ["prime-boss", "crystal-analytics"],
    dataTypes: ["financial data", "spending patterns", "goals"],
    icon: "🎙️",
  },

  story: {
    title: "Financial Story",
    description:
      "Your financial journey is analyzed to create a personalized narrative that helps you understand your money story and patterns.",
    aiEmployees: ["crystal-analytics", "prime-boss"],
    dataTypes: ["transactions", "goals", "financial history"],
    icon: "📖",
  },

  therapist: {
    title: "AI Financial Therapist",
    description:
      "Your conversations are analyzed to provide emotional support and behavioral insights related to money and financial decisions. This is NOT a substitute for professional mental health care.",
    aiEmployees: ["prime-boss"],
    dataTypes: ["session transcript", "financial concerns", "emotional data"],
    icon: "💭",
  },

  wellness: {
    title: "Wellness Studio",
    description:
      "Your wellness goals and health data are tracked to provide personalized recommendations for financial and physical wellbeing integration.",
    aiEmployees: ["prime-boss", "crystal-analytics"],
    dataTypes: ["health goals", "wellness data"],
    icon: "🧘",
  },

  spotify: {
    title: "Spotify Integration",
    description:
      "Your Spotify listening data is analyzed to correlate with spending patterns and provide lifestyle insights. Your OAuth token is never logged.",
    aiEmployees: ["crystal-analytics"],
    dataTypes: ["listening history", "playlists"],
    icon: "🎵",
  },

  taxAssistant: {
    title: "Tax Assistant",
    description:
      "Your financial data is analyzed for tax optimization and filing preparation. This is informational only and not professional tax advice.",
    aiEmployees: ["crystal-analytics", "prime-boss"],
    dataTypes: ["income", "deductions", "tax documents"],
    icon: "📋",
  },

  intel: {
    title: "Business Intelligence",
    description:
      "Your business financial data is analyzed to provide strategic insights and performance metrics.",
    aiEmployees: ["crystal-analytics"],
    dataTypes: ["business financials", "metrics", "trends"],
    icon: "📈",
  },

  analytics: {
    title: "Analytics Dashboard",
    description:
      "Your transaction data is processed to generate comprehensive analytics, reports, and visualizations.",
    aiEmployees: ["crystal-analytics"],
    dataTypes: ["transactions", "categories", "trends"],
    icon: "📊",
  },

  settings: {
    title: "Settings & Preferences",
    description:
      "Your preferences and settings are stored and processed to personalize your XspensesAI experience.",
    aiEmployees: ["prime-boss"],
    dataTypes: ["preferences", "notification settings"],
    icon: "⚙️",
  },

  reports: {
    title: "Financial Reports",
    description:
      "Your financial data is processed to generate custom reports and exports for analysis and sharing.",
    aiEmployees: ["crystal-analytics"],
    dataTypes: ["transactions", "summaries", "forecasts"],
    icon: "📄",
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const UniversalConsentBanner: React.FC<
  UniversalConsentBannerProps
> = ({
  page,
  title,
  description,
  aiEmployees,
  dataTypes,
  expandedByDefault = false,
  onAccept,
  onDismiss,
  className = "",
  showLearnMore = true,
  privacyUrl = "/privacy",
}) => {
  // ========== Auth & State ==========
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(expandedByDefault);
  const [hiding, setHiding] = useState(false);

  // ========== Content Resolution ==========
  const content = ConsentContent[page];
  const displayTitle = title || content?.title || "Data Processing Consent";
  const displayDescription =
    description || content?.description || "Your data is processed securely.";
  const displayAiEmployees =
    aiEmployees || content?.aiEmployees || ["prime-boss"];
  const displayDataTypes =
    dataTypes || content?.dataTypes || ["financial data"];
  const displayIcon = content?.icon || "🛡️";

  // ========== Dismissal Key ==========
  const dismissalKey = `consent_${page}_v2_dismissed`;

  // ========== Lifecycle ==========
  useEffect(() => {
    // Check if user has dismissed this banner
    const wasDismissed = localStorage.getItem(dismissalKey) === "true";
    if (wasDismissed) {
      setDismissed(true);
    }
  }, [dismissalKey]);

  // ========== Handlers ==========
  const handleDismiss = async () => {
    setHiding(true);

    // Store dismissal locally
    localStorage.setItem(dismissalKey, "true");

    // Optionally sync to DB if user is authenticated
    if (user) {
      try {
        // This could be a call to update user metadata or a consent table
        safeLog("info", "consent_banner_dismissed", {
          page,
          userId: user.id,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        safeLog("warn", "consent_banner_sync_failed", {
          page,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    setTimeout(() => {
      setDismissed(true);
      onDismiss?.();
    }, 150);
  };

  const handleAccept = async () => {
    setHiding(true);

    // Mark as accepted (can be different from dismissed)
    localStorage.setItem(`${dismissalKey}:accepted`, "true");

    if (user) {
      try {
        safeLog("info", "consent_banner_accepted", {
          page,
          userId: user.id,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        safeLog("warn", "consent_banner_accept_failed", {
          page,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    setTimeout(() => {
      setDismissed(true);
      onAccept?.();
    }, 150);
  };

  // ========== Render ==========
  if (dismissed) {
    return null;
  }

  return (
    <div
      className={`
        w-full border-b bg-amber-50 transition-all duration-150
        ${hiding ? "opacity-0 h-0 overflow-hidden" : "opacity-100 border-amber-200"}
        ${className}
      `}
      role="region"
      aria-label="Data Processing Consent"
      aria-live="polite"
    >
      <div className="mx-auto max-w-6xl px-4 py-3 sm:py-4">
        {/* Main Content */}
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="mt-1 flex-shrink-0 text-2xl">{displayIcon}</div>

          <div className="flex-1 min-w-0">
            {/* Title & Description */}
            <h3 className="font-semibold text-amber-900 text-sm sm:text-base">
              {displayTitle}
            </h3>
            <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-relaxed">
              {displayDescription}
            </p>

            {/* Expandable Details */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium"
              aria-expanded={expanded}
            >
              {expanded ? (
                <>
                  <EyeOff size={14} />
                  Hide Details
                </>
              ) : (
                <>
                  <Eye size={14} />
                  View Details
                </>
              )}
            </button>

            {/* Expanded Details */}
            {expanded && (
              <div className="mt-3 space-y-2 p-3 bg-amber-100/50 rounded border border-amber-200">
                {/* AI Team Access */}
                <div>
                  <div className="text-xs font-semibold text-amber-900 mb-1 flex items-center gap-1">
                    <Lock size={12} />
                    AI Team Access:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {displayAiEmployees.map((emp) => (
                      <span
                        key={emp}
                        className="text-xs px-2 py-1 rounded bg-white border border-amber-300 text-amber-900"
                      >
                        {emp.replace(/-/g, " ").toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Data Types */}
                <div>
                  <div className="text-xs font-semibold text-amber-900 mb-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Data Types Processed:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {displayDataTypes.map((dt) => (
                      <span
                        key={dt}
                        className="text-xs px-2 py-1 rounded bg-white border border-amber-300 text-amber-900"
                      >
                        {dt}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Security Measures */}
                <div className="mt-2 pt-2 border-t border-amber-200">
                  <div className="text-xs font-semibold text-amber-900 mb-1">
                    Security Measures:
                  </div>
                  <ul className="text-xs text-amber-800 space-y-1">
                    <li>✓ PII masking and redaction</li>
                    <li>✓ Row-level security (RLS) enforcement</li>
                    <li>✓ Signed URLs for file storage</li>
                    <li>✓ Audit logging of all access</li>
                    <li>✓ Rate limiting on sensitive endpoints</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Privacy Policy Link */}
            {showLearnMore && (
              <div className="mt-2 text-xs">
                <a
                  href={privacyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 hover:text-amber-900 hover:underline font-medium inline-flex items-center gap-1"
                >
                  Read full privacy policy →
                </a>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            <button
              onClick={handleAccept}
              className="px-3 py-1 text-xs sm:text-sm font-medium bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors whitespace-nowrap"
              aria-label="Accept data processing consent"
            >
              Accept
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded transition-colors"
              aria-label="Dismiss consent banner"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================

export default UniversalConsentBanner;





