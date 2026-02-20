// src/lib/featureFlags.ts
// Centralized feature flag helpers for client-side rollout behavior.

function flagEnabled(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export function isPostImportTriggersDisabled(): boolean {
  return flagEnabled(import.meta.env.VITE_DISABLE_POST_IMPORT_TRIGGERS);
}

/**
 * Safe-mode sidebar revamp toggle.
 * Defaults OFF when env var is missing.
 */
export function isNavRevampV1Enabled(): boolean {
  return flagEnabled(import.meta.env.VITE_NAV_REVAMP_V1);
}

/**
 * Optional legacy-nav exposure while revamp is enabled.
 * Defaults OFF when env var is missing.
 */
export function isLegacyNavVisible(): boolean {
  return flagEnabled(import.meta.env.VITE_SHOW_LEGACY_NAV);
}

/**
 * Desktop rail quick-action behavior revamp toggle.
 * Defaults OFF when env var is missing.
 */
export function isRailRevampV1Enabled(): boolean {
  return flagEnabled(import.meta.env.VITE_RAIL_REVAMP_V1);
}

/**
 * Prime chat upload narration + stage progress toggle.
 * Supports legacy narration flag for backward compatibility.
 * Defaults OFF when env vars are missing.
 */
export function isPrimeUploadNarrationEnabled(): boolean {
  return (
    flagEnabled(import.meta.env.VITE_PRIME_UPLOAD_NARRATION) ||
    flagEnabled(import.meta.env.VITE_PRIME_NARRATION_FLOW)
  );
}

/**
 * Smart Import operational-dashboard repositioning.
 * Keeps route/pipeline stable while aligning UX copy and CTA behavior.
 * Defaults OFF when env var is missing.
 */
export function isSmartImportOpsDashboardV1Enabled(): boolean {
  return flagEnabled(import.meta.env.VITE_SMART_IMPORT_OPS_DASHBOARD_V1);
}

