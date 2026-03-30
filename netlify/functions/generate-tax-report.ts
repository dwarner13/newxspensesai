import type { Handler } from "@netlify/functions";
import { admin } from "./_shared/supabase.js";

/* ──────────────────────────────────────────────────────────────
   POST /.netlify/functions/generate-tax-report
   Generates a branded HTML tax report for the given year.
   Returns Content-Type: text/html (user prints to PDF).
   ────────────────────────────────────────────────────────────── */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* ── Types ── */

interface Tx {
  category: string | null;
  merchant: string | null;
  amount: number;
  type: string;
  date: string;
  subcategory: string | null;
  description: string | null;
}

interface SubRow { label: string; count: number; amount: number }

interface Bucket { label: string; keywords: string[] }

/* ── Bucket definitions (mirrors TaxWorkspacePage) ── */

const VEHICLE_BUCKETS: Bucket[] = [
  { label: "Gas / Fuel", keywords: ["petro", "esso", "shell", "gas", "fuel", "co-op", "mobil", "7-eleven fuel", "husky"] },
  { label: "Car Payments", keywords: ["td loan", "car payment", "auto loan", "lns/pre"] },
  { label: "Registration", keywords: ["registry", "registration", "northtown registry"] },
  { label: "Insurance", keywords: ["car insurance", "vehicle insurance", "auto insurance"] },
  { label: "Repairs / Maintenance", keywords: ["oil change", "repair", "tire", "mechanic", "midas", "canadian tire auto", "maintenance"] },
  { label: "Parking", keywords: ["parking", "impark", "parkade"] },
  { label: "Car Wash", keywords: ["car wash"] },
];

const MEALS_BUCKETS: Bucket[] = [
  { label: "Coffee", keywords: ["tim hortons", "starbucks", "booster juice", "second cup", "good earth"] },
  { label: "Restaurants / Dining", keywords: ["pizza", "restaurant", "pub", "grill", "diner", "kitchen", "smittys", "wendys", "mcdonalds", "popeyes", "mr sub", "halong bay", "sushi", "thai", "wok", "buffet", "a&w", "subway", "kfc", "burger", "boston pizza", "earls", "cactus", "moxies", "original joe", "joey", "montanas"] },
  { label: "Fast Food / Takeout", keywords: ["uber eats", "doordash", "skip the dishes", "instacart"] },
  { label: "Groceries / Convenience", keywords: ["7-eleven", "mac's", "circle k"] },
  { label: "Entertainment", keywords: ["movie", "concert", "sport", "fitness", "theatre", "cinema", "netflix", "spotify"] },
  { label: "Alcohol", keywords: ["liquor", "econo liquor", "beer", "wine", "alcanna", "wine and beyond"] },
  { label: "Supplements / Health Food", keywords: ["supplement", "ls supplement", "popeye supplement", "gnc", "nutrition"] },
];

const HOME_BUCKETS: Bucket[] = [
  { label: "Mortgage / Rent", keywords: ["mortgage", "b/m payt", "celtic group", "rent", "rnt payt"] },
  { label: "Condo Fees", keywords: ["condo fee", "strata", "hoa"] },
  { label: "Utilities — Electric", keywords: ["epcor", "electricity", "electric"] },
  { label: "Utilities — Gas / Heat", keywords: ["atco", "direct energy", "enmax"] },
  { label: "Utilities — Water", keywords: ["epcor water", "water bill"] },
  { label: "Internet", keywords: ["telus", "shaw", "internet"] },
  { label: "Home Insurance", keywords: ["home insurance", "property insurance", "tenant insurance"] },
];

const BUSINESS_BUCKETS: Bucket[] = [
  { label: "Advertising / Marketing", keywords: ["dreamhost", "seo", "amazon prime business", "amazon", "google ads", "facebook", "advertising"] },
  { label: "Software / Subscriptions", keywords: ["cursor", "openai", "youtube", "everlance", "ranked ai", "adobe", "microsoft", "canva", "zoom", "slack", "notion", "dropbox", "chatgpt"] },
  { label: "Professional Fees", keywords: ["accounting", "ncube", "2nd site", "legal", "bookkeeping", "consulting"] },
  { label: "Bank Fees", keywords: ["premium plan", "handling chg", "interest charge", "service charge", "bank fee", "nsf", "overdraft"] },
  { label: "Business Insurance", keywords: ["imperial pfs", "business insurance", "liability"] },
];

const PERSONAL_BUCKETS: Bucket[] = [
  { label: "Groceries", keywords: ["sobeys", "save on", "safeway", "loblaws", "walmart", "mac's", "superstore", "costco", "no frills", "freshco"] },
  { label: "Grooming / Salon", keywords: ["shadified", "salon", "barber", "hair", "q hair", "grooming"] },
  { label: "Wellness / Massage", keywords: ["massage", "ting ting", "yo yo", "lewis massage", "tulip garden", "songblossom", "spa", "wellness"] },
  { label: "Transfers", keywords: ["interac etrnsfr sent", "e-transfer", "etransfer"] },
  { label: "Loan Payments", keywords: ["easyfinancial", "cash money", "springfinancial", "national money", "flexiti"] },
  { label: "Credit Card Payments", keywords: ["capital one", "canadian tire bank", "cc payment"] },
  { label: "Investments", keywords: ["bmo inv inc", "tfsa", "rrsp", "wealthsimple", "questrade", "investment"] },
  { label: "Shopping", keywords: ["winners", "dollar tree", "shoppers drug mart", "marshalls", "homesense"] },
];

interface SectionDef {
  id: string;
  title: string;
  deductible: boolean;
  matchFn: (tx: Tx) => boolean;
  buckets: Bucket[];
}

const SECTIONS: SectionDef[] = [
  { id: "income", title: "Income", deductible: false, matchFn: (tx) => tx.type === "income", buckets: [] },
  { id: "vehicle", title: "Vehicle Expenses", deductible: true, matchFn: (tx) => ["Transportation","Car & Truck Expenses"].includes(tx.category || ""), buckets: VEHICLE_BUCKETS },
  { id: "home", title: "Home / Rent / Lease", deductible: true, matchFn: (tx) => ["Housing","Rent or Lease","Rent","Mortgage"].includes(tx.category || ""), buckets: HOME_BUCKETS },
  { id: "meals", title: "Meals & Entertainment", deductible: true, matchFn: (tx) => ["Food & Dining","Meals & Entertainment","Entertainment"].includes(tx.category || ""), buckets: MEALS_BUCKETS },
  { id: "business", title: "Business Expenses", deductible: true, matchFn: (tx) => ["Advertising","Other Expenses","Professional Services","Employee Benefits","Subscriptions","Bank Fees","Business"].includes(tx.category || ""), buckets: BUSINESS_BUCKETS },
  { id: "personal", title: "Personal (Not Deductible)", deductible: false, matchFn: (tx) => ["Personal","Personal Care","Shopping","Groceries","Debt Payments","Transfers"].includes(tx.category || ""), buckets: PERSONAL_BUCKETS },
];

/* ── Grouping helpers ── */

function groupIntoBuckets(txs: Tx[], buckets: Bucket[]): SubRow[] {
  const map = new Map<string, { count: number; total: number }>();
  for (const b of buckets) map.set(b.label, { count: 0, total: 0 });
  map.set("Other", { count: 0, total: 0 });

  for (const tx of txs) {
    const merch = (tx.merchant || tx.subcategory || "").toLowerCase();
    let matched = false;
    for (const b of buckets) {
      if (b.keywords.some((kw) => merch.includes(kw))) {
        const e = map.get(b.label)!;
        e.count++; e.total += Math.abs(tx.amount);
        matched = true; break;
      }
    }
    if (!matched) { const e = map.get("Other")!; e.count++; e.total += Math.abs(tx.amount); }
  }

  const rows: SubRow[] = [];
  for (const b of buckets) { const e = map.get(b.label)!; rows.push({ label: b.label, count: e.count, amount: e.total }); }
  const other = map.get("Other")!;
  if (other.count > 0) rows.push({ label: "Other", count: other.count, amount: other.total });
  return rows;
}

function groupByMerchant(txs: Tx[]): SubRow[] {
  const map = new Map<string, { count: number; total: number }>();
  for (const tx of txs) {
    const key = tx.merchant?.trim() || "(unknown)";
    const e = map.get(key) || { count: 0, total: 0 };
    e.count++; e.total += Math.abs(tx.amount);
    map.set(key, e);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([label, v]) => ({ label, count: v.count, amount: v.total }));
}

/* ── Format ── */

const $ = (n: number) => n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── Executive summary via Claude ── */

async function generateExecutiveSummary(data: {
  year: number;
  totalIncome: number;
  totalExpenses: number;
  totalDeductions: number;
  netTaxable: number;
  sectionTotals: Record<string, number>;
  vehicleDeduction: number;
  homeDeduction: number;
  mealsDeduction: number;
  topClients: SubRow[];
}): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return buildFallbackSummary(data);

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const anthropic = new Anthropic({ apiKey: key });

    const prompt = `You are Prime, the senior financial advisor at XspensesAI. Write a 3-4 paragraph executive summary for an accountant reviewing this client's ${data.year} tax data. Be specific with numbers. Use professional language.

DATA:
- Total Business Income: $${$(data.totalIncome)} from ${data.topClients.length} client(s): ${data.topClients.slice(0, 5).map(c => `${c.label} ($${$(c.amount)})`).join(", ")}
- Total Business Expenses: $${$(data.totalExpenses)}
- Vehicle Expenses: $${$(data.sectionTotals["vehicle"] || 0)}, Deductible: $${$(data.vehicleDeduction)}
- Home Office Expenses: $${$(data.sectionTotals["home"] || 0)}, Deductible: $${$(data.homeDeduction)}
- Meals & Entertainment: $${$(data.sectionTotals["meals"] || 0)}, Deductible (50%): $${$(data.mealsDeduction)}
- Business Expenses: $${$(data.sectionTotals["business"] || 0)}
- Total Deductions: $${$(data.totalDeductions)}
- Net Taxable Business Income: $${$(data.netTaxable)}
- Personal Expenses (not deductible): $${$(data.sectionTotals["personal"] || 0)}

Write the summary. Do not use markdown formatting. Use plain paragraphs.`;

    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const text = resp.content?.[0];
    if (text && text.type === "text") return text.text;
    return buildFallbackSummary(data);
  } catch (err) {
    console.error("[generate-tax-report] Claude summary error:", err);
    return buildFallbackSummary(data);
  }
}

function buildFallbackSummary(d: { year: number; totalIncome: number; totalExpenses: number; totalDeductions: number; netTaxable: number }): string {
  return `For the ${d.year} tax year, total business income was $${$(d.totalIncome)}. Total business expenses were $${$(d.totalExpenses)}. After applying eligible deductions of $${$(d.totalDeductions)}, the estimated net taxable business income is $${$(d.netTaxable)}. This report was auto-generated from uploaded financial statements and should be reviewed by a qualified tax professional.`;
}

/* ══════════════════════════════════════════════════
   HTML builder
   ══════════════════════════════════════════════════ */

function esc(s: string | null | undefined): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildHTML(params: {
  year: number;
  preparedDate: string;
  executiveSummary: string;
  incomeTxs: Tx[];
  incomeRows: SubRow[];
  totalIncome: number;
  sections: { title: string; deductible: boolean; rows: SubRow[]; total: number; txs: Tx[] }[];
  totalExpenses: number;
  totalDeductions: number;
  netTaxable: number;
  vehicleCfg: { total_km: number; business_km: number; pct: number; total: number; deduction: number };
  homeCfg: { total_sqft: number; office_sqft: number; pct: number; total: number; deduction: number };
  mealsTotal: number;
  phonePct: number;
  personalTotal: number;
}): string {
  const { year, preparedDate, executiveSummary, incomeRows, totalIncome, sections, totalExpenses, totalDeductions, netTaxable, vehicleCfg, homeCfg, mealsTotal, personalTotal } = params;

  const gold = "#d4a843";
  const dark = "#1a1a2e";
  const lightBg = "#f8f8fa";

  function tableRows(rows: SubRow[], color: string = dark): string {
    return rows.map((r, i) =>
      `<tr style="background:${i % 2 === 1 ? lightBg : "#fff"}">
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px">${esc(r.label)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;font-weight:600;color:${color}">$${$(r.amount)}</td>
      </tr>`
    ).join("\n");
  }

  function detailRows(txs: Tx[]): string {
    const sorted = [...txs].sort((a, b) => {
      const catCmp = (a.category || "").localeCompare(b.category || "");
      if (catCmp !== 0) return catCmp;
      return a.date.localeCompare(b.date);
    });
    return sorted.map((tx, i) =>
      `<tr style="background:${i % 2 === 1 ? lightBg : "#fff"}">
        <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:11px">${esc(tx.date)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(tx.merchant || tx.description || "")}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:11px">${esc(tx.category)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:11px">${esc(tx.subcategory)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;font-size:11px;font-weight:600">$${$(Math.abs(tx.amount))}</td>
      </tr>`
    ).join("\n");
  }

  // Build expense section HTML
  let expenseSectionsHTML = "";
  for (const sec of sections) {
    if (sec.rows.length === 0 && sec.total === 0) continue;
    expenseSectionsHTML += `
      <div style="margin-bottom:24px">
        <h3 style="color:${gold};font-size:15px;margin:0 0 10px 0;padding-bottom:6px;border-bottom:2px solid ${gold}">${esc(sec.title)}${sec.deductible ? "" : ' <span style="color:#999;font-size:11px;font-weight:400">(not deductible)</span>'}</h3>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#f0f0f4">
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#666">Subcategory</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#666">Amount</th>
          </tr></thead>
          <tbody>${tableRows(sec.rows)}</tbody>
          <tfoot><tr style="background:#f0f0f4;font-weight:700">
            <td style="padding:8px 12px;font-size:13px">Total</td>
            <td style="padding:8px 12px;text-align:right;font-size:13px">$${$(sec.total)}</td>
          </tr></tfoot>
        </table>
        ${sec.title.includes("Meals") ? `<p style="font-size:11px;color:#888;margin:6px 0 0 0">* Meals &amp; entertainment are typically 50% deductible. Deductible amount: $${$(sec.total * 0.5)}</p>` : ""}
      </div>`;
  }

  // Collect all business txs for detail page
  const allBusinessTxs = sections.filter(s => s.deductible).flatMap(s => s.txs);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tax Report — ${year} — XspensesAI</title>
<style>
  @page { size: letter; margin: 0.75in; }
  @media print {
    .page-break { page-break-before: always; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: ${dark}; margin: 0; padding: 0; line-height: 1.5; font-size: 13px; }
  .page { max-width: 8.5in; margin: 0 auto; padding: 40px; }
  .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 9px; color: #999; padding: 8px; border-top: 1px solid #eee; }
  @media screen { .footer { position: relative; margin-top: 40px; } }
</style>
</head>
<body>

<!-- ═══ PAGE 1: COVER ═══ -->
<div class="page" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:90vh;text-align:center">
  <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,${gold},#a08030);display:flex;align-items:center;justify-content:center;margin-bottom:24px;box-shadow:0 4px 24px rgba(212,168,67,0.3)">
    <span style="font-size:36px;color:#0b1220">&#9813;</span>
  </div>
  <h1 style="font-size:32px;font-weight:800;color:${dark};margin:0 0 8px 0;letter-spacing:-0.5px">Tax Preparation Package</h1>
  <p style="font-size:16px;color:#666;margin:0 0 32px 0">Tax Year ${year}</p>
  <div style="width:60px;height:2px;background:${gold};margin:0 auto 32px auto"></div>
  <p style="font-size:14px;color:#444;margin:0 0 4px 0;font-weight:600">Prepared by XspensesAI</p>
  <p style="font-size:12px;color:#888;margin:0 0 4px 0">AI-Powered Financial Intelligence</p>
  <p style="font-size:12px;color:#888;margin:0">${esc(preparedDate)}</p>
</div>

<!-- ═══ PAGE 2: EXECUTIVE SUMMARY ═══ -->
<div class="page page-break">
  <h2 style="color:${gold};font-size:20px;margin:0 0 4px 0">Executive Summary</h2>
  <div style="width:40px;height:2px;background:${gold};margin:0 0 20px 0"></div>
  <div style="font-size:14px;line-height:1.7;color:#333">${executiveSummary.split("\n").filter(p => p.trim()).map(p => `<p style="margin:0 0 14px 0">${esc(p)}</p>`).join("\n")}</div>

  <div style="margin-top:28px;padding:20px;background:#faf8f3;border:1px solid #e8e0cc;border-radius:8px">
    <h3 style="color:${gold};font-size:14px;margin:0 0 12px 0">At a Glance</h3>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:6px 0;font-size:14px">Total Income</td><td style="padding:6px 0;text-align:right;font-size:14px;font-weight:700;color:#16a34a">$${$(totalIncome)}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px">Total Expenses</td><td style="padding:6px 0;text-align:right;font-size:14px;font-weight:700;color:#dc2626">$${$(totalExpenses)}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px">Total Deductions</td><td style="padding:6px 0;text-align:right;font-size:14px;font-weight:700;color:${gold}">$${$(totalDeductions)}</td></tr>
      <tr style="border-top:2px solid ${gold}"><td style="padding:10px 0 6px 0;font-size:15px;font-weight:700">Net Taxable Business Income</td><td style="padding:10px 0 6px 0;text-align:right;font-size:15px;font-weight:700">${netTaxable < 0 ? "-" : ""}$${$(Math.abs(netTaxable))}</td></tr>
    </table>
  </div>
</div>

<!-- ═══ PAGE 3: INCOME SUMMARY ═══ -->
<div class="page page-break">
  <h2 style="color:${gold};font-size:20px;margin:0 0 4px 0">Income Summary</h2>
  <div style="width:40px;height:2px;background:${gold};margin:0 0 20px 0"></div>
  <table style="width:100%;border-collapse:collapse">
    <thead><tr style="background:#f0f0f4">
      <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#666">Client / Payer</th>
      <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#666"># Payments</th>
      <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#666">Total</th>
    </tr></thead>
    <tbody>${incomeRows.map((r, i) =>
      `<tr style="background:${i % 2 === 1 ? lightBg : "#fff"}">
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px">${esc(r.label)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-size:13px">${r.count}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;font-weight:600;color:#16a34a">$${$(r.amount)}</td>
      </tr>`
    ).join("\n")}</tbody>
    <tfoot><tr style="background:#f0f0f4;font-weight:700">
      <td style="padding:8px 12px;font-size:13px" colspan="2">Total Income</td>
      <td style="padding:8px 12px;text-align:right;font-size:13px;color:#16a34a">$${$(totalIncome)}</td>
    </tr></tfoot>
  </table>
</div>

<!-- ═══ PAGE 4: EXPENSE SUMMARY ═══ -->
<div class="page page-break">
  <h2 style="color:${gold};font-size:20px;margin:0 0 4px 0">Expense Summary by Subcategory</h2>
  <div style="width:40px;height:2px;background:${gold};margin:0 0 20px 0"></div>
  ${expenseSectionsHTML}
</div>

<!-- ═══ PAGE 5: DEDUCTION CALCULATIONS ═══ -->
<div class="page page-break">
  <h2 style="color:${gold};font-size:20px;margin:0 0 4px 0">Deduction Calculations</h2>
  <div style="width:40px;height:2px;background:${gold};margin:0 0 20px 0"></div>

  <div style="margin-bottom:24px;padding:16px;border:1px solid #e0e0e0;border-radius:8px">
    <h3 style="font-size:14px;color:${gold};margin:0 0 10px 0">Vehicle Use Deduction</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr><td style="padding:4px 0">Total Vehicle Expenses</td><td style="text-align:right;font-weight:600">$${$(vehicleCfg.total)}</td></tr>
      <tr><td style="padding:4px 0">Total KM Driven</td><td style="text-align:right">${vehicleCfg.total_km.toLocaleString()} km</td></tr>
      <tr><td style="padding:4px 0">Business KM</td><td style="text-align:right">${vehicleCfg.business_km.toLocaleString()} km</td></tr>
      <tr><td style="padding:4px 0">Business Use %</td><td style="text-align:right;font-weight:600">${vehicleCfg.pct.toFixed(1)}%</td></tr>
      <tr style="border-top:1px solid #ccc"><td style="padding:8px 0;font-weight:700">Deductible Amount</td><td style="text-align:right;font-weight:700;color:${gold}">$${$(vehicleCfg.deduction)}</td></tr>
    </table>
  </div>

  <div style="margin-bottom:24px;padding:16px;border:1px solid #e0e0e0;border-radius:8px">
    <h3 style="font-size:14px;color:${gold};margin:0 0 10px 0">Home Office Deduction</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr><td style="padding:4px 0">Total Home Expenses</td><td style="text-align:right;font-weight:600">$${$(homeCfg.total)}</td></tr>
      <tr><td style="padding:4px 0">Total Sq Ft</td><td style="text-align:right">${homeCfg.total_sqft.toLocaleString()} sq ft</td></tr>
      <tr><td style="padding:4px 0">Office Sq Ft</td><td style="text-align:right">${homeCfg.office_sqft.toLocaleString()} sq ft</td></tr>
      <tr><td style="padding:4px 0">Office %</td><td style="text-align:right;font-weight:600">${homeCfg.pct.toFixed(1)}%</td></tr>
      <tr style="border-top:1px solid #ccc"><td style="padding:8px 0;font-weight:700">Deductible Amount</td><td style="text-align:right;font-weight:700;color:${gold}">$${$(homeCfg.deduction)}</td></tr>
    </table>
  </div>

  <div style="margin-bottom:24px;padding:16px;border:1px solid #e0e0e0;border-radius:8px">
    <h3 style="font-size:14px;color:${gold};margin:0 0 10px 0">Meals & Entertainment (50%)</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr><td style="padding:4px 0">Total Meals & Entertainment</td><td style="text-align:right;font-weight:600">$${$(mealsTotal)}</td></tr>
      <tr><td style="padding:4px 0">Deductible Rate</td><td style="text-align:right">50%</td></tr>
      <tr style="border-top:1px solid #ccc"><td style="padding:8px 0;font-weight:700">Deductible Amount</td><td style="text-align:right;font-weight:700;color:${gold}">$${$(mealsTotal * 0.5)}</td></tr>
    </table>
  </div>

  <div style="margin-top:28px;padding:20px;background:#faf8f3;border:2px solid ${gold};border-radius:8px">
    <h3 style="color:${gold};font-size:15px;margin:0 0 12px 0">Total Deductions Summary</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0">Vehicle Deduction</td><td style="text-align:right;font-weight:600">$${$(vehicleCfg.deduction)}</td></tr>
      <tr><td style="padding:6px 0">Home Office Deduction</td><td style="text-align:right;font-weight:600">$${$(homeCfg.deduction)}</td></tr>
      <tr><td style="padding:6px 0">Meals (50%)</td><td style="text-align:right;font-weight:600">$${$(mealsTotal * 0.5)}</td></tr>
      <tr><td style="padding:6px 0">Business Expenses (full)</td><td style="text-align:right;font-weight:600">$${$(sections.find(s => s.title === "Business Expenses")?.total || 0)}</td></tr>
      <tr style="border-top:2px solid ${gold}"><td style="padding:10px 0;font-size:16px;font-weight:700">TOTAL DEDUCTIONS</td><td style="text-align:right;font-size:16px;font-weight:700;color:${gold}">$${$(totalDeductions)}</td></tr>
    </table>
  </div>
</div>

<!-- ═══ PAGE 6: FINAL SUMMARY ═══ -->
<div class="page page-break">
  <h2 style="color:${gold};font-size:20px;margin:0 0 4px 0">Final Summary</h2>
  <div style="width:40px;height:2px;background:${gold};margin:0 0 20px 0"></div>

  <div style="padding:24px;border:2px solid ${gold};border-radius:12px;background:#faf8f3">
    <table style="width:100%;border-collapse:collapse;font-size:15px">
      <tr><td style="padding:10px 0">Total Business Income</td><td style="text-align:right;font-weight:700;color:#16a34a;font-size:18px">$${$(totalIncome)}</td></tr>
      <tr><td style="padding:10px 0">Total Deductions</td><td style="text-align:right;font-weight:700;color:${gold};font-size:18px">$${$(totalDeductions)}</td></tr>
      <tr style="border-top:2px solid ${gold}"><td style="padding:14px 0;font-size:18px;font-weight:800">Net Taxable Business Income</td><td style="text-align:right;font-size:22px;font-weight:800">${netTaxable < 0 ? "-" : ""}$${$(Math.abs(netTaxable))}</td></tr>
    </table>
  </div>

  <div style="margin-top:24px;padding:16px;border:1px solid #e0e0e0;border-radius:8px;background:#fff">
    <h3 style="font-size:13px;color:#888;margin:0 0 8px 0">Personal Expenses (Reference Only — Not Deductible)</h3>
    <p style="font-size:18px;font-weight:700;margin:0;color:#666">$${$(personalTotal)}</p>
  </div>
</div>

<!-- ═══ PAGE 7: TRANSACTION DETAIL ═══ -->
<div class="page page-break">
  <h2 style="color:${gold};font-size:20px;margin:0 0 4px 0">Business Transaction Detail</h2>
  <div style="width:40px;height:2px;background:${gold};margin:0 0 8px 0"></div>
  <p style="font-size:11px;color:#888;margin:0 0 16px 0">${allBusinessTxs.length} business transactions sorted by category, then date</p>
  <table style="width:100%;border-collapse:collapse">
    <thead><tr style="background:#f0f0f4">
      <th style="padding:6px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#666">Date</th>
      <th style="padding:6px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#666">Description</th>
      <th style="padding:6px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#666">Category</th>
      <th style="padding:6px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#666">Subcategory</th>
      <th style="padding:6px 10px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#666">Amount</th>
    </tr></thead>
    <tbody>${detailRows(allBusinessTxs)}</tbody>
  </table>
</div>

<!-- FOOTER -->
<div class="footer">
  Generated by XspensesAI &bull; xspensesai.com &bull; Not tax advice — consult your accountant &bull; Prepared ${esc(preparedDate)}
</div>

</body>
</html>`;
}

/* ══════════════════════════════════════════════════
   Handler
   ══════════════════════════════════════════════════ */

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { ...CORS, "Content-Type": "application/json" }, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
  }

  try {
    const userId = event.headers["x-user-id"] || event.headers["X-User-Id"];
    if (!userId) {
      return { statusCode: 401, headers: { ...CORS, "Content-Type": "application/json" }, body: JSON.stringify({ ok: false, error: "Missing x-user-id header" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const year: number = body.year || 2024;
    const vehicleCfgInput = body.vehicle_config || { total_km: 0, business_km: 0 };
    const homeCfgInput = body.home_office_config || { total_sqft: 0, office_sqft: 0 };

    // Fetch transactions
    const sb = admin();
    const { data: txData, error: txError } = await sb
      .from("transactions")
      .select("category, merchant, amount, type, date, subcategory, description")
      .eq("user_id", userId)
      .gte("date", `${year}-01-01`)
      .lt("date", `${year + 1}-01-01`)
      .order("date", { ascending: false });

    if (txError) {
      return { statusCode: 500, headers: { ...CORS, "Content-Type": "application/json" }, body: JSON.stringify({ ok: false, error: txError.message }) };
    }

    const transactions = (txData || []) as Tx[];

    // Assign txs to sections (first match wins)
    const claimed = new Set<number>();
    const sectionResults: { id: string; title: string; deductible: boolean; rows: SubRow[]; total: number; txs: Tx[] }[] = [];

    for (const section of SECTIONS) {
      const matched: Tx[] = [];
      transactions.forEach((tx, idx) => {
        if (claimed.has(idx)) return;
        if (section.matchFn(tx)) { matched.push(tx); claimed.add(idx); }
      });
      const rows = section.buckets.length > 0 ? groupIntoBuckets(matched, section.buckets) : groupByMerchant(matched);
      const total = matched.reduce((s, t) => s + Math.abs(t.amount), 0);
      sectionResults.push({ id: section.id, title: section.title, deductible: section.deductible, rows, total, txs: matched });
    }

    const incomeSec = sectionResults.find(s => s.id === "income")!;
    const vehicleSec = sectionResults.find(s => s.id === "vehicle")!;
    const homeSec = sectionResults.find(s => s.id === "home")!;
    const mealsSec = sectionResults.find(s => s.id === "meals")!;
    const businessSec = sectionResults.find(s => s.id === "business")!;
    const personalSec = sectionResults.find(s => s.id === "personal")!;

    const totalIncome = incomeSec.total;
    const totalExpenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + Math.abs(t.amount), 0);

    // Deduction calculations
    const vPct = vehicleCfgInput.total_km > 0 ? Math.min(100, (vehicleCfgInput.business_km / vehicleCfgInput.total_km) * 100) : 0;
    const vehicleDeduction = vehicleSec.total * (vPct / 100);

    const hPct = homeCfgInput.total_sqft > 0 ? Math.min(100, (homeCfgInput.office_sqft / homeCfgInput.total_sqft) * 100) : 0;
    const homeDeduction = homeSec.total * (hPct / 100);

    const mealsDeduction = mealsSec.total * 0.5;

    const totalDeductions = vehicleDeduction + homeDeduction + mealsDeduction + businessSec.total;
    const netTaxable = totalIncome - totalDeductions;

    // Generate executive summary via Claude
    const sectionTotals: Record<string, number> = {};
    for (const s of sectionResults) sectionTotals[s.id] = s.total;

    const executiveSummary = await generateExecutiveSummary({
      year, totalIncome, totalExpenses, totalDeductions, netTaxable, sectionTotals,
      vehicleDeduction, homeDeduction, mealsDeduction: mealsSec.total * 0.5,
      topClients: incomeSec.rows,
    });

    const preparedDate = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

    const html = buildHTML({
      year, preparedDate, executiveSummary,
      incomeTxs: incomeSec.txs, incomeRows: incomeSec.rows, totalIncome,
      sections: sectionResults.filter(s => s.id !== "income"),
      totalExpenses, totalDeductions, netTaxable,
      vehicleCfg: { total_km: vehicleCfgInput.total_km, business_km: vehicleCfgInput.business_km, pct: vPct, total: vehicleSec.total, deduction: vehicleDeduction },
      homeCfg: { total_sqft: homeCfgInput.total_sqft, office_sqft: homeCfgInput.office_sqft, pct: hPct, total: homeSec.total, deduction: homeDeduction },
      mealsTotal: mealsSec.total,
      phonePct: body.phone_business_pct || 0,
      personalTotal: personalSec.total,
    });

    return {
      statusCode: 200,
      headers: {
        ...CORS,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="tax-report-${year}.html"`,
      },
      body: html,
    };
  } catch (err: any) {
    console.error("[generate-tax-report] Error:", err);
    return {
      statusCode: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: err?.message || "Internal error" }),
    };
  }
};
