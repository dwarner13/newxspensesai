import { useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useImportList } from "@/hooks/useImportList";

const INCOME_PATTERNS = /^(PAYMENT|CREDIT|REFUND|DEPOSIT|CASHBACK|REWARD|REBATE|REIMBURSEMENT)$/;

function isIncome(t: { amount: number; category?: string; merchant_name?: string; type?: string }): boolean {
  const cat = (t.category || "").toLowerCase();
  const merchant = (t.merchant_name || "").toUpperCase().trim();
  const txType = ((t as Record<string, unknown>).type as string || "").toLowerCase();
  // Primary signal: type field set by commit-import (most reliable)
  // Do NOT use amount sign - expenses are stored as negative values
  return txType === "income" || cat === "income" || cat === "business income" || INCOME_PATTERNS.test(merchant);
}

const CATEGORY_COLORS: Record<string, string> = {
  "Groceries": "#34d399", "Food & Dining": "#f87171", "Transportation": "#60a5fa",
  "Shopping": "#a78bfa", "Subscriptions": "#818cf8", "Personal Care": "#ec4899",
  "Healthcare": "#f87171", "Bank Fees": "#94a3b8", "Income": "#34d399", "Other": "#4a5a75",
};

/* ── Tax-Workspace mirror: section matchers (same rules as TaxWorkspacePage.tsx) ── */
// Keep these in sync if TaxWorkspacePage section logic changes.
interface TaxSectionDef {
  id: string;
  title: string;
  matchFn: (tx: { category?: string; subcategory?: string; type?: string }) => boolean;
}
const TAX_SECTIONS: TaxSectionDef[] = [
  { id: "income", title: "Income", matchFn: (tx) => (tx as any).type === "income" },
  {
    id: "vehicle", title: "Vehicle Expenses",
    matchFn: (tx) =>
      tx.category === "Transportation" || tx.category === "Automotive" ||
      tx.subcategory === "Vehicle Insurance" ||
      ["Gas & Fuel", "Parking", "Vehicle Maintenance", "Vehicle Registration", "Car Loan", "Car Wash"].includes(tx.subcategory || ""),
  },
  {
    id: "home", title: "Home / Rent / Lease",
    matchFn: (tx) =>
      tx.category === "Rent or Lease" || tx.category === "Utilities" ||
      tx.category === "Housing" || tx.category === "Home / Rent / Lease" ||
      tx.subcategory === "Mortgage / Rent" || tx.subcategory === "Condo Fees" || tx.subcategory === "Home Insurance",
  },
  {
    id: "meals", title: "Meals & Entertainment",
    matchFn: (tx) =>
      tx.category === "Food & Dining" ||
      (tx.category === "Entertainment" && tx.subcategory !== "Golf" && tx.subcategory !== "Gambling" && tx.subcategory !== "Events / Tickets"),
  },
  {
    id: "business", title: "Business Expenses",
    matchFn: (tx) =>
      tx.category === "Subscriptions" || tx.category === "Bank Fees" || tx.category === "Advertising" ||
      tx.category === "Technology" || tx.category === "Office Supplies" ||
      tx.category === "Professional Services" || tx.category === "Business Expenses",
  },
  {
    id: "personal", title: "Personal",
    matchFn: (tx) =>
      ["Personal Care", "Groceries", "Debt Payments", "Transfers", "Shopping", "Healthcare", "Needs Review", "Travel"].includes(tx.category || "") ||
      ["Golf", "Gambling", "Events / Tickets", "Investments", "Online Shopping", "Clothing", "General Shopping", "Hardware / Auto", "Fitness", "Supplements"].includes(tx.subcategory || ""),
  },
];

/* ── Bucket definitions (mirror TaxWorkspacePage.tsx exactly) ── */
// IMPORTANT: Keep these in sync with TaxWorkspacePage.tsx. These are the same
// merchant-keyword rules the Tax Summary UI uses to compute per-bucket totals.
interface TaxBucket { label: string; keywords: string[]; }

const VEHICLE_BUCKETS: TaxBucket[] = [
  { label: "Gas / Fuel", keywords: ["petro", "esso", "shell", "gas", "fuel", "co-op", "mobil", "7-eleven fuel", "husky", "gas & fuel", "kollbrook", "canco petroleum", "circle k"] },
  { label: "Car Payments", keywords: ["td loan", "car payment", "auto loan", "lns/pre", "car loan"] },
  { label: "Registration", keywords: ["registry", "registration", "northtown registry"] },
  { label: "Insurance", keywords: ["economical", "peace hills", "imperial pfs", "vehicle insurance", "auto insurance", "car insurance"] },
  { label: "Repairs / Maintenance", keywords: ["oil change", "repair", "tire", "mechanic", "midas", "canadian tire auto", "maintenance", "auto service", "vehicle maintenance", "jiffy lube", "revolution moto", "river city hyundai"] },
  { label: "Parking", keywords: ["parking", "impark", "parkade"] },
  { label: "Car Wash", keywords: ["car wash", "kenyon", "triangle cp"] },
  { label: "Car Rental", keywords: ["enterprise", "avis", "budget rent", "hertz", "national car", "car rental"] },
  { label: "Rideshare / Taxi", keywords: ["uber", "lyft", "taxi", "rideshare"] },
  { label: "Traffic Fines", keywords: ["myalberta fine", "traffic fine", "photo radar", "parking fine"] },
];

const MEALS_BUCKETS: TaxBucket[] = [
  { label: "Coffee", keywords: ["tim hortons", "starbucks", "booster juice", "second cup", "good earth", "coffee", "coffee & drinks"] },
  { label: "Restaurants / Dining", keywords: ["pizza", "restaurant", "restaurants", "pub", "grill", "diner", "kitchen", "smittys", "wendys", "mcdonalds", "popeyes", "mr sub", "halong bay", "sushi", "thai", "wok", "buffet", "a&w", "subway", "kfc", "burger", "boston pizza", "earls", "cactus", "moxies", "original joe", "joey", "montanas", "restaurants / dining"] },
  { label: "Fast Food / Takeout", keywords: ["uber eats", "doordash", "skip the dishes", "instacart"] },
  { label: "Groceries / Convenience", keywords: ["7-eleven", "7 eleven", "mac's", "circle k"] },
  { label: "Entertainment", keywords: ["movie", "concert", "sport", "fitness", "theatre", "cinema", "netflix", "spotify"] },
  { label: "Alcohol", keywords: ["liquor", "econo liquor", "beer", "wine", "alcanna", "wine and beyond"] },
  { label: "Supplements / Health Food", keywords: ["supplement", "ls supplement", "popeye supplement", "gnc", "nutrition"] },
];

const HOME_BUCKETS: TaxBucket[] = [
  { label: "Mortgage / Rent", keywords: ["mortgage", "b/m payt", "rent", "rnt payt"] },
  { label: "Condo Fees", keywords: ["celtic", "condo fee", "strata", "hoa"] },
  { label: "Utilities - Electric", keywords: ["epcor", "electricity", "electric"] },
  { label: "Utilities - Gas / Heat", keywords: ["atco", "direct energy", "enmax"] },
  { label: "Utilities - Water", keywords: ["epcor water", "water bill"] },
  { label: "Internet", keywords: ["telus", "shaw", "internet"] },
  { label: "Home Insurance", keywords: ["sandbox mutual", "home insurance", "property insurance", "tenant insurance"] },
];

const BUSINESS_BUCKETS: TaxBucket[] = [
  { label: "Advertising / Marketing", keywords: ["advertising", "marketing", "dreamhost", "seo", "amazon prime business", "amazon", "google ads", "facebook"] },
  { label: "Software / Subscriptions", keywords: ["software", "subscriptions", "cursor", "openai", "youtube", "everlance", "ranked ai", "adobe", "microsoft", "canva", "zoom", "slack", "notion", "dropbox", "chatgpt", "2nd site", "stackblitz", "dodopay", "netlify", "paddle.net", "paddle.com", "netflix", "aiprm", "envato", "supabase", "anthropic", "github", "vercel", "cloudflare", "figma", "zapier", "airtable", "linear", "fastmail", "n8n"] },
  { label: "Professional Fees", keywords: ["professional fees", "professional services", "accounting", "ncube", "2nd site", "legal", "bookkeeping", "consulting"] },
  { label: "Bank Fees", keywords: ["bank fees", "bank fee", "premium plan", "handling chg", "interest charge", "service charge", "nsf", "overdraft"] },
  { label: "Business Insurance", keywords: ["imperial pfs", "business insurance", "liability"] },
  { label: "Phone / Cell", keywords: ["phone / cell", "rogers", "fido", "koodo", "virgin mobile", "bell", "freedom mobile", "public mobile", "chatr", "cell phone"] },
];

const PERSONAL_BUCKETS: TaxBucket[] = [
  { label: "Dental", keywords: ["dental", "chandra", "mcallister", "dentist", "orthodon"] },
  { label: "Pharmacy / Medical", keywords: ["pharmacy / medical", "medical", "healthcare", "pharmacy", "shoppers drug mart", "rexall", "clinic", "doctor", "beaumaris", "callingwood", "royal alexandra", "specsavers", "vitality health"] },
  { label: "Groceries", keywords: ["groceries", "sobeys", "save on", "saveonfoods", "safeway", "loblaws", "walmart", "wal-mart", "wmt suprctr", "mac's", "superstore", "costco", "no frills", "freshco", "dollarama", "dollar tree", "intercity packers", "lm st albert"] },
  { label: "Grooming / Salon", keywords: ["grooming / salon", "grooming", "salon", "barber", "hair", "q-nails", "nails spot", "nails", "cutbypat", "ss edmonton", "shadified", "q hair"] },
  { label: "Fitness", keywords: ["fitness", "la fitness", "simply health", "yoga", "gym"] },
  { label: "Supplements", keywords: ["supplements", "supplement", "ls supplement", "lssupplementworld", "unimeal", "v support unimeal", "vsa_support", "popeye", "gnc", "nutrition"] },
  { label: "Wellness / Massage", keywords: ["wellness / massage", "massage", "ting ting", "yo yo", "lewis massage", "tulip garden", "songblossom", "spa", "wellness"] },
  { label: "Cash / ATM", keywords: ["cash / atm", "abm withdrawal", "abmwithdrawal", "other bank abm", "atm withdrawal", "rbc atm"] },
  { label: "Travel & Leisure", keywords: ["travel & leisure", "passport", "holiday inn", "hotel", "balgonie", "travel", "sportsnet", "rmi-sportsnet"] },
  { label: "Transfers", keywords: ["transfers", "payment", "interac etrnsfr sent", "e-transfer", "etransfer", "online transfer", "payback with points"] },
  { label: "Loan Payments", keywords: ["loan payments", "lend direct", "lenddirect", "borrowell", "easyfinancial", "cash money", "springfinancial", "national money", "nationalmoney", "flexiti"] },
  { label: "Credit Card Payments", keywords: ["credit card payments", "ctfs", "capital one", "canadian tire bank", "cc payment"] },
  { label: "Investments", keywords: ["investments", "investment", "bmo inv", "bmoinv", "tfsa", "rrsp", "wealthsimple", "questrade"] },
  { label: "Shopping", keywords: ["general shopping", "hardware / auto", "online shopping", "clothing", "shopping", "winners", "marshalls", "homesense", "amazon", "amzn", "best buy", "pandora", "sport chek", "american eagle", "shoe company", "mountain warehouse", "mark's", "rona", "canadian tire", "cdn tire", "great computers"] },
  { label: "Golf", keywords: ["golf", "alberta beach golf", "twin willows", "glendale golf", "golfzon", "golf traders", "golf town", "golf avenue", "golf av", "sezzle*golf", "canada golf card", "lewis estates golf", "montgomery glen", "sanpiper golf", "silver creek golf", "leduc golf", "leducgolfclub", "lonespruce", "longshotz", "golf club"] },
  { label: "Gambling", keywords: ["gambling", "bingo", "castledowns", "west end bingo", "river cree", "bear hills", "bearhills", "casino"] },
];

// Map each section id to its bucket list (same as TaxWorkspacePage)
const SECTION_BUCKETS: Record<string, TaxBucket[]> = {
  vehicle: VEHICLE_BUCKETS,
  meals: MEALS_BUCKETS,
  home: HOME_BUCKETS,
  business: BUSINESS_BUCKETS,
  personal: PERSONAL_BUCKETS,
};

/**
 * Port of TaxWorkspacePage.groupIntoBuckets. Groups transactions into bucket totals
 * using merchant-keyword matching with subcategory fallback. Returns only buckets
 * with count > 0, sorted by total descending.
 */
function groupIntoBuckets(
  txs: Array<{ merchant_name?: string; merchant?: string; subcategory?: string | null; amount: number }>,
  buckets: TaxBucket[]
): Array<{ label: string; amount: number; count: number }> {
  const map = new Map<string, { count: number; total: number }>();
  for (const b of buckets) map.set(b.label, { count: 0, total: 0 });

  for (const tx of txs) {
    const merch = ((tx as any).merchant_name || (tx as any).merchant || "").toLowerCase();
    const subcat = (tx.subcategory || "").toLowerCase();
    let matched = false;

    // 1) Subcategory exact match against bucket label or keywords
    if (subcat) {
      for (const b of buckets) {
        if (b.label.toLowerCase() === subcat || b.keywords.some(kw => subcat === kw.toLowerCase())) {
          const entry = map.get(b.label)!;
          entry.count += 1;
          entry.total += Math.abs(tx.amount);
          matched = true;
          break;
        }
      }
    }

    // 2) Merchant substring match against bucket keywords
    if (!matched) {
      for (const b of buckets) {
        if (b.keywords.some(kw => merch.includes(kw.toLowerCase()))) {
          const entry = map.get(b.label)!;
          entry.count += 1;
          entry.total += Math.abs(tx.amount);
          matched = true;
          break;
        }
      }
    }
    // Unmatched txs are dropped from buckets (they contribute to section total but not to any bucket).
  }

  return Array.from(map.entries())
    .map(([label, v]) => ({ label, amount: Math.round(v.total), count: v.count }))
    .filter(b => b.count > 0)
    .sort((a, b) => b.amount - a.amount);
}

export interface TopTransaction {
  merchant: string;
  date: string;
  amount: number;
  category: string;
  categoryColor: string;
  isIncome: boolean;
}

export interface TaxSummaryBucket {
  label: string;
  amount: number;
  count: number;
}

export interface TaxSummarySection {
  id: string;
  title: string;
  total: number;
  count: number;
  topBuckets: TaxSummaryBucket[]; // top 5 subcategories by spend
}

export interface PrimeBriefingData {
  statementCount: number;
  transactionCount: number;
  totalSpent: number;
  totalIncome: number;
  monthOverMonthPct: number;
  topCategoryChange: { category: string; pct: number };
  categoryBreakdown: { label: string; amount: number; color: string }[];
  categorySummary: string;
  topTransactions: TopTransaction[];
  topMerchant: { name: string; amount: number } | null;
  uncategorizedCount: number;
  pendingImports: number;
  trendAlert: { category: string; months: number[]; direction: "up" | "down" } | null;
  deductions: { total: number; categories: { label: string; amount: number; color: string }[] };
  // Tax-workspace mirror: section totals + top subcategories (car payments, insurance, etc.)
  taxSummary: TaxSummarySection[];
  loading: boolean;
}

export function usePrimeBriefingData(): PrimeBriefingData {
  const { transactions, isLoading: txLoading } = useTransactions();
  const { imports, isLoading: impLoading } = useImportList();

  return useMemo(() => {
    if (txLoading || impLoading) {
      return {
        statementCount: 0, transactionCount: 0, totalSpent: 0, totalIncome: 0,
        monthOverMonthPct: 0, topCategoryChange: { category: "", pct: 0 },
        categoryBreakdown: [], categorySummary: "", topTransactions: [], topMerchant: null,
        uncategorizedCount: 0, pendingImports: 0,
        trendAlert: null, deductions: { total: 0, categories: [] }, taxSummary: [], loading: true,
      };
    }

    const incomeTransactions = transactions.filter(t => isIncome(t));
    const expenses = transactions.filter(t => !isIncome(t));

    // Totals
    const totalSpent = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalIncome = incomeTransactions.reduce((s, t) => s + Math.abs(t.amount), 0);

    // Normalize category names (merge Subscription/Subscriptions)
    const normCat = (c: string) => c === "Subscription" ? "Subscriptions" : c;

    // Category breakdown (expenses only)
    const catMap: Record<string, number> = {};
    expenses.forEach(t => {
      const cat = normCat(t.category || "Other");
      catMap[cat] = (catMap[cat] || 0) + Math.abs(t.amount);
    });
    const categoryBreakdown = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([label, amount]) => ({
        label, amount: Math.round(amount),
        color: CATEGORY_COLORS[label] || "#4a5a75",
      }));

    // Uncategorized
    const uncategorizedCount = transactions.filter(
      t => !t.category || t.category === "Uncategorized"
    ).length;

    // Pending imports
    const pendingImports = imports.filter(
      i => i.status === "parsed" || i.status === "pending"
    ).length;

    // Month-over-month: compare the two most recent months that have data
    // (not hardcoded to calendar "this month" which may be empty)
    const monthBuckets: Record<string, { spend: number; catMap: Record<string, number> }> = {};
    expenses.forEach(t => {
      const d = new Date(t.posted_at || "");
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!monthBuckets[key]) monthBuckets[key] = { spend: 0, catMap: {} };
      const amt = Math.abs(t.amount);
      const cat = t.category || "Other";
      monthBuckets[key].spend += amt;
      monthBuckets[key].catMap[cat] = (monthBuckets[key].catMap[cat] || 0) + amt;
    });
    const sortedMonths = Object.keys(monthBuckets).sort().reverse();
    const latestBucket = sortedMonths[0] ? monthBuckets[sortedMonths[0]] : null;
    const prevBucket = sortedMonths[1] ? monthBuckets[sortedMonths[1]] : null;
    const curMonthSpend = latestBucket?.spend || 0;
    const prevMonthSpend = prevBucket?.spend || 0;
    const curCatMap = latestBucket?.catMap || {};
    const prevCatMap = prevBucket?.catMap || {};

    const monthOverMonthPct = prevMonthSpend > 0
      ? Math.round(((curMonthSpend - prevMonthSpend) / prevMonthSpend) * 100)
      : 0;

    // Top category change
    let topCatChange = { category: "", pct: 0 };
    for (const cat of Object.keys(curCatMap)) {
      const prev = prevCatMap[cat] || 0;
      if (prev > 0) {
        const pct = Math.round(((curCatMap[cat] - prev) / prev) * 100);
        if (Math.abs(pct) > Math.abs(topCatChange.pct)) {
          topCatChange = { category: cat, pct };
        }
      }
    }

    // Trend alert: find a category increasing across the 3 most recent months
    let trendAlert: PrimeBriefingData["trendAlert"] = null;
    const m3Bucket = sortedMonths[2] ? monthBuckets[sortedMonths[2]] : null;
    if (m3Bucket && prevBucket && latestBucket) {
      for (const cat of Object.keys(catMap)) {
        const m3 = m3Bucket.catMap[cat] || 0;
        const m2 = prevCatMap[cat] || 0;
        const m1 = curCatMap[cat] || 0;
        if (m3 > 0 && m2 > m3 && m1 > m2) {
          trendAlert = {
            category: cat,
            months: [Math.round(m3), Math.round(m2), Math.round(m1)],
            direction: "up",
          };
          break;
        }
      }
    }

    // Tax deductions (only if these categories exist in data)
    const deductibleLabels = ["Home Office", "Vehicle", "Supplies", "Business Meals"];
    const deductionColors: Record<string, string> = {
      "Home Office": "#fb923c", Vehicle: "#60a5fa", Supplies: "#a78bfa", "Business Meals": "#34d399",
    };
    const dedCats = deductibleLabels
      .filter(l => catMap[l] && catMap[l] > 0)
      .map(l => ({ label: l, amount: Math.round(catMap[l]), color: deductionColors[l] || "#4a5a75" }));
    const dedTotal = dedCats.reduce((s, c) => s + c.amount, 0);

    // Top transactions (by amount, desc)
    const topTransactions: TopTransaction[] = [...transactions]
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 10)
      .map(t => {
        const cat = normCat(t.category || "Other");
        const d = new Date(t.posted_at || "");
        return {
          merchant: t.merchant_name || "Unknown",
          date: isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          amount: Math.abs(t.amount),
          category: cat,
          categoryColor: CATEGORY_COLORS[cat] || "#4a5a75",
          isIncome: isIncome(t),
        };
      });
    const topMerchant = topTransactions.length > 0 && !topTransactions[0].isIncome
      ? { name: topTransactions[0].merchant, amount: topTransactions[0].amount }
      : null;

    // Compact category summary string
    const categorySummary = categoryBreakdown.slice(0, 5)
      .map(c => `${c.label} ${totalSpent > 0 ? Math.round((c.amount / totalSpent) * 100) : 0}%`)
      .join(" \u2022 ");

    // ── Tax-Workspace mirror: section + bucket totals ──
    // Uses the EXACT same logic TaxWorkspacePage uses so Prime's numbers match the UI exactly.
    // Key parity details (easy to miss):
    //   1. Year filter: Tax Workspace defaults to year 2025 (`WHERE date >= '2025-01-01' AND date < '2026-01-01'`).
    //   2. First-match-wins: a transaction can only belong to ONE section. We track a `claimed` set
    //      so we don't double-count (same as TaxWorkspacePage.sectionResults).
    // Tax Workspace's default year. Keep in sync with TaxWorkspacePage.tsx `useState(2025)`.
    const TAX_YEAR = 2025;
    const yearStart = new Date(`${TAX_YEAR}-01-01T00:00:00Z`).getTime();
    const yearEnd = new Date(`${TAX_YEAR + 1}-01-01T00:00:00Z`).getTime();
    const yearFiltered = transactions.filter(t => {
      // Transaction may use `date` or `posted_at` field depending on source.
      const rawDate = (t as any).date || (t as any).posted_at;
      if (!rawDate) return false;
      const d = new Date(rawDate).getTime();
      return !isNaN(d) && d >= yearStart && d < yearEnd;
    });

    const claimed = new Set<number>();
    const taxSummary: TaxSummarySection[] = TAX_SECTIONS.map(section => {
      const matched: typeof yearFiltered = [];
      yearFiltered.forEach((tx, idx) => {
        if (claimed.has(idx)) return;
        if (section.matchFn(tx as any)) {
          matched.push(tx);
          claimed.add(idx);
        }
      });
      if (matched.length === 0) {
        return { id: section.id, title: section.title, total: 0, count: 0, topBuckets: [] };
      }
      const total = matched.reduce((s, t) => s + Math.abs(t.amount), 0);
      // Income has no buckets in Tax Workspace; fall back to naive subcategory rollup for non-bucketed sections.
      const sectionBuckets = SECTION_BUCKETS[section.id];
      let topBuckets: TaxSummaryBucket[] = [];
      if (sectionBuckets) {
        topBuckets = groupIntoBuckets(matched as any, sectionBuckets).slice(0, 5);
      } else {
        // Fallback for sections without defined buckets (e.g. Income): group by subcategory.
        const subMap: Record<string, { amount: number; count: number }> = {};
        for (const tx of matched) {
          const sub = (tx.subcategory && String(tx.subcategory).trim()) || "Uncategorized";
          if (!subMap[sub]) subMap[sub] = { amount: 0, count: 0 };
          subMap[sub].amount += Math.abs(tx.amount);
          subMap[sub].count += 1;
        }
        topBuckets = Object.entries(subMap)
          .map(([label, v]) => ({ label, amount: Math.round(v.amount), count: v.count }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5);
      }
      return {
        id: section.id,
        title: section.title,
        total: Math.round(total),
        count: matched.length,
        topBuckets,
      };
    }).filter(s => s.count > 0); // drop empty sections

    return {
      statementCount: imports.length,
      transactionCount: transactions.length,
      totalSpent: Math.round(totalSpent),
      totalIncome: Math.round(totalIncome),
      monthOverMonthPct,
      topCategoryChange: topCatChange,
      categoryBreakdown,
      categorySummary,
      topTransactions,
      topMerchant,
      uncategorizedCount,
      pendingImports,
      trendAlert,
      deductions: { total: dedTotal, categories: dedCats },
      taxSummary,
      loading: false,
    };
  }, [transactions, imports, txLoading, impLoading]);
}

export function buildSummaryText(d: PrimeBriefingData): string {
  const parts: string[] = [];
  const income = d.topTransactions.filter(t => t.isIncome).reduce((s, t) => s + t.amount, 0);
  const net = income - d.totalSpent;
  const netLabel = net >= 0 ? `+$${Math.abs(net).toLocaleString()}` : `-$${Math.abs(net).toLocaleString()}`;

  // Lead with the headline number
  if (d.transactionCount === 0) {
    return "No transactions yet. Upload a statement to get started.";
  }

  parts.push(`Across ${d.statementCount} statement${d.statementCount !== 1 ? "s" : ""}, you had $${d.totalSpent.toLocaleString()} in spending and $${income.toLocaleString()} in income \u2014 net ${netLabel} this period.`);

  // Category insight (skip if mostly Other)
  const topCat = d.categoryBreakdown[0];
  const topPct = topCat && d.totalSpent > 0 ? Math.round((topCat.amount / d.totalSpent) * 100) : 0;
  if (topCat && topCat.label !== "Other" && topPct > 25) {
    parts.push(`${topCat.label} is your biggest spend at $${topCat.amount.toLocaleString()} (${topPct}%).`);
  } else if (topCat && topCat.label === "Other" && topPct > 50) {
    parts.push(`${topPct}% of your spending is uncategorized \u2014 review your categories to get a clearer picture.`);
  }

  // Month-over-month (only if meaningful)
  if (d.monthOverMonthPct !== 0 && Math.abs(d.monthOverMonthPct) < 500) {
    const dir = d.monthOverMonthPct > 0 ? "up" : "down";
    parts.push(`Spending is ${dir} ${Math.abs(d.monthOverMonthPct)}% from last month.`);
  }

  // Deductions
  if (d.deductions.total > 0) {
    parts.push(`I spotted $${d.deductions.total.toLocaleString()} in potential tax deductions worth flagging.`);
  }

  return parts.join(" ");
}

export function buildThoughtsText(d: PrimeBriefingData): string {
  const parts: string[] = [];

  if (d.trendAlert) {
    const { category, months, direction } = d.trendAlert;
    const trend = months.map(m => `$${m.toLocaleString()}`).join(" \u2192 ");
    parts.push(
      `The ${category.toLowerCase()} ${direction === "up" ? "spike" : "drop"} has been ` +
      `${direction === "up" ? "climbing" : "declining"} ${months.length} months straight: ${trend}. ` +
      `Worth keeping an eye on.`
    );
  }

  if (d.uncategorizedCount > 0) {
    parts.push(
      `Tag found ${d.uncategorizedCount} transaction${d.uncategorizedCount !== 1 ? "s" : ""} that still need your call. ` +
      `Worth knocking those out \u2014 it'll sharpen everything else.`
    );
  }

  if (d.categoryBreakdown.length > 0) {
    const top = d.categoryBreakdown[0];
    parts.push(
      `Your top spending category is ${top.label} at $${top.amount.toLocaleString()}. ` +
      `That's ${d.totalSpent > 0 ? Math.round((top.amount / d.totalSpent) * 100) : 0}% of your total spend.`
    );
  }

  return parts.length > 0 ? parts.join(" ") : "Everything looks solid this period. No major flags to report.";
}
