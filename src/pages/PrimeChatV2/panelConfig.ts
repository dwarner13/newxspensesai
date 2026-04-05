/**
 * Global panel design tokens — imported by all agent copilot panels.
 * Change a value here and it updates every agent panel automatically.
 */
export const PANEL = {
  // Typography
  messageFontSize: 16,   // readable on all screens, prevents iOS Safari auto-zoom
  inputFontSize: 16,     // MUST stay 16+ — iOS zooms the page on inputs below 16px
  labelFontSize: 12,
  metaFontSize: 10,
  lineHeight: 1.65,

  // Panel dimensions
  panelWidthDesktop: 520,
  panelHeightMobile: "90vh",

  // Spacing
  headerPadding: "20px 24px 16px",
  bodyPadding: "20px 24px 140px",
  inputAreaPadding: "32px 24px 16px",
} as const;
