/**
 * Temporal Context Helper
 *
 * Provides deterministic, timezone-aware temporal context for Prime
 * and other employees. Uses trusted server time + stored user timezone.
 *
 * Security/database timestamps remain UTC — this only affects
 * financial period boundaries and user-facing date display.
 */

// ── Types ──────────────────────────────────────────────────────────

export interface TemporalContext {
  /** Server UTC ISO timestamp */
  serverUtcNow: string;
  /** User's stored IANA timezone (e.g. "America/Edmonton") or null */
  userTimezone: string | null;
  /** User-local date string YYYY-MM-DD */
  localDate: string;
  /** User-local time string HH:MM (24h) */
  localTime: string;
  /** User-local day of week (e.g. "Saturday") */
  localDayOfWeek: string;
  /** Current local month start YYYY-MM-DD */
  currentMonthStart: string;
  /** Current local month end YYYY-MM-DD */
  currentMonthEnd: string;
  /** Previous local month start YYYY-MM-DD */
  previousMonthStart: string;
  /** Previous local month end YYYY-MM-DD */
  previousMonthEnd: string;
  /** Current local week start YYYY-MM-DD (Monday) */
  currentWeekStart: string;
  /** Current local week end YYYY-MM-DD (Sunday) */
  currentWeekEnd: string;
}

export interface RelativeDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;
}

// ── Helpers ─────────────────────────────────────────────────────────

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatYMD(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/**
 * Get the user's "now" in their local timezone.
 * Returns individual components to avoid Date parsing ambiguity.
 */
function getUserLocalParts(serverNow: Date, timezone: string | null): {
  year: number; month: number; day: number;
  hour: number; minute: number;
  dayOfWeek: number; // 0=Sun, 1=Mon, ... 6=Sat
  dayOfWeekName: string;
} {
  if (!timezone) {
    // No timezone stored — fall back to UTC
    return {
      year: serverNow.getUTCFullYear(),
      month: serverNow.getUTCMonth() + 1,
      day: serverNow.getUTCDate(),
      hour: serverNow.getUTCHours(),
      minute: serverNow.getUTCMinutes(),
      dayOfWeek: serverNow.getUTCDay(),
      dayOfWeekName: serverNow.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
    };
  }

  try {
    // Use Intl to extract local parts — no manual offset math needed.
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
      weekday: 'long',
    });
    const parts = fmt.formatToParts(serverNow);
    const get = (type: string) => parts.find(p => p.type === type)?.value || '';

    const year = parseInt(get('year'), 10);
    const month = parseInt(get('month'), 10);
    const day = parseInt(get('day'), 10);
    const hour = parseInt(get('hour'), 10);
    const minute = parseInt(get('minute'), 10);
    const dayOfWeekName = get('weekday');

    // Derive numeric dayOfWeek
    const dayMap: Record<string, number> = {
      Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
      Thursday: 4, Friday: 5, Saturday: 6,
    };
    const dayOfWeek = dayMap[dayOfWeekName] ?? serverNow.getUTCDay();

    return { year, month, day, hour, minute, dayOfWeek, dayOfWeekName };
  } catch {
    // Invalid timezone — fall back to UTC
    return {
      year: serverNow.getUTCFullYear(),
      month: serverNow.getUTCMonth() + 1,
      day: serverNow.getUTCDate(),
      hour: serverNow.getUTCHours(),
      minute: serverNow.getUTCMinutes(),
      dayOfWeek: serverNow.getUTCDay(),
      dayOfWeekName: serverNow.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
    };
  }
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// ── Main Builder ────────────────────────────────────────────────────

/**
 * Build full temporal context from trusted server time + user timezone.
 */
export function buildTemporalContext(
  userTimezone: string | null,
  serverNow?: Date,
): TemporalContext {
  const now = serverNow || new Date();
  const local = getUserLocalParts(now, userTimezone);

  // Current month
  const currentMonthStart = formatYMD(local.year, local.month, 1);
  const currentMonthEnd = formatYMD(local.year, local.month, daysInMonth(local.year, local.month));

  // Previous month
  let prevYear = local.year;
  let prevMonth = local.month - 1;
  if (prevMonth < 1) { prevMonth = 12; prevYear--; }
  const previousMonthStart = formatYMD(prevYear, prevMonth, 1);
  const previousMonthEnd = formatYMD(prevYear, prevMonth, daysInMonth(prevYear, prevMonth));

  // Current week (Monday start)
  const daysFromMonday = (local.dayOfWeek === 0 ? 6 : local.dayOfWeek - 1);
  const weekStartDate = new Date(local.year, local.month - 1, local.day - daysFromMonday);
  const weekEndDate = new Date(weekStartDate.getTime() + 6 * 86400000);
  const currentWeekStart = formatYMD(weekStartDate.getFullYear(), weekStartDate.getMonth() + 1, weekStartDate.getDate());
  const currentWeekEnd = formatYMD(weekEndDate.getFullYear(), weekEndDate.getMonth() + 1, weekEndDate.getDate());

  return {
    serverUtcNow: now.toISOString(),
    userTimezone,
    localDate: formatYMD(local.year, local.month, local.day),
    localTime: `${pad2(local.hour)}:${pad2(local.minute)}`,
    localDayOfWeek: local.dayOfWeekName,
    currentMonthStart,
    currentMonthEnd,
    previousMonthStart,
    previousMonthEnd,
    currentWeekStart,
    currentWeekEnd,
  };
}

// ── Relative Date Resolver ──────────────────────────────────────────

/**
 * Resolve a relative date expression to concrete YYYY-MM-DD boundaries
 * in the user's local timezone.
 */
export function resolveRelativeDateRange(
  expression: string,
  userTimezone: string | null,
  serverNow?: Date,
): RelativeDateRange | null {
  const tc = buildTemporalContext(userTimezone, serverNow);
  const local = getUserLocalParts(serverNow || new Date(), userTimezone);
  const expr = expression.toLowerCase().trim();

  if (expr === 'today') {
    return { startDate: tc.localDate, endDate: tc.localDate, label: 'today' };
  }

  if (expr === 'yesterday') {
    const yd = new Date(local.year, local.month - 1, local.day - 1);
    const yds = formatYMD(yd.getFullYear(), yd.getMonth() + 1, yd.getDate());
    return { startDate: yds, endDate: yds, label: 'yesterday' };
  }

  if (expr === 'this week') {
    return { startDate: tc.currentWeekStart, endDate: tc.currentWeekEnd, label: 'this week' };
  }

  if (expr === 'last week') {
    const lwStart = new Date(local.year, local.month - 1, local.day - ((local.dayOfWeek === 0 ? 6 : local.dayOfWeek - 1) + 7));
    const lwEnd = new Date(lwStart.getTime() + 6 * 86400000);
    return {
      startDate: formatYMD(lwStart.getFullYear(), lwStart.getMonth() + 1, lwStart.getDate()),
      endDate: formatYMD(lwEnd.getFullYear(), lwEnd.getMonth() + 1, lwEnd.getDate()),
      label: 'last week',
    };
  }

  if (expr === 'this month') {
    return { startDate: tc.currentMonthStart, endDate: tc.currentMonthEnd, label: 'this month' };
  }

  if (expr === 'last month') {
    return { startDate: tc.previousMonthStart, endDate: tc.previousMonthEnd, label: 'last month' };
  }

  if (expr === 'this year') {
    return {
      startDate: formatYMD(local.year, 1, 1),
      endDate: formatYMD(local.year, 12, 31),
      label: 'this year',
    };
  }

  if (expr === 'last year') {
    return {
      startDate: formatYMD(local.year - 1, 1, 1),
      endDate: formatYMD(local.year - 1, 12, 31),
      label: 'last year',
    };
  }

  if (expr === 'last 7 days') {
    const d7 = new Date(local.year, local.month - 1, local.day - 6);
    return {
      startDate: formatYMD(d7.getFullYear(), d7.getMonth() + 1, d7.getDate()),
      endDate: tc.localDate,
      label: 'last 7 days',
    };
  }

  if (expr === 'last 30 days') {
    const d30 = new Date(local.year, local.month - 1, local.day - 29);
    return {
      startDate: formatYMD(d30.getFullYear(), d30.getMonth() + 1, d30.getDate()),
      endDate: tc.localDate,
      label: 'last 30 days',
    };
  }

  return null;
}

// ── Relative-Period Detection & Authoritative Normalization ─────────

/**
 * Detect relative date period expressions in a user message.
 * Returns normalized expression strings that resolveRelativeDateRange() accepts.
 */
export function detectRelativePeriods(message: string): string[] {
  const normalized = message.toLowerCase();
  const periods: string[] = [];

  // Longer patterns first to avoid substring false-positives
  const patterns: Array<{ regex: RegExp; label: string }> = [
    { regex: /\blast\s+30\s+days?\b/, label: 'last 30 days' },
    { regex: /\blast\s+7\s+days?\b/, label: 'last 7 days' },
    { regex: /\blast\s+month\b/, label: 'last month' },
    { regex: /\blast\s+week\b/, label: 'last week' },
    { regex: /\blast\s+year\b/, label: 'last year' },
    { regex: /\bthis\s+month\b/, label: 'this month' },
    { regex: /\bthis\s+week\b/, label: 'this week' },
    { regex: /\bthis\s+year\b/, label: 'this year' },
    { regex: /\byesterday\b/, label: 'yesterday' },
    { regex: /\btoday\b/, label: 'today' },
  ];

  for (const { regex, label } of patterns) {
    if (regex.test(normalized)) {
      periods.push(label);
    }
  }

  return periods;
}

export interface AuthoritativeDateRange extends RelativeDateRange {
  /** What resolveRelativeDateRange returns for UTC (null timezone) */
  utcStartDate: string;
  utcEndDate: string;
}

/**
 * Build authoritative date ranges for detected periods.
 * Each range includes both the correct user-local boundaries and the
 * UTC boundaries (which the LLM might incorrectly use instead).
 */
export function buildAuthoritativeRanges(
  periods: string[],
  userTimezone: string | null,
  serverNow?: Date,
): AuthoritativeDateRange[] {
  const ranges: AuthoritativeDateRange[] = [];

  for (const period of periods) {
    const local = resolveRelativeDateRange(period, userTimezone, serverNow);
    const utc = resolveRelativeDateRange(period, null, serverNow);

    if (local && utc) {
      ranges.push({
        ...local,
        utcStartDate: utc.startDate,
        utcEndDate: utc.endDate,
      });
    }
  }

  return ranges;
}

/**
 * Normalize tx_search / transaction_category_totals date arguments
 * against authoritative timezone-aware ranges.
 *
 * Logic:
 * 1. If the LLM's dates exactly match an authoritative LOCAL range → already correct, pass through.
 * 2. If the LLM's dates match the UTC version of a detected period (and UTC ≠ local) → correct to local.
 * 3. Otherwise → explicit user dates, pass through unchanged.
 *
 * This handles the "Edmonton 11PM problem" where UTC is already the next month
 * but the user's local date is still in the current month.
 *
 * For multi-period comparison ("compare this month with last month"),
 * each tx_search call is normalized independently against all detected ranges.
 */
export function normalizeToolDateArgs(
  args: { startDate?: string; endDate?: string },
  authoritativeRanges: AuthoritativeDateRange[],
): { startDate?: string; endDate?: string; corrected: boolean; correctionLabel?: string } {
  if (!args.startDate || !args.endDate || authoritativeRanges.length === 0) {
    return { startDate: args.startDate, endDate: args.endDate, corrected: false };
  }

  // Check 1: Already matches an authoritative local range → correct, no change
  for (const range of authoritativeRanges) {
    if (args.startDate === range.startDate && args.endDate === range.endDate) {
      return { startDate: args.startDate, endDate: args.endDate, corrected: false };
    }
  }

  // Check 2: Matches a UTC-shifted version of a detected period → correct to local
  for (const range of authoritativeRanges) {
    if (
      args.startDate === range.utcStartDate &&
      args.endDate === range.utcEndDate &&
      (range.startDate !== range.utcStartDate || range.endDate !== range.utcEndDate)
    ) {
      return {
        startDate: range.startDate,
        endDate: range.endDate,
        corrected: true,
        correctionLabel: range.label,
      };
    }
  }

  // No match — explicit dates, pass through unchanged
  return { startDate: args.startDate, endDate: args.endDate, corrected: false };
}

/**
 * Format temporal context as a system prompt block.
 */
export function formatTemporalContextForPrompt(tc: TemporalContext): string {
  const lines = [
    `TRUSTED TEMPORAL CONTEXT (server-derived, user-local):`,
    `- Current UTC: ${tc.serverUtcNow}`,
    `- User timezone: ${tc.userTimezone || 'UTC (no timezone stored)'}`,
    `- User-local date: ${tc.localDate} (${tc.localDayOfWeek})`,
    `- User-local time: ${tc.localTime}`,
    `- This month: ${tc.currentMonthStart} to ${tc.currentMonthEnd}`,
    `- Last month: ${tc.previousMonthStart} to ${tc.previousMonthEnd}`,
    `- This week: ${tc.currentWeekStart} to ${tc.currentWeekEnd}`,
    ``,
    `Use these dates for all financial period queries. When the user says "this month", use ${tc.currentMonthStart} to ${tc.currentMonthEnd}. When they say "last month", use ${tc.previousMonthStart} to ${tc.previousMonthEnd}.`,
    `You can answer "What time is it?" and "What date is it?" directly from this context.`,
  ];
  return lines.join('\n');
}
