import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { THEME } from "../PrimeChatV2/agentConfig";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

/* ── Types matching actual DB schema ── */

interface Transaction {
  category: string | null;
  merchant: string | null;
  merchant_name: string | null;
  amount: number;
  type: string;
  date: string;
  subcategory: string | null;
}

interface SubRow {
  label: string;
  count: number;
  amount: number; // always positive for display
  txDetails?: { merchant: string; amount: number; date: string }[]; // populated for "Other" bucket
}

interface SectionDef {
  id: string;
  icon: string;
  title: string;
  matchFn: (tx: Transaction) => boolean;
}

/* ── Section definitions using EXACT category strings from DB ── */

const SECTIONS: SectionDef[] = [
  { id: "income", icon: "\uD83D\uDCB0", title: "Income", matchFn: (tx) => tx.type === "income" },
  { id: "vehicle", icon: "\uD83D\uDE97", title: "Vehicle Expenses", matchFn: (tx) => tx.category === "Transportation" || tx.category === "Automotive" || tx.subcategory === "Vehicle Insurance" || ["Gas & Fuel", "Parking", "Vehicle Maintenance", "Vehicle Registration", "Car Loan", "Car Wash"].includes(tx.subcategory || "") },
  { id: "home", icon: "\uD83C\uDFE0", title: "Home / Rent / Lease", matchFn: (tx) => tx.category === "Rent or Lease" || tx.category === "Utilities" || tx.category === "Housing" || tx.category === "Home / Rent / Lease" || tx.subcategory === "Mortgage / Rent" || tx.subcategory === "Condo Fees" || tx.subcategory === "Home Insurance" },
  { id: "meals", icon: "\uD83C\uDF7D\uFE0F", title: "Meals & Entertainment", matchFn: (tx) => tx.category === "Food & Dining" || (tx.category === "Entertainment" && tx.subcategory !== "Golf" && tx.subcategory !== "Gambling" && tx.subcategory !== "Events / Tickets") },
  { id: "business", icon: "\uD83D\uDCBC", title: "Business Expenses", matchFn: (tx) => tx.category === "Subscriptions" || tx.category === "Bank Fees" || tx.category === "Advertising" || tx.category === "Technology" || tx.category === "Office Supplies" || tx.category === "Professional Services" || tx.category === "Business Expenses" },
  { id: "personal", icon: "\uD83D\uDC64", title: "Personal", matchFn: (tx) => tx.category === "Personal Care" || tx.category === "Groceries" || tx.category === "Debt Payments" || tx.category === "Transfers" || tx.category === "Shopping" || tx.category === "Healthcare" || tx.category === "Needs Review" || tx.category === "Travel" || tx.subcategory === "Golf" || tx.subcategory === "Gambling" || tx.subcategory === "Events / Tickets" || tx.subcategory === "Investments" || tx.subcategory === "Online Shopping" || tx.subcategory === "Clothing" || tx.subcategory === "General Shopping" || tx.subcategory === "Hardware / Auto" || tx.subcategory === "Fitness" || tx.subcategory === "Supplements" },
  { id: "other", icon: "\uD83D\uDCE6", title: "Other / Uncategorized", matchFn: (tx) => tx.type === "expense" },
];

/* ── Subcategory bucket definitions per section ── */

interface Bucket {
  label: string;
  keywords: string[];
}

const VEHICLE_BUCKETS: Bucket[] = [
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

const MEALS_BUCKETS: Bucket[] = [
  { label: "Coffee", keywords: ["tim hortons", "starbucks", "booster juice", "second cup", "good earth", "coffee", "coffee & drinks"] },
  { label: "Restaurants / Dining", keywords: ["pizza", "restaurant", "restaurants", "pub", "grill", "diner", "kitchen", "smittys", "wendys", "mcdonalds", "popeyes", "mr sub", "halong bay", "sushi", "thai", "wok", "buffet", "a&w", "subway", "kfc", "burger", "boston pizza", "earls", "cactus", "moxies", "original joe", "joey", "montanas", "restaurants / dining"] },
  { label: "Fast Food / Takeout", keywords: ["uber eats", "doordash", "skip the dishes", "instacart"] },
  { label: "Groceries / Convenience", keywords: ["7-eleven", "7 eleven", "mac's", "circle k"] },
  { label: "Entertainment", keywords: ["movie", "concert", "sport", "fitness", "theatre", "cinema", "netflix", "spotify"] },
  { label: "Alcohol", keywords: ["liquor", "econo liquor", "beer", "wine", "alcanna", "wine and beyond"] },
  { label: "Supplements / Health Food", keywords: ["supplement", "ls supplement", "popeye supplement", "gnc", "nutrition"] },
];

const HOME_BUCKETS: Bucket[] = [
  { label: "Mortgage / Rent", keywords: ["mortgage", "b/m payt", "rent", "rnt payt"] },
  { label: "Condo Fees", keywords: ["celtic", "condo fee", "strata", "hoa"] },
  { label: "Utilities - Electric", keywords: ["epcor", "electricity", "electric"] },
  { label: "Utilities - Gas / Heat", keywords: ["atco", "direct energy", "enmax"] },
  { label: "Utilities - Water", keywords: ["epcor water", "water bill"] },
  { label: "Internet", keywords: ["telus", "shaw", "internet"] },
  { label: "Home Insurance", keywords: ["sandbox mutual", "home insurance", "property insurance", "tenant insurance"] },
];

const BUSINESS_BUCKETS: Bucket[] = [
  { label: "Advertising / Marketing", keywords: ["advertising", "marketing", "dreamhost", "seo", "amazon prime business", "amazon", "google ads", "facebook"] },
  { label: "Software / Subscriptions", keywords: ["software", "subscriptions", "cursor", "openai", "youtube", "everlance", "ranked ai", "adobe", "microsoft", "canva", "zoom", "slack", "notion", "dropbox", "chatgpt", "2nd site", "stackblitz", "dodopay", "netlify", "paddle.net", "paddle.com", "netflix", "aiprm", "envato", "supabase", "anthropic", "github", "vercel", "cloudflare", "figma", "zapier", "airtable", "linear", "fastmail", "n8n"] },
  { label: "Professional Fees", keywords: ["professional fees", "professional services", "accounting", "ncube", "2nd site", "legal", "bookkeeping", "consulting"] },
  { label: "Bank Fees", keywords: ["bank fees", "bank fee", "premium plan", "handling chg", "interest charge", "service charge", "nsf", "overdraft"] },
  { label: "Business Insurance", keywords: ["imperial pfs", "business insurance", "liability"] },
  { label: "Phone / Cell", keywords: ["phone / cell", "rogers", "fido", "koodo", "virgin mobile", "bell", "freedom mobile", "public mobile", "chatr", "cell phone"] },
];

const PERSONAL_BUCKETS: Bucket[] = [
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
  { label: "Shopping", keywords: ["general shopping", "hardware / auto", "online shopping", "clothing", "shopping", "winners", "marshalls", "homesense", "amazon", "amzn", "best buy", "pandora", "sport chek", "american eagle", "shoe company", "mountain warehouse", "urban kids", "mark's", "rona", "canadian tire", "cdn tire", "great computers"] },
  { label: "Golf", keywords: ["golf", "alberta beach golf", "ls alberta beach", "twin willows", "glendale golf", "golfzon", "golf traders", "golf town", "golf avenue", "golf av", "sezzle*golf", "canada golf card", "lewis estates golf", "montgomery glen", "sanpiper golf", "silver creek golf", "leduc golf", "leducgolfclub", "lonespruce", "longshotz", "golf club"] },
  { label: "Gambling", keywords: ["gambling", "bingo", "castledowns", "west end bingo", "river cree", "bear hills", "bearhills", "casino"] },
  { label: "Events / Tickets", keywords: ["events / tickets", "landmark web", "ticketmaster", "eventbrite"] },
];

const INCOME_BUCKETS: Bucket[] = []; // Income groups by merchant (no predefined buckets)

/** Map section id -> its buckets */
const SECTION_BUCKETS: Record<string, Bucket[]> = {
  income: INCOME_BUCKETS,
  vehicle: VEHICLE_BUCKETS,
  home: HOME_BUCKETS,
  meals: MEALS_BUCKETS,
  business: BUSINESS_BUCKETS,
  personal: PERSONAL_BUCKETS,
  other: [],
};

/* ── Helpers ── */

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Group transactions into predefined subcategory buckets by matching
 * merchant name against keywords. Unmatched txs go to "Other".
 * Empty buckets are shown with $0.
 */
function groupIntoBuckets(txs: Transaction[], buckets: Bucket[]): SubRow[] {
  const map = new Map<string, { count: number; total: number; details: { merchant: string; amount: number; date: string }[] }>();
  for (const b of buckets) map.set(b.label, { count: 0, total: 0, details: [] });
  map.set("Other", { count: 0, total: 0, details: [] });

  for (const tx of txs) {
    const merch = (tx.merchant_name || tx.merchant || "").toLowerCase();
    const subcat = (tx.subcategory || "").toLowerCase();
    const detail = { merchant: tx.merchant_name || tx.merchant || "(unknown)", amount: Math.abs(tx.amount), date: tx.date };
    let matched = false;

    if (subcat) {
      for (const b of buckets) {
        if (b.label.toLowerCase() === subcat || b.keywords.some((kw) => subcat === kw.toLowerCase())) {
          const entry = map.get(b.label)!;
          entry.count += 1;
          entry.total += Math.abs(tx.amount);
          entry.details.push(detail);
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      for (const b of buckets) {
        if (b.keywords.some((kw) => merch.includes(kw.toLowerCase()))) {
          const entry = map.get(b.label)!;
          entry.count += 1;
          entry.total += Math.abs(tx.amount);
          entry.details.push(detail);
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      const entry = map.get("Other")!;
      entry.count += 1;
      entry.total += Math.abs(tx.amount);
      entry.details.push(detail);
    }
  }

  const rows: SubRow[] = [];
  for (const b of buckets) {
    const entry = map.get(b.label)!;
    rows.push({ label: b.label, count: entry.count, amount: entry.total, txDetails: entry.details });
  }
  const other = map.get("Other")!;
  if (other.total > 0 || other.count > 0) {
    rows.push({ label: "Other", count: other.count, amount: other.total, txDetails: other.details });
  }
  return rows;
}

/** For income: group by merchant name (payer/client) */
function groupByMerchant(txs: Transaction[]): SubRow[] {
  const map = new Map<string, { count: number; total: number }>();
  for (const tx of txs) {
    const key = tx.merchant_name?.trim() || tx.merchant?.trim() || "(unknown payer)";
    const entry = map.get(key) || { count: 0, total: 0 };
    entry.count += 1;
    entry.total += Math.abs(tx.amount);
    map.set(key, entry);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([label, v]) => ({ label, count: v.count, amount: v.total }));
}

/* ── Bucket label → DB filter mapping ── */

const BUCKET_FILTER_MAP: Record<string, { category?: string; subcategory?: string }> = {
  // Vehicle
  "Gas / Fuel":               { subcategory: "Gas & Fuel" },
  "Car Payments":             { subcategory: "Car Loan" },
  "Registration":             { subcategory: "Vehicle Registration" },
  "Insurance":                { subcategory: "Vehicle Insurance" },
  "Repairs / Maintenance":    { subcategory: "Vehicle Maintenance" },
  "Parking":                  { subcategory: "Parking" },
  "Car Wash":                 { subcategory: "Car Wash" },
  "Car Rental":               { subcategory: "Car Rental" },
  "Rideshare / Taxi":         { subcategory: "Rideshare" },
  "Traffic Fines":            { subcategory: "Traffic Fines" },
  // Home
  "Mortgage / Rent":          { subcategory: "Mortgage / Rent" },
  "Condo Fees":               { subcategory: "Condo Fees" },
  "Utilities - Electric":     { category: "Utilities" },
  "Utilities - Gas / Heat":   { category: "Utilities" },
  "Utilities - Water":        { category: "Utilities" },
  "Internet":                 { category: "Utilities" },
  "Home Insurance":           { subcategory: "Home Insurance" },
  // Meals
  "Coffee":                   { category: "Food & Dining" },
  "Restaurants / Dining":     { category: "Food & Dining" },
  "Fast Food / Takeout":      { category: "Food & Dining" },
  "Groceries / Convenience":  { category: "Food & Dining" },
  "Entertainment":            { category: "Entertainment" },
  "Alcohol":                  { category: "Food & Dining" },
  "Supplements / Health Food":{ category: "Food & Dining" },
  // Business
  "Advertising / Marketing":  { category: "Advertising" },
  "Software / Subscriptions": { category: "Subscriptions" },
  "Professional Fees":        { category: "Professional Services" },
  "Bank Fees":                { category: "Bank Fees" },
  "Business Insurance":       { subcategory: "Business Insurance" },
  "Phone / Cell":             { subcategory: "Phone / Cell" },
  // Personal
  "Dental":                   { subcategory: "Dental" },
  "Pharmacy / Medical":       { category: "Healthcare" },
  "Groceries":                { category: "Groceries" },
  "Grooming / Salon":         { category: "Personal Care" },
  "Wellness / Massage":       { category: "Personal Care" },
  "Cash / ATM":               { subcategory: "ATM" },
  "Travel & Leisure":         { category: "Travel" },
  "Transfers":                { category: "Transfers" },
  "Loan Payments":            { category: "Debt Payments" },
  "Credit Card Payments":     { category: "Debt Payments" },
  "Investments":              { category: "Transfers" },
  "Shopping":                 { category: "Shopping" },
  "Golf":                     { subcategory: "Golf" },
  "Gambling":                 { subcategory: "Gambling" },
  "Events / Tickets":         { subcategory: "Events / Tickets" },
};

/* ── CSV export ── */

function exportCSV(
  year: number,
  sectionResults: Map<string, { txs: Transaction[]; rows: SubRow[]; total: number }>,
) {
  const csvRows: string[][] = [["Section", "Subcategory", "# Transactions", "Amount"]];
  for (const section of SECTIONS) {
    const res = sectionResults.get(section.id);
    if (!res || res.txs.length === 0) continue;
    csvRows.push([section.title, "", "", `$${res.total.toFixed(2)}`]);
    for (const sr of res.rows) {
      csvRows.push(["", sr.label, String(sr.count), `$${sr.amount.toFixed(2)}`]);
    }
  }
  const csv = csvRows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tax-summary-${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ══════════════════════════════════════════════════
   Main component
   ══════════════════════════════════════════════════ */

export default function TaxWorkspacePage() {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [year, setYear] = useState(2025);
  const [needsReviewCount, setNeedsReviewCount] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(SECTIONS.map((s) => s.id)),
  );
  const [vehicleKm, setVehicleKm] = useState({ opening: "", closing: "", businessGFS: "", businessROWNMI: "" });
  const [kmSaved, setKmSaved] = useState(false);
  const [kmSaving, setKmSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    h();
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // Load saved odometer readings from profiles.settings
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data } = await supabase
        .from("profiles")
        .select("settings")
        .eq("id", userId)
        .single();
      if (data?.settings?.vehicle_km?.[year]) {
        const saved = data.settings.vehicle_km[year];
        setVehicleKm({
          opening: saved.opening || "",
          closing: saved.closing || "",
          businessGFS: saved.businessGFS || "",
          businessROWNMI: saved.businessROWNMI || "",
        });
      }
    })();
  }, [userId, year]);

  // Fetch transactions for selected year
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = getSupabase();
      if (!supabase) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("transactions")
        .select("category, merchant, merchant_name, amount, type, date, subcategory")
        .eq("user_id", userId)
        .gte("date", `${year}-01-01`)
        .lt("date", `${year + 1}-01-01`)
        .order("date", { ascending: false })
        .limit(5000);
      if (!cancelled) {
        if (error) console.error("[TaxWorkspace] fetch error:", error);
        setTransactions((data as Transaction[]) || []);
        setLoading(false);
        // Count Needs Review transactions for the banner
        const nrCount = (data || []).filter((t: any) => t.category === 'Needs Review').length;
        setNeedsReviewCount(nrCount);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, year, refreshKey]);

  // Assign each tx to FIRST matching section (no double-counting)
  const sectionResults = useMemo(() => {
    const results = new Map<string, { txs: Transaction[]; rows: SubRow[]; total: number }>();
    const claimed = new Set<number>(); // index-based since we don't have id

    for (const section of SECTIONS) {
      const matched: Transaction[] = [];
      transactions.forEach((tx, idx) => {
        if (claimed.has(idx)) return;
        if (section.matchFn(tx)) {
          matched.push(tx);
          claimed.add(idx);
        }
      });
      const buckets = SECTION_BUCKETS[section.id];
      const rows = buckets && buckets.length > 0
        ? groupIntoBuckets(matched, buckets)
        : groupByMerchant(matched); // Income: group by payer
      const total = matched.reduce((s, t) => s + Math.abs(t.amount), 0);
      results.set(section.id, { txs: matched, rows, total });
    }
    return results;
  }, [transactions]);

  // Summary totals
  const totalIncome = sectionResults.get("income")?.total ?? 0;
  const totalExpenses = useMemo(
    () => transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Math.abs(t.amount), 0),
    [transactions],
  );
  const totalPersonal = sectionResults.get("personal")?.total ?? 0;

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const saveVehicleKm = async () => {
    if (!userId) return;
    setKmSaving(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      // Read existing settings first to merge
      const { data } = await supabase.from("profiles").select("settings").eq("id", userId).single();
      const existing = data?.settings || {};
      const vehicle_km = { ...(existing.vehicle_km || {}), [year]: vehicleKm };
      await supabase.from("profiles").update({ settings: { ...existing, vehicle_km } }).eq("id", userId);
      setKmSaved(true);
      setTimeout(() => setKmSaved(false), 3000);
    } catch (err) {
      console.error("[TaxWorkspace] save km error:", err);
    } finally {
      setKmSaving(false);
    }
  };

  const handleExportCSV = useCallback(() => {
    exportCSV(year, sectionResults);
  }, [year, sectionResults]);

  const [exportingReport, setExportingReport] = useState(false);
  const handleExportReport = useCallback(async () => {
    if (!userId) return;
    setExportingReport(true);
    try {
      const res = await fetch("/.netlify/functions/generate-tax-report", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({
          year,
          vehicle_config: {
            opening_odometer: parseFloat(vehicleKm.opening) || 0,
            closing_odometer: parseFloat(vehicleKm.closing) || 0,
            total_km: Math.max(0, (parseFloat(vehicleKm.closing) || 0) - (parseFloat(vehicleKm.opening) || 0)),
            business_km_gfs: parseFloat(vehicleKm.businessGFS) || 0,
            business_km_rownmi: parseFloat(vehicleKm.businessROWNMI) || 0,
            business_km: (parseFloat(vehicleKm.businessGFS) || 0) + (parseFloat(vehicleKm.businessROWNMI) || 0),
          },
        }),
      });
      if (!res.ok) throw new Error("Report generation failed");
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tax-report-${year}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[TaxWorkspace] export report error:", err);
    } finally {
      setExportingReport(false);
    }
  }, [userId, year, vehicleKm]);

  /* ── Render ── */

  if (loading) {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif", color: THEME.textMuted, padding: 40, textAlign: "center" }}>
        Loading tax data...
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      maxWidth: 1100, margin: "0 auto",
      padding: isMobile ? "20px 16px" : "32px 24px",
      color: THEME.text,
    }}>

      {/* ══════ HEADER ══════ */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: "white", margin: 0 }}>Tax Summary</h1>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{
              background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 8,
              color: THEME.text, padding: "6px 12px", fontSize: 14, fontWeight: 600,
              cursor: "pointer", outline: "none",
            }}
          >
            {[2026, 2025, 2024, 2023].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={() => { setIsRefreshing(true); setRefreshKey(k => k + 1); setTimeout(() => setIsRefreshing(false), 1500); }}
            title="Refresh data"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, padding: isMobile ? "6px 10px" : "6px 14px",
              borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: THEME.surface, border: `1px solid ${THEME.border}`,
              color: isRefreshing ? THEME.accent : THEME.textMuted,
              cursor: isRefreshing ? "wait" : "pointer", outline: "none",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.accent; e.currentTarget.style.color = THEME.accent; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.color = isRefreshing ? THEME.accent : THEME.textMuted; }}
          >
            <span style={{ display: "inline-block", transition: "transform 0.6s", transform: isRefreshing ? "rotate(360deg)" : "rotate(0deg)", fontSize: 15 }}>↻</span>
            {!isMobile && <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>}
          </button>
          <span style={{ fontSize: 12, color: THEME.textDim }}>
            {transactions.length} transactions loaded
          </span>
        </div>
        <p style={{ fontSize: 13, color: THEME.textMuted, margin: "0 0 16px 0" }}>
          Auto-generated from your uploaded statements
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={handleExportCSV}
            style={{
              padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: THEME.accent, border: "none", color: "#0b1220", cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            Export CSV
          </button>
          <button
            onClick={handleExportReport}
            disabled={exportingReport}
            style={{
              padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: THEME.surface, border: `1px solid ${THEME.border}`,
              color: exportingReport ? THEME.textDim : THEME.text,
              cursor: exportingReport ? "wait" : "pointer",
              opacity: exportingReport ? 0.6 : 1,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { if (!exportingReport) { e.currentTarget.style.borderColor = THEME.accent; } }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.border; }}
          >
            {exportingReport ? "Generating..." : "Export Report (HTML)"}
          </button>
        </div>
      </div>

      {/* ══════ DISCLAIMER ══════ */}
      <div style={{ padding: '10px 16px', borderRadius: 10, marginBottom: 20, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>{"\u26A0\uFE0F"}</span>
        <span style={{ fontSize: 12, color: '#7b8ba5', lineHeight: 1.5 }}>XspensesAI organizes your financial data to help you work with your accountant more efficiently. We are not accountants, financial advisors, or tax professionals. Nothing in this app constitutes financial, tax, or legal advice.</span>
      </div>

      {/* ══════ NEEDS REVIEW BANNER ══════ */}
      {needsReviewCount > 0 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: isMobile ? "12px 14px" : "14px 20px", marginBottom: 20, borderRadius: 14,
          background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
            <span style={{ fontSize: 18 }}>{"\u26A0\uFE0F"}</span>
            <span style={{ fontSize: 13, color: "#fbbf24", fontWeight: 600 }}>
              {needsReviewCount} transaction{needsReviewCount !== 1 ? 's' : ''} need{needsReviewCount === 1 ? 's' : ''} your attention before these totals are accurate.
            </span>
          </div>
          <button
            onClick={() => navigate("/dashboard/transactions?category=Needs+Review")}
            style={{
              padding: "7px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.35)",
              color: "#fbbf24", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            Review with Tag {"\u2192"}
          </button>
        </div>
      )}

      {/* ══════ SUMMARY CARDS ══════ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
        gap: 16, marginBottom: 32,
      }}>
        {[
          { label: "Total Income", value: `$${fmt(totalIncome)}`, color: THEME.green },
          { label: "Total Expenses", value: `$${fmt(totalExpenses)}`, color: "#f87171" },
          { label: "Total Personal", value: `$${fmt(totalPersonal)}`, color: THEME.textMuted },
          { label: "Transactions", value: String(transactions.length), color: THEME.accent },
        ].map((card) => (
          <div key={card.label} style={{
            background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14,
            padding: isMobile ? "14px 12px" : "18px 20px",
            boxShadow: `0 4px 20px ${card.color}08`,
          }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4, color: THEME.textMuted, fontWeight: 700, marginBottom: 8 }}>
              {card.label}
            </div>
            <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 800, color: card.color }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* ══════ ALL SECTIONS ══════ */}
      {SECTIONS.map((section) => {
        const res = sectionResults.get(section.id);
        const txs = res?.txs ?? [];
        const subRows = res?.rows ?? [];
        const sectionTotal = res?.total ?? 0;
        const isExpanded = expandedSections.has(section.id);
        const headerColor = section.id === "income" ? THEME.green : section.id === "personal" ? THEME.textDim : THEME.accent;

        // Hide "other" section if it has no transactions
        if (section.id === "other" && txs.length === 0) return null;

        return (
          <SectionCard
            key={section.id}
            icon={section.icon}
            title={section.title}
            total={sectionTotal}
            count={txs.length}
            color={headerColor}
            expanded={isExpanded}
            onToggle={() => toggleSection(section.id)}
            isMobile={isMobile}
          >
            {txs.length === 0 ? (
              <div style={{ fontSize: 13, color: THEME.textDim, padding: "12px 0" }}>
                No transactions found for {year}.
              </div>
            ) : (
              <SubcategoryTable
                rows={subRows}
                color={headerColor}
                isMobile={isMobile}
                isIncome={section.id === "income"}
              />
            )}

            {/* Vehicle KM inputs (raw numbers for accountant) */}
            {section.id === "vehicle" && (
              <div style={{
                marginTop: 16, padding: "14px 16px", borderRadius: 12,
                background: `${THEME.accent}08`, border: `1px solid ${THEME.accent}15`,
              }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4, fontWeight: 700, color: THEME.accent, marginBottom: 12 }}>
                  Vehicle KM Log
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
                  {([
                    { label: "Opening Odometer", key: "opening" as const, placeholder: "e.g. 170210" },
                    { label: "Closing Odometer", key: "closing" as const, placeholder: "e.g. 229677" },
                    { label: "Business KM — GFS (T777)", key: "businessGFS" as const, placeholder: "e.g. 35000" },
                    { label: "Business KM — ROWNMI (T2125)", key: "businessROWNMI" as const, placeholder: "e.g. 7321" },
                  ] as const).map((field) => (
                    <label key={field.key} style={{ fontSize: 12, color: THEME.textMuted, display: "flex", alignItems: "center", gap: 8 }}>
                      {field.label}:
                      <input type="number" value={vehicleKm[field.key]}
                        onChange={(e) => setVehicleKm((v) => ({ ...v, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        style={{ width: 130, padding: "5px 8px", borderRadius: 6, background: THEME.bg, border: `1px solid ${THEME.border}`, color: THEME.text, fontSize: 13, outline: "none" }}
                      />
                    </label>
                  ))}
                </div>
                {vehicleKm.opening && vehicleKm.closing && Number(vehicleKm.closing) > Number(vehicleKm.opening) && (
                  <div style={{ fontSize: 12, color: THEME.accent, fontWeight: 600, marginTop: 8, display: "flex", gap: 20, flexWrap: "wrap" }}>
                    <span>Total KM: {(Number(vehicleKm.closing) - Number(vehicleKm.opening)).toLocaleString()} km</span>
                    {vehicleKm.businessGFS && Number(vehicleKm.businessGFS) > 0 && (
                      <span style={{ color: THEME.textMuted, fontWeight: 400 }}>
                        GFS: {Number(vehicleKm.businessGFS).toLocaleString()} km ({((Number(vehicleKm.businessGFS) / (Number(vehicleKm.closing) - Number(vehicleKm.opening))) * 100).toFixed(1)}%)
                      </span>
                    )}
                    {vehicleKm.businessROWNMI && Number(vehicleKm.businessROWNMI) > 0 && (
                      <span style={{ color: THEME.textMuted, fontWeight: 400 }}>
                        ROWNMI: {Number(vehicleKm.businessROWNMI).toLocaleString()} km ({((Number(vehicleKm.businessROWNMI) / (Number(vehicleKm.closing) - Number(vehicleKm.opening))) * 100).toFixed(1)}%)
                      </span>
                    )}
                    {(vehicleKm.businessGFS || vehicleKm.businessROWNMI) && (
                      <span style={{ color: THEME.green, fontWeight: 700 }}>
                        Total business: {((Number(vehicleKm.businessGFS) || 0) + (Number(vehicleKm.businessROWNMI) || 0)).toLocaleString()} km ({((((Number(vehicleKm.businessGFS) || 0) + (Number(vehicleKm.businessROWNMI) || 0)) / (Number(vehicleKm.closing) - Number(vehicleKm.opening))) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: THEME.textDim }}>
                    Enter Jan 1 opening and Dec 31 closing odometer readings. Your accountant will use these to calculate your vehicle expense deduction.
                  </div>
                  <button
                    onClick={saveVehicleKm}
                    disabled={kmSaving}
                    style={{
                      padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, flexShrink: 0, marginLeft: 16,
                      background: kmSaved ? THEME.green : THEME.accent,
                      border: "none", color: "#0b1220", cursor: kmSaving ? "wait" : "pointer",
                      opacity: kmSaving ? 0.7 : 1, transition: "all 0.2s",
                    }}
                  >
                    {kmSaved ? "✓ Saved" : kmSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        );
      })}

      {/* ══════ FOOTER ══════ */}
      <div style={{
        marginTop: 32, padding: "16px 20px", borderRadius: 12,
        background: THEME.surface, border: `1px solid ${THEME.border}`,
        fontSize: 12, color: THEME.textDim, lineHeight: 1.6,
      }}>
        <strong style={{ color: THEME.textMuted }}>Disclaimer:</strong> This summary is auto-generated
        from your uploaded financial statements and is intended as a starting point for tax preparation.
        It is not tax advice. Consult a qualified tax professional for your specific situation.
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════ */

function SectionCard({ icon, title, total, count, color, expanded, onToggle, isMobile, children }: {
  icon: string; title: string; total: number; count: number; color: string;
  expanded: boolean; onToggle: () => void; isMobile: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, marginBottom: 16, overflow: "hidden" }}>
      <button onClick={onToggle} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        padding: isMobile ? "14px 12px" : "16px 20px",
        background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
      }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color }}>{title}</div>
          <div style={{ fontSize: 11, color: THEME.textDim, marginTop: 2 }}>
            {count} transaction{count !== 1 ? "s" : ""}
          </div>
        </div>
        <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: THEME.text, marginRight: 8 }}>
          ${fmt(total)}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={THEME.textDim} strokeWidth="2" strokeLinecap="round"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && (
        <div style={{ padding: isMobile ? "0 12px 14px" : "0 20px 18px" }}>{children}</div>
      )}
    </div>
  );
}

function MerchantGroup({ mg, color, isMobile, isLast }: {
  mg: { merchant: string; total: number; txs: { merchant: string; amount: number; date: string }[] | undefined };
  color: string; isMobile: boolean; isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  const txs = mg.txs || [];
  return (
    <div>
      {/* Merchant row */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 70px" : "1fr 110px",
          gap: 8, padding: "8px 14px",
          borderBottom: !open && !isLast ? `1px solid ${THEME.border}22` : "none",
          alignItems: "center", cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = `${color}06`; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: THEME.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 9, color, opacity: 0.5 }}>{open ? "▲" : "▼"}</span>
          {mg.merchant}
          <span style={{ fontSize: 10, color: THEME.textDim, fontWeight: 400 }}>({txs.length})</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color, textAlign: "right", whiteSpace: "nowrap" }}>
          ${fmt(mg.total)}
        </div>
      </div>

      {/* Individual transactions */}
      {open && (
        <div style={{ background: `${color}04`, borderBottom: !isLast ? `1px solid ${THEME.border}22` : "none" }}>
          {txs.map((tx, k) => (
            <div key={k} style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 70px" : "1fr 130px 90px",
              gap: 8, padding: "5px 24px",
              borderBottom: k < txs.length - 1 ? `1px solid ${THEME.border}11` : "none",
              alignItems: "center",
            }}>
              <div style={{ fontSize: 11, color: THEME.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tx.merchant}
              </div>
              {!isMobile && (
                <div style={{ fontSize: 11, color: THEME.textDim, whiteSpace: "nowrap" }}>{tx.date}</div>
              )}
              <div style={{ fontSize: 11, fontWeight: 600, color, textAlign: "right", whiteSpace: "nowrap" }}>
                ${fmt(tx.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubcategoryTable({ rows, color, isMobile, isIncome }: {
  rows: SubRow[]; color: string; isMobile: boolean; isIncome: boolean;
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  if (rows.length === 0) return null;
  const colLabel = isIncome ? "Client / Payer" : "Subcategory";

  const toggleRow = (label: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  return (
    <div>
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 100px" : "1fr 110px",
        gap: 8, padding: "6px 0", borderBottom: `1px solid ${THEME.border}`,
      }}>
        <div style={COL_HDR}>{colLabel}</div>
        <div style={{ ...COL_HDR, textAlign: "right" }}>Amount</div>
      </div>

      {rows.map((row, i) => {
        const hasDetails = row.txDetails && row.txDetails.length > 0;
        const isExpanded = expandedRows.has(row.label);

        // Group txDetails by merchant
        const merchantGroups: { merchant: string; total: number; txs: typeof row.txDetails }[] = [];
        if (hasDetails) {
          const mgMap = new Map<string, { total: number; txs: { merchant: string; amount: number; date: string }[] }>();
          for (const tx of row.txDetails!) {
            const entry = mgMap.get(tx.merchant) || { total: 0, txs: [] };
            entry.total += tx.amount;
            entry.txs.push(tx);
            mgMap.set(tx.merchant, entry);
          }
          merchantGroups.push(
            ...Array.from(mgMap.entries())
              .sort((a, b) => b[1].total - a[1].total)
              .map(([merchant, v]) => ({ merchant, total: v.total, txs: v.txs }))
          );
        }

        return (
          <div key={row.label + i}>
            {/* Subcategory row */}
            <div
              onClick={() => { if (row.amount > 0 && hasDetails) toggleRow(row.label); }}
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 100px" : "1fr 110px",
                gap: 8, padding: "9px 0",
                borderBottom: !isExpanded && i < rows.length - 1 ? `1px solid ${THEME.border}44` : "none",
                alignItems: "center",
                cursor: row.amount > 0 && hasDetails ? "pointer" : "default",
                borderRadius: 6, transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { if (row.amount > 0 && hasDetails) e.currentTarget.style.background = `${color}08`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: row.amount > 0 ? THEME.text : THEME.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                {row.label}
                {row.amount > 0 && hasDetails && (
                  <span style={{ fontSize: 10, color, opacity: 0.7 }}>{isExpanded ? "▲" : "▼"}</span>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: row.amount > 0 ? color : THEME.textDim, textAlign: "right", whiteSpace: "nowrap" }}>
                ${fmt(row.amount)}
              </div>
            </div>

            {/* Merchant group level */}
            {hasDetails && isExpanded && (
              <div style={{ marginBottom: 8, borderRadius: 8, background: THEME.bg, border: `1px solid ${THEME.border}44`, overflow: "hidden" }}>
                {merchantGroups.map((mg, mi) => (
                  <MerchantGroup key={mg.merchant + mi} mg={mg} color={color} isMobile={isMobile} isLast={mi === merchantGroups.length - 1} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const COL_HDR: React.CSSProperties = {
  fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: THEME.textDim, fontWeight: 700,
};
