/**
 * 🛡️ Security Registry
 * 
 * Type-safe mapping of dashboard pages to their implemented security controls.
 * Used for runtime validation, compliance audits, and automated testing.
 * 
 * Each page lists the security controls that MUST be present.
 * Control definitions:
 * - authGate:       useAuth() check; blocks render if !user
 * - rlsBacked:      Supabase RLS enforced on queries (auth.uid() = user_id)
 * - piiMask:        PII masked (client-side via mask-display.ts OR server-side via pii.ts)
 * - safeLog:        Uses safeLog() from guardrail-log.ts; no raw PII in logs
 * - zodValidation:  Input validation with zod schemas
 * - rateLimit:      assertWithinRateLimit() or withRateLimit wrapper applied
 * - consent:        UniversalConsentBanner component displayed
 * - auditLog:       logAuditEntry() called for mutations
 * - moderation:     Input/output filtered via guardrails-production.ts
 * - signedUrls:     File downloads/uploads use signed URLs
 */

export type SecurityControl =
  | "authGate"
  | "rlsBacked"
  | "piiMask"
  | "safeLog"
  | "zodValidation"
  | "rateLimit"
  | "consent"
  | "auditLog"
  | "moderation"
  | "signedUrls";

export type PageKey =
  | "dashboard"
  | "primeChat"
  | "smartImport"
  | "aiChatAssistant"
  | "smartCategories"
  | "transactions"
  | "bankAccounts"
  | "goalConcierge"
  | "automation"
  | "predictions"
  | "debtPlanner"
  | "freedom"
  | "billReminder"
  | "podcast"
  | "story"
  | "therapist"
  | "wellness"
  | "spotify"
  | "taxAssistant"
  | "intel"
  | "analytics"
  | "settings"
  | "reports";

/**
 * Security control requirements per page
 * 
 * Format: List all controls that MUST be present on this page.
 * If a control is missing, the page fails compliance audit.
 * 
 * Usage:
 *   const page = 'dashboard';
 *   const required = SecurityRegistry[page];
 *   // Check: required.includes('consent') ? 'required' : 'optional'
 */
export const SecurityRegistry: Record<PageKey, SecurityControl[]> = {
  // ============================================================================
  // TIER 1: HIGH-RISK (Financial + Personal Data)
  // ============================================================================

  // Main dashboard: summary cards, quick-view analytics
  dashboard: [
    "authGate",     // No guest access
    "piiMask",      // Summary cards may show merchant names
    "safeLog",      // No inline PII in logs
  ],

  // Prime Chat: conversation history, context enrichment
  primeChat: [
    "authGate",     // User must be logged in
    "piiMask",      // Chat content may contain PII
    "safeLog",      // No raw transcripts in logs
    "moderation",   // Input/output filtering
    "rateLimit",    // 20 reqs/min per chat message
    "auditLog",     // All messages saved to audit trail
  ],

  // Smart Import AI: file upload, OCR, parsing
  smartImport: [
    "authGate",     // User must be logged in
    "rlsBacked",    // Imports/transactions scoped by user_id
    "piiMask",      // Memos may contain PII
    "safeLog",      // OCR logs sanitized
    "consent",      // "Byte will scan your document" disclosure
    "auditLog",     // Every import logged
    "signedUrls",   // File uploads via signed URLs
  ],

  // AI Chat Assistant: message-based conversation
  aiChatAssistant: [
    "authGate",     // User must be logged in
    "piiMask",      // Chat content may contain PII
    "safeLog",      // No raw transcripts in logs
    "moderation",   // Input/output filtering
    "rateLimit",    // 20 reqs/min
    "auditLog",     // All messages saved
  ],

  // Smart Categories: tag AI categorization engine
  smartCategories: [
    "authGate",     // User must be logged in
    "rlsBacked",    // Rules scoped by user_id
    "piiMask",      // Merchant names (sensitive)
    "safeLog",      // Categorization logs sanitized
    "zodValidation", // Input validation for rule creation
    "auditLog",     // Rule changes logged
  ],

  // Transactions: main transaction list + export
  transactions: [
    "authGate",     // User must be logged in
    "rlsBacked",    // tx-list-latest uses RLS
    "piiMask",      // Merchant names, memos masked
    "safeLog",      // Safe transaction logging
    "zodValidation", // Query input validated
    "rateLimit",    // 60 reqs/min on list endpoint
    "consent",      // "Transactions may be analyzed by AI" banner
    "auditLog",     // All modifications logged
    "signedUrls",   // CSV export via signed URL
  ],

  // Bank Accounts: connected accounts, Plaid integration
  bankAccounts: [
    "authGate",     // User must be logged in
    "rlsBacked",    // Accounts scoped by user_id
    "piiMask",      // Account numbers masked (••••1234)
    "safeLog",      // No full account numbers in logs
    "rateLimit",    // 60 reqs/min on account update
    "auditLog",     // Account connections logged
  ],

  // ============================================================================
  // TIER 2: MEDIUM-RISK (Goals + Planning)
  // ============================================================================

  // AI Goal Concierge: goal tracking, recommendations
  goalConcierge: [
    "authGate",     // User must be logged in
    "piiMask",      // Goal names may contain sensitive info
    "safeLog",      // Goal details sanitized
    "consent",      // "Prime will help you achieve your goals"
    "auditLog",     // Goal changes logged
  ],

  // Smart Automation: workflow rules, triggers
  automation: [
    "authGate",     // User must be logged in
    "piiMask",      // Workflow names/conditions may leak data
    "safeLog",      // Rule definitions sanitized
    "auditLog",     // Rule changes logged
    "rateLimit",    // 60 reqs/min on rule updates
  ],

  // Spending Predictions: forecast analytics
  predictions: [
    "authGate",     // User must be logged in
    "rlsBacked",    // Forecasts scoped by user_id
    "piiMask",      // Category names visible (acceptable)
    "safeLog",      // Forecast logs sanitized
    "auditLog",     // Forecast model updates logged
  ],

  // Debt Payoff Planner: debt tracking, payoff scenarios
  debtPlanner: [
    "authGate",     // User must be logged in
    "piiMask",      // Creditor names masked
    "safeLog",      // Debt amounts not logged
    "auditLog",     // Debt changes logged
  ],

  // AI Financial Freedom: long-term planning
  freedom: [
    "authGate",     // User must be logged in
    "piiMask",      // Plan details may contain PII
    "safeLog",      // Plan details sanitized
    "auditLog",     // Plan changes logged
  ],

  // Bill Reminder System: bill tracking, payment reminders
  billReminder: [
    "authGate",     // User must be logged in
    "piiMask",      // Payee names masked
    "safeLog",      // Bill amounts not logged
    "auditLog",     // Bill changes logged
    "rateLimit",    // 60 reqs/min on bill updates
  ],

  // ============================================================================
  // TIER 3: CONTENT GENERATION (Podcast, Story, Therapist, Wellness)
  // ============================================================================

  // Personal Podcast: AI-generated podcast episodes
  podcast: [
    "authGate",     // User must be logged in
    "piiMask",      // Episode scripts may contain PII
    "safeLog",      // Script content sanitized
    "auditLog",     // Episode generation logged
    "rateLimit",    // 20 reqs/min for generation
    "signedUrls",   // Audio files via signed URLs
  ],

  // Financial Story: AI-generated narrative
  story: [
    "authGate",     // User must be logged in
    "piiMask",      // Narrative may contain PII
    "safeLog",      // Story content sanitized
    "auditLog",     // Story generation logged
    "rateLimit",    // 20 reqs/min for generation
    "signedUrls",   // Story PDFs via signed URLs
  ],

  // AI Financial Therapist: therapeutic conversation
  therapist: [
    "authGate",     // User must be logged in
    "piiMask",      // Session transcripts may have sensitive data
    "safeLog",      // Transcript content sanitized
    "moderation",   // Extra filtering for therapeutic safety
    "consent",      // "This is an AI, not a substitute for professional help"
    "auditLog",     // All sessions logged (HIPAA-adjacent)
  ],

  // Wellness Studio: health/wellness goals
  wellness: [
    "authGate",     // User must be logged in
    "piiMask",      // Health goals may contain sensitive info
    "safeLog",      // Health data sanitized
    "consent",      // "Health data is processed for wellness insights"
    "auditLog",     // Wellness updates logged
  ],

  // ============================================================================
  // TIER 4: INTEGRATIONS (Spotify, Tax)
  // ============================================================================

  // Spotify Integration: music/podcast streaming data
  spotify: [
    "authGate",     // User must be logged in
    "piiMask",      // Playlist names, user IDs masked
    "safeLog",      // NEVER log OAuth tokens
    "rateLimit",    // 60 reqs/min for API calls
    "auditLog",     // Spotify connections logged
  ],

  // Tax Assistant: tax planning, deductions, filings
  taxAssistant: [
    "authGate",     // User must be logged in
    "rlsBacked",    // Tax data scoped by user_id
    "piiMask",      // Tax ID, SSN, business name masked
    "safeLog",      // NEVER log tax amounts
    "zodValidation", // Tax input validated
    "consent",      // "This is tax information, not advice"
    "auditLog",     // Tax document changes logged (compliance)
  ],

  // ============================================================================
  // TIER 5: ANALYTICS & ADMIN
  // ============================================================================

  // Business Intelligence: analytics dashboards
  intel: [
    "authGate",     // User must be logged in
    "rlsBacked",    // Analytics scoped by user_id
    "piiMask",      // Customer/vendor names masked
    "safeLog",      // Metrics sanitized
    "auditLog",     // BI report generation logged
  ],

  // Analytics: spending analytics, categorization KPIs
  analytics: [
    "authGate",     // User must be logged in
    "piiMask",      // Category/merchant names visible (acceptable)
    "safeLog",      // Analytics logs sanitized
    "auditLog",     // Analytics queries logged
  ],

  // Settings: user preferences, profile
  settings: [
    "authGate",     // User must be logged in
    "piiMask",      // Preferences stored securely
    "safeLog",      // Settings changes sanitized
    "auditLog",     // Preference changes logged
  ],

  // Reports: financial reports, exports
  reports: [
    "authGate",     // User must be logged in
    "piiMask",      // Report content may contain PII
    "safeLog",      // Report generation sanitized
    "auditLog",     // Report exports logged
    "signedUrls",   // PDFs via signed URLs
  ],
};

/**
 * Helper: Get all controls required for a page
 * @param pageKey - The page to audit
 * @returns Array of required security controls
 */
export function getRequiredControls(pageKey: PageKey): SecurityControl[] {
  return SecurityRegistry[pageKey] ?? [];
}

/**
 * Helper: Check if a control is required for a page
 * @param pageKey - The page to check
 * @param control - The control to verify
 * @returns true if control is required for this page
 */
export function isControlRequired(
  pageKey: PageKey,
  control: SecurityControl
): boolean {
  return SecurityRegistry[pageKey]?.includes(control) ?? false;
}

/**
 * Helper: Get pages that require a specific control
 * @param control - The control to search for
 * @returns Array of page keys that require this control
 */
export function getPagesRequiringControl(control: SecurityControl): PageKey[] {
  return (Object.entries(SecurityRegistry) as [PageKey, SecurityControl[]][])
    .filter(([_, controls]) => controls.includes(control))
    .map(([page, _]) => page);
}

/**
 * Helper: Audit a page for missing controls
 * @param pageKey - The page to audit
 * @param implementedControls - Array of controls the page has implemented
 * @returns Object with status, missing, and percentage
 */
export function auditPageCompliance(
  pageKey: PageKey,
  implementedControls: SecurityControl[]
): {
  page: PageKey;
  status: "compliant" | "non-compliant";
  required: SecurityControl[];
  implemented: SecurityControl[];
  missing: SecurityControl[];
  percentage: number;
} {
  const required = getRequiredControls(pageKey);
  const implemented = implementedControls.filter((c) => required.includes(c));
  const missing = required.filter((c) => !implementedControls.includes(c));
  const percentage = (implemented.length / required.length) * 100;

  return {
    page: pageKey,
    status: missing.length === 0 ? "compliant" : "non-compliant",
    required,
    implemented,
    missing,
    percentage,
  };
}

/**
 * Helper: Generate compliance report for all pages
 * @param implementations - Map of page key to implemented controls
 * @returns Compliance report with summary and per-page details
 */
export function generateComplianceReport(implementations: Record<PageKey, SecurityControl[]>) {
  const audits = (Object.keys(SecurityRegistry) as PageKey[]).map((page) =>
    auditPageCompliance(page, implementations[page] ?? [])
  );

  const compliant = audits.filter((a) => a.status === "compliant").length;
  const nonCompliant = audits.filter((a) => a.status === "non-compliant").length;
  const avgPercentage = audits.reduce((sum, a) => sum + a.percentage, 0) / audits.length;

  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalPages: audits.length,
      compliant,
      nonCompliant,
      complianceRate: (compliant / audits.length) * 100,
      avgImplementation: avgPercentage,
    },
    details: audits.sort((a, b) => a.percentage - b.percentage), // Lowest first
    criticalGaps: audits
      .filter((a) => a.percentage < 50)
      .map((a) => ({ page: a.page, missing: a.missing })),
  };
}

/**
 * Helper: Get control metadata for documentation
 */
export const ControlMetadata: Record<
  SecurityControl,
  { name: string; description: string; severity: "critical" | "high" | "medium" | "low" }
> = {
  authGate: {
    name: "Authentication Gate",
    description: "useAuth() check; blocks render if !user",
    severity: "critical",
  },
  rlsBacked: {
    name: "RLS-Backed Queries",
    description: "Supabase RLS enforced (auth.uid() = user_id)",
    severity: "critical",
  },
  piiMask: {
    name: "PII Masking",
    description: "Client-side (mask-display.ts) or server-side (pii.ts) PII redaction",
    severity: "high",
  },
  safeLog: {
    name: "Safe Logging",
    description: "Uses safeLog() from guardrail-log.ts; no raw PII in logs",
    severity: "high",
  },
  zodValidation: {
    name: "Zod Validation",
    description: "Input validation with zod schemas",
    severity: "medium",
  },
  rateLimit: {
    name: "Rate Limiting",
    description: "assertWithinRateLimit() or withRateLimit wrapper on endpoints",
    severity: "high",
  },
  consent: {
    name: "Consent Banner",
    description: "UniversalConsentBanner component displayed",
    severity: "high",
  },
  auditLog: {
    name: "Audit Logging",
    description: "logAuditEntry() called for all mutations",
    severity: "high",
  },
  moderation: {
    name: "Moderation Filters",
    description: "Input/output filtered via guardrails-production.ts",
    severity: "medium",
  },
  signedUrls: {
    name: "Signed URLs",
    description: "File downloads/uploads use signed URLs",
    severity: "high",
  },
};

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ComplianceAudit = ReturnType<typeof auditPageCompliance>;
export type ComplianceReport = ReturnType<typeof generateComplianceReport>;






