/**
 * Dashboard Theme Tokens
 * 
 * Centralized design tokens for the MultipurposeThemes-style dark analytics dashboard
 * These values can be used directly in components or mapped to Tailwind classes
 */

export const dashboardTheme = {
  colors: {
    background: {
      primary: '#0b1220',      // Deep navy (darker than current #0f172a)
      secondary: '#1e293b',    // Slate-800 for surfaces
      tertiary: '#334155',     // Slate-700 for elevated cards
    },
    surface: {
      card: 'rgba(255, 255, 255, 0.05)',      // Current bg-white/5
      cardHover: 'rgba(255, 255, 255, 0.1)',  // Current bg-white/10
      cardElevated: 'rgba(255, 255, 255, 0.08)', // Slightly elevated cards
      border: 'rgba(255, 255, 255, 0.1)',     // Current border-white/10
      borderSubtle: 'rgba(255, 255, 255, 0.05)', // Subtle borders
    },
    text: {
      primary: '#ffffff',                      // White headings
      secondary: 'rgba(255, 255, 255, 0.9)',   // White/90 for emphasis
      tertiary: 'rgba(255, 255, 255, 0.7)',    // White/70 for body
      muted: 'rgba(255, 255, 255, 0.6)',       // White/60 for labels
    },
    accent: {
      primary: '#3b82f6',       // Blue-500
      secondary: '#8b5cf6',     // Purple-500
      teal: '#14b8a6',          // Teal-500
      cyan: '#06b6d4',          // Cyan-500
      gradient: 'from-blue-500 via-indigo-500 to-purple-500',
      gradientTeal: 'from-teal-500 via-cyan-500 to-blue-500',
    },
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  spacing: {
    card: {
      padding: '1rem',        // p-4
      gap: '1.5rem',          // gap-6
    },
    section: {
      gap: '2rem',            // space-y-8
      padding: '1.5rem',      // p-6
    },
  },
  radius: {
    card: '1rem',             // rounded-2xl
    button: '0.75rem',        // rounded-xl
    floating: '9999px',        // rounded-full
  },
  shadows: {
    card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    cardHover: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    floating: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
} as const;

/**
 * Helper function to get Tailwind-compatible class names from theme tokens
 */
export const getThemeClasses = {
  background: {
    primary: 'bg-[#0b1220]',
    secondary: 'bg-[#1e293b]',
    tertiary: 'bg-[#334155]',
  },
  surface: {
    card: 'bg-white/5',
    cardHover: 'bg-white/10',
    cardElevated: 'bg-white/8',
    border: 'border-white/10',
    borderSubtle: 'border-white/5',
  },
  text: {
    primary: 'text-white',
    secondary: 'text-white/90',
    tertiary: 'text-white/70',
    muted: 'text-white/60',
  },
  accent: {
    primary: 'text-blue-500',
    secondary: 'text-purple-500',
    gradient: 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500',
  },
};












