type RecurringCandidate = {
  merchant: string;
  occurrences: number;
  avg_amount: number;
  cadence: "monthly" | "weekly" | "quarterly" | "unknown";
  confidence: number;
  last_seen: string;
  category: string;
  needs_review?: boolean;
};

type RecurringSummary = {
  total_monthly_estimate: number;
  total_detected: number;
};

type RecurringDetectionResult = {
  recurring_candidates: RecurringCandidate[];
  summary: RecurringSummary;
};

function toNumber(value: any): number | null {
  if (value === null || typeof value === "undefined") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/[,$\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value: any): Date | null {
  const text = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const dt = new Date(`${text}T00:00:00Z`);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

function normalizeMerchant(value: any): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[*#]/g, " ")
    .trim()
    .toUpperCase();
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

function inferCadence(deltas: number[]): "monthly" | "weekly" | "quarterly" | "unknown" {
  if (deltas.length === 0) return "unknown";
  const avg = deltas.reduce((s, d) => s + d, 0) / deltas.length;
  if (avg >= 28 && avg <= 35) return "monthly";
  if (avg >= 6 && avg <= 8) return "weekly";
  if (avg >= 80 && avg <= 100) return "quarterly";
  return "unknown";
}

function categoryWeight(category: string): number {
  const c = String(category || "").toLowerCase();
  if (c.includes("subscription") || c.includes("software")) return 0.25;
  if (c.includes("utilities") || c.includes("insurance") || c.includes("fitness")) return 0.2;
  return 0.1;
}

export function detectRecurringTransactions(tagOutput: any): RecurringDetectionResult {
  const txns = Array.isArray(tagOutput?.transactions) ? tagOutput.transactions : [];
  const grouped = new Map<string, Array<any>>();

  for (const tx of txns) {
    const category = String(tx?.category || "");
    const lowerCategory = category.toLowerCase();
    const transferLike = lowerCategory.includes("transfer") || lowerCategory.includes("credit card payment");
    if (transferLike) continue;
    if (tx?.is_spend !== true) continue;

    const merchant = normalizeMerchant(tx?.merchant_normalized || tx?.description_raw || tx?.description);
    const amount = toNumber(tx?.amount);
    const date = parseDate(tx?.date);
    if (!merchant || amount === null || date === null || amount <= 0) continue;
    const list = grouped.get(merchant) || [];
    list.push({
      merchant,
      amount: Math.abs(amount),
      date,
      category: String(tx?.category || "Other"),
    });
    grouped.set(merchant, list);
  }

  const recurring: RecurringCandidate[] = [];

  for (const [merchant, list] of grouped.entries()) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.date.getTime() - b.date.getTime());
    const amounts = sorted.map((x) => x.amount);
    const avg = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    if (avg <= 0) continue;
    const maxDev = amounts.reduce((m, v) => Math.max(m, Math.abs(v - avg) / avg), 0);
    const consistencyOk = maxDev <= 0.15;
    if (!consistencyOk) continue;

    const deltas: number[] = [];
    for (let i = 1; i < sorted.length; i += 1) {
      deltas.push(daysBetween(sorted[i - 1].date, sorted[i].date));
    }
    const cadence = inferCadence(deltas);
    const freqScore = Math.min(0.45, 0.15 * sorted.length);
    const consistencyScore = Math.max(0, 0.35 - Math.min(0.35, maxDev * 2));
    const cadenceScore = cadence === "unknown" ? 0.05 : 0.2;
    const weight = categoryWeight(sorted[0]?.category || "Other");
    const confidence = Math.max(0, Math.min(1, freqScore + consistencyScore + cadenceScore + weight));
    const needsReview = cadence === "unknown" || confidence < 0.55;

    recurring.push({
      merchant,
      occurrences: sorted.length,
      avg_amount: Number(avg.toFixed(2)),
      cadence,
      confidence: Number(confidence.toFixed(2)),
      last_seen: sorted[sorted.length - 1].date.toISOString().slice(0, 10),
      category: sorted[0]?.category || "Other",
      needs_review: needsReview || undefined,
    });
  }

  recurring.sort((a, b) => b.avg_amount - a.avg_amount);
  const monthlyEstimate = recurring.reduce((sum, r) => {
    if (r.cadence === "monthly") return sum + r.avg_amount;
    if (r.cadence === "weekly") return sum + r.avg_amount * 4.33;
    if (r.cadence === "quarterly") return sum + r.avg_amount / 3;
    return sum;
  }, 0);

  return {
    recurring_candidates: recurring,
    summary: {
      total_monthly_estimate: Number(monthlyEstimate.toFixed(2)),
      total_detected: recurring.length,
    },
  };
}

