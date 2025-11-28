/**
 * Employee Theme Registry
 * 
 * Centralized source of truth for employee-specific styling
 * Used by all workspace overlays to ensure consistent branding
 */

export const employeeThemes = {
  prime: {
    emoji: "👑",
    color: "purple",
    avatarBg: "bg-purple-500/80",
    avatarShadow: "shadow-purple-500/30",
    pill: "border-purple-500/40 bg-purple-500/10 text-purple-100/90",
    sendGradient: "from-purple-500 to-purple-600",
    sendShadow: "shadow-purple-500/30",
    placeholder: "Ask Prime anything…"
  },
  byte: {
    emoji: "📄",
    color: "indigo",
    avatarBg: "bg-indigo-500/80",
    avatarShadow: "shadow-indigo-500/30",
    pill: "border-indigo-500/40 bg-indigo-500/10 text-indigo-100/90",
    sendGradient: "from-indigo-500 to-indigo-600",
    sendShadow: "shadow-indigo-500/30",
    placeholder: "Message Byte…"
  },
  tag: {
    emoji: "🏷️",
    color: "emerald",
    avatarBg: "bg-emerald-500/80",
    avatarShadow: "shadow-emerald-500/30",
    pill: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100/90",
    sendGradient: "from-emerald-500 to-emerald-600",
    sendShadow: "shadow-emerald-500/30",
    placeholder: "Ask Tag about categories…"
  },
  crystal: {
    emoji: "🔮",
    color: "cyan",
    avatarBg: "bg-cyan-500/80",
    avatarShadow: "shadow-cyan-500/30",
    pill: "border-cyan-500/40 bg-cyan-500/10 text-cyan-100/90",
    sendGradient: "from-cyan-500 to-cyan-600",
    sendShadow: "shadow-cyan-500/30",
    placeholder: "Ask Crystal for insights…"
  },
  finley: {
    emoji: "💼",
    color: "blue",
    avatarBg: "bg-blue-500/80",
    avatarShadow: "shadow-blue-500/30",
    pill: "border-blue-500/40 bg-blue-500/10 text-blue-100/90",
    sendGradient: "from-blue-500 to-blue-600",
    sendShadow: "shadow-blue-500/30",
    placeholder: "Ask Finley about forecasting…"
  },
  goalie: {
    emoji: "🥅",
    color: "yellow",
    avatarBg: "bg-yellow-500/80",
    avatarShadow: "shadow-yellow-500/30",
    pill: "border-yellow-500/40 bg-yellow-500/10 text-yellow-100/90",
    sendGradient: "from-yellow-500 to-yellow-600",
    sendShadow: "shadow-yellow-500/30",
    placeholder: "Ask Goalie about goals…"
  },
  liberty: {
    emoji: "🕊️",
    color: "rose",
    avatarBg: "bg-rose-500/80",
    avatarShadow: "shadow-rose-500/30",
    pill: "border-rose-500/40 bg-rose-500/10 text-rose-100/90",
    sendGradient: "from-rose-500 to-rose-600",
    sendShadow: "shadow-rose-500/30",
    placeholder: "Ask Liberty about debt freedom…"
  },
  dash: {
    emoji: "📈",
    color: "blue",
    avatarBg: "bg-blue-500/80",
    avatarShadow: "shadow-blue-500/30",
    pill: "border-blue-500/40 bg-blue-500/10 text-blue-100/90",
    sendGradient: "from-blue-500 to-blue-600",
    sendShadow: "shadow-blue-500/30",
    placeholder: "Ask Dash about analytics…"
  }
} as const;

export type EmployeeThemeKey = keyof typeof employeeThemes;

/**
 * Get employee theme by key
 */
export function getEmployeeTheme(key: EmployeeThemeKey) {
  return employeeThemes[key];
}

/**
 * Get employee theme by slug (maps common slugs to theme keys)
 */
export function getEmployeeThemeBySlug(slug: string): typeof employeeThemes[keyof typeof employeeThemes] | null {
  const slugToKey: Record<string, EmployeeThemeKey> = {
    'prime-boss': 'prime',
    'prime-ai': 'prime',
    'byte-docs': 'byte',
    'byte-doc': 'byte',
    'byte-ai': 'byte',
    'tag-ai': 'tag',
    'crystal-ai': 'crystal',
    'crystal-analytics': 'crystal',
    'finley-ai': 'finley',
    'finley-financial': 'finley',
    'goalie-ai': 'goalie',
    'goalie-goals': 'goalie',
    'liberty-ai': 'liberty',
    'liberty-freedom': 'liberty',
    'dash': 'dash',
  };

  const normalizedSlug = slug.toLowerCase().trim();
  const key = slugToKey[normalizedSlug];
  
  if (key && key in employeeThemes) {
    return employeeThemes[key];
  }
  
  return null;
}

