import type { Handler } from "@netlify/functions";
import { admin } from "./_shared/supabase.js";

/* ──────────────────────────────────────────────────────────────
   POST /.netlify/functions/generate-tax-report
   Generates a clean 3-page HTML tax summary for accountant review.
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
  merchant_name: string | null;
  amount: number;
  type: string;
  date: string;
  subcategory: string | null;
  description: string | null;
}

interface SubRow { label: string; count: number; amount: number }
interface Bucket { label: string; keywords: string[] }

/* ── Bucket definitions ── */

const VEHICLE_BUCKETS: Bucket[] = [
  { label: "Gas / Fuel", keywords: ["petro", "esso", "shell", "gas", "fuel", "co-op", "mobil", "7-eleven fuel", "husky", "kollbrook", "canco petroleum", "circle k"] },
  { label: "Car Payments / Loan", keywords: ["td loan", "car payment", "auto loan", "lns/pre", "car loan"] },
  { label: "Registration", keywords: ["registry", "registration", "northtown registry"] },
  { label: "Insurance", keywords: ["economical", "peace hills", "imperial pfs", "vehicle insurance", "auto insurance", "car insurance"] },
  { label: "Repairs / Maintenance", keywords: ["oil change", "repair", "tire", "mechanic", "midas", "maintenance", "jiffy lube", "revolution moto", "river city hyundai", "northstar hyundai"] },
  { label: "Parking", keywords: ["parking", "impark", "parkade"] },
  { label: "Car Wash", keywords: ["car wash", "kenyon"] },
  { label: "Car Rental", keywords: ["enterprise", "avis", "hertz", "national car"] },
];

const HOME_BUCKETS: Bucket[] = [
  { label: "Mortgage / Rent", keywords: ["mortgage", "b/m payt", "rent", "rnt payt", "celtic group", "b/mpayt"] },
  { label: "Condo Fees", keywords: ["condo fee", "strata", "hoa", "celtic"] },
  { label: "Utilities – Electric", keywords: ["epcor", "electricity", "electric", "kubra", "ez-pay", "ez pay"] },
  { label: "Utilities – Gas / Heat", keywords: ["atco", "direct energy", "enmax"] },
  { label: "Internet / Phone", keywords: ["telus", "shaw", "internet", "rogers", "fido"] },
  { label: "Home Insurance", keywords: ["sandbox mutual", "home insurance", "property insurance", "tenant insurance"] },
];

const MEALS_BUCKETS: Bucket[] = [
  { label: "Coffee", keywords: ["tim hortons", "timhorton", "starbucks", "booster juice", "second cup", "good earth", "waves coffee"] },
  { label: "Restaurants / Dining", keywords: ["pizza", "restaurant", "pub", "grill", "diner", "kitchen", "mcdonald", "subway", "kfc", "burger", "earls", "cactus", "moxies", "boston pizza", "swiss chalet", "five guys", "wing snob", "kaiming", "beijing house", "edo japan", "pho hoan", "chopped leaf", "blackjacks", "flame & barrel", "eclipse restaurant", "saratoga"] },
  { label: "Fast Food / Takeout", keywords: ["uber eats", "doordash", "skip the dishes", "instacart"] },
  { label: "Groceries / Convenience", keywords: ["7-eleven", "7 eleven", "mac's", "circle k"] },
  { label: "Alcohol", keywords: ["liquor", "econo liquor", "beer", "wine", "alcanna"] },
];

const BUSINESS_BUCKETS: Bucket[] = [
  { label: "Advertising / Marketing", keywords: ["advertising", "marketing", "dreamhost", "seo", "google ads", "facebook"] },
  { label: "Software / Subscriptions", keywords: ["software", "subscriptions", "cursor", "openai", "adobe", "microsoft", "canva", "zoom", "netlify", "paddle.net", "netflix", "aiprm", "envato", "supabase", "anthropic", "github", "cloudflare", "figma", "fastmail", "n8n", "zoho", "everlance", "perplexity", "contabo", "managewp", "railway", "godaddy"] },
  { label: "Professional Fees", keywords: ["professional fees", "professional services", "accounting", "legal", "bookkeeping", "consulting"] },
  { label: "Bank Fees / Interest", keywords: ["bank fees", "bank fee", "interest charges", "premium plan", "handling chg", "interest charge", "service charge", "nsf", "overdraft", "balance protector", "cash advance", "overlimit"] },
  { label: "Business Insurance", keywords: ["business insurance", "liability"] },
  { label: "Phone / Cell", keywords: ["phone / cell", "rogers", "telus"] },
];

interface SectionDef {
  id: string;
  title: string;
  note?: string;
  matchFn: (tx: Tx) => boolean;
  buckets: Bucket[];
}

const SECTIONS: SectionDef[] = [
  {
    id: "income", title: "Income", matchFn: (tx) => tx.type === "income", buckets: [],
  },
  {
    id: "vehicle", title: "Vehicle Expenses",
    note: "Enter odometer readings below to calculate business-use percentage",
    matchFn: (tx) => tx.category === "Transportation" || tx.category === "Automotive" || ["Gas & Fuel","Parking","Vehicle Maintenance","Vehicle Registration","Car Loan","Car Wash","Car Rental"].includes(tx.subcategory || ""),
    buckets: VEHICLE_BUCKETS,
  },
  {
    id: "home", title: "Home / Rent / Utilities",
    matchFn: (tx) => tx.category === "Rent or Lease" || tx.category === "Utilities" || tx.category === "Housing" || tx.category === "Home / Rent / Lease" || ["Mortgage / Rent","Condo Fees","Home Insurance"].includes(tx.subcategory || ""),
    buckets: HOME_BUCKETS,
  },
  {
    id: "meals", title: "Meals & Entertainment",
    note: "CRA allows 50% deduction for meals and entertainment",
    matchFn: (tx) => tx.category === "Food & Dining" || (tx.category === "Entertainment" && !["Golf","Gambling","Events / Tickets"].includes(tx.subcategory || "")),
    buckets: MEALS_BUCKETS,
  },
  {
    id: "business", title: "Business Expenses",
    matchFn: (tx) => tx.category === "Subscriptions" || tx.category === "Bank Fees" || tx.category === "Advertising" || tx.category === "Technology" || tx.category === "Professional Services" || tx.category === "Business Expenses" || tx.subcategory === "Phone / Cell" || tx.subcategory === "Business Insurance",
    buckets: BUSINESS_BUCKETS,
  },
  {
    id: "personal", title: "Personal Expenses",
    note: "For reference only — these are not business deductions",
    matchFn: (tx) => tx.type === "expense",
    buckets: [],
  },
];

/* ── Helpers ── */

function groupIntoBuckets(txs: Tx[], buckets: Bucket[]): SubRow[] {
  const map = new Map<string, { count: number; total: number }>();
  for (const b of buckets) map.set(b.label, { count: 0, total: 0 });
  map.set("Other", { count: 0, total: 0 });

  for (const tx of txs) {
    const merch = (tx.merchant_name || tx.merchant || "").toLowerCase();
    const subcat = (tx.subcategory || "").toLowerCase();
    let matched = false;

    if (subcat) {
      for (const b of buckets) {
        if (b.label.toLowerCase() === subcat || b.keywords.some((kw) => subcat === kw.toLowerCase())) {
          const e = map.get(b.label)!; e.count++; e.total += Math.abs(tx.amount); matched = true; break;
        }
      }
    }
    if (!matched) {
      for (const b of buckets) {
        if (b.keywords.some((kw) => merch.includes(kw))) {
          const e = map.get(b.label)!; e.count++; e.total += Math.abs(tx.amount); matched = true; break;
        }
      }
    }
    if (!matched) { const e = map.get("Other")!; e.count++; e.total += Math.abs(tx.amount); }
  }

  const rows: SubRow[] = [];
  for (const b of buckets) { const e = map.get(b.label)!; if (e.total > 0) rows.push({ label: b.label, count: e.count, amount: e.total }); }
  const other = map.get("Other")!;
  if (other.count > 0) rows.push({ label: "Other", count: other.count, amount: other.total });
  return rows;
}

function groupByMerchant(txs: Tx[]): SubRow[] {
  const map = new Map<string, { count: number; total: number }>();
  for (const tx of txs) {
    const key = tx.merchant_name?.trim() || tx.merchant?.trim() || "(unknown)";
    const e = map.get(key) || { count: 0, total: 0 };
    e.count++; e.total += Math.abs(tx.amount);
    map.set(key, e);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([label, v]) => ({ label, count: v.count, amount: v.total }));
}

const fmt = (n: number) => n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function esc(s: string | null | undefined): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ══════════════════════════════════════════════════
   HTML Builder — Clean 3-page report
   ══════════════════════════════════════════════════ */

function buildHTML(params: {
  year: number;
  preparedDate: string;
  userName: string;
  incomeRows: SubRow[];
  totalIncome: number;
  sectionResults: { id: string; title: string; note?: string; rows: SubRow[]; total: number }[];
  vehicleCfg: { opening_km: number; closing_km: number; total_km: number; business_km: number };
}): string {
  const { year, preparedDate, userName, incomeRows, totalIncome, sectionResults, vehicleCfg } = params;

  const gold = "#c8a64e";
  const dark = "#1a1a2e";
  const lightBg = "#f8f8fa";

  const expenseSections = sectionResults.filter(s => s.id !== "income" && s.id !== "personal");
  const personalSection = sectionResults.find(s => s.id === "personal");
  const totalBusinessExpenses = expenseSections.reduce((s, sec) => s + sec.total, 0);
  const vehicleSection = sectionResults.find(s => s.id === "vehicle");
  const mealsSection = sectionResults.find(s => s.id === "meals");

  function sectionTable(rows: SubRow[], colorHeader = dark): string {
    if (rows.length === 0) return `<p style="color:#999;font-size:12px;font-style:italic">No transactions recorded.</p>`;
    return `
      <table style="width:100%;border-collapse:collapse;margin-bottom:4px">
        <thead>
          <tr style="background:#f0f0f4">
            <th style="padding:7px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#666;font-weight:600">Category</th>
            <th style="padding:7px 12px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#666;font-weight:600"># Txns</th>
            <th style="padding:7px 12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#666;font-weight:600">Amount (CAD)</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, i) => `
            <tr style="background:${i % 2 === 1 ? lightBg : "#fff"}">
              <td style="padding:7px 12px;border-bottom:1px solid #eee;font-size:12px">${esc(r.label)}</td>
              <td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:center;font-size:12px;color:#888">${r.count}</td>
              <td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:right;font-size:12px;font-weight:600">$${fmt(r.amount)}</td>
            </tr>`).join("")}
        </tbody>
      </table>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tax Summary ${year} — XspensesAI</title>
<style>
  @page { size: letter; margin: 0.65in; }
  @media print {
    .page-break { page-break-before: always; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: ${dark}; margin: 0; padding: 0; line-height: 1.5; font-size: 13px; }
  .page { max-width: 8.5in; margin: 0 auto; padding: 36px 40px; }
  .section-header { color: ${gold}; font-size: 15px; font-weight: 700; margin: 24px 0 4px 0; padding-bottom: 5px; border-bottom: 2px solid ${gold}; }
  .section-note { font-size: 11px; color: #888; font-style: italic; margin: 0 0 10px 0; }
  .total-row td { font-weight: 700; font-size: 13px; padding: 8px 12px; background: #f0f0f4; }
  .footer { text-align: center; font-size: 9px; color: #aaa; padding: 12px; border-top: 1px solid #eee; margin-top: 32px; }
</style>
</head>
<body>

<!-- ═══ PAGE 1: COVER + INCOME SUMMARY ═══ -->
<div class="page">

  <!-- Header -->
  <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:16px;border-bottom:3px solid ${gold};margin-bottom:24px">
    <div>
      <div style="font-size:22px;font-weight:800;color:${dark};letter-spacing:-0.5px">Financial Summary for Tax Preparation</div>
      <div style="font-size:14px;color:#666;margin-top:2px">Tax Year ${year} &nbsp;·&nbsp; Prepared ${esc(preparedDate)}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:13px;font-weight:700;color:${dark}">${esc(userName)}</div>
      <div style="font-size:11px;color:#888">Generated by XspensesAI</div>
      <div style="font-size:11px;color:#888">xspensesai.com</div>
    </div>
  </div>

  <!-- Disclaimer banner -->
  <div style="background:#fffbf0;border:1px solid #e8d89a;border-radius:6px;padding:10px 14px;margin-bottom:24px;font-size:11px;color:#7a6a30;line-height:1.5">
    <strong>Note to Accountant:</strong> This document organizes financial data from uploaded bank and credit card statements for the ${year} tax year. It is not tax advice. All categorizations are approximate and should be verified. Deductible percentages for vehicle, home office, and meals should be determined by you based on the client's actual business use. All amounts are in Canadian dollars (CAD).
  </div>

  <!-- At a Glance -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:28px">
    <div style="border:1px solid #e0e0e0;border-radius:8px;padding:16px;text-align:center">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:6px">Total Income</div>
      <div style="font-size:20px;font-weight:800;color:#16a34a">$${fmt(totalIncome)}</div>
    </div>
    <div style="border:1px solid #e0e0e0;border-radius:8px;padding:16px;text-align:center">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:6px">Business Expenses</div>
      <div style="font-size:20px;font-weight:800;color:#dc2626">$${fmt(totalBusinessExpenses)}</div>
    </div>
    <div style="border:1px solid #e0e0e0;border-radius:8px;padding:16px;text-align:center">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:6px">Personal (Ref Only)</div>
      <div style="font-size:20px;font-weight:800;color:#94a3b8">$${fmt(personalSection?.total || 0)}</div>
    </div>
  </div>

  <!-- Income Summary -->
  <div class="section-header">Income</div>
  <p class="section-note">All income sources recorded from uploaded statements. Employment income should be verified against T4 slip(s).</p>
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
    <thead>
      <tr style="background:#f0f0f4">
        <th style="padding:7px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#666;font-weight:600">Source / Payer</th>
        <th style="padding:7px 12px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#666;font-weight:600"># Deposits</th>
        <th style="padding:7px 12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#666;font-weight:600">Amount (CAD)</th>
      </tr>
    </thead>
    <tbody>
      ${incomeRows.map((r, i) => `
        <tr style="background:${i % 2 === 1 ? lightBg : "#fff"}">
          <td style="padding:7px 12px;border-bottom:1px solid #eee;font-size:12px">${esc(r.label)}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:center;font-size:12px;color:#888">${r.count}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:right;font-size:12px;font-weight:600;color:#16a34a">$${fmt(r.amount)}</td>
        </tr>`).join("")}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="2">Total Income</td>
        <td style="text-align:right;color:#16a34a">$${fmt(totalIncome)}</td>
      </tr>
    </tfoot>
  </table>

</div>

<!-- ═══ PAGE 2: BUSINESS EXPENSES ═══ -->
<div class="page page-break">

  <div style="font-size:18px;font-weight:800;color:${dark};padding-bottom:12px;border-bottom:3px solid ${gold};margin-bottom:20px">
    Business Expenses — ${year}
  </div>

  ${expenseSections.map(sec => `
    <div class="section-header">${esc(sec.title)}
      <span style="float:right;font-size:14px;font-weight:800">$${fmt(sec.total)}</span>
    </div>
    ${sec.note ? `<p class="section-note">${esc(sec.note)}</p>` : ""}
    ${sectionTable(sec.rows)}
  `).join("")}

  <!-- Vehicle KM Log -->
  ${vehicleSection && vehicleSection.total > 0 ? `
  <div style="margin-top:20px;padding:14px 16px;border:1px solid #e8d89a;border-radius:8px;background:#fffbf0">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${gold};margin-bottom:10px">Vehicle Odometer Log</div>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <tr>
        <td style="padding:4px 0;color:#555">Opening Odometer (Jan 1)</td>
        <td style="text-align:right;font-weight:600">${vehicleCfg.opening_km > 0 ? vehicleCfg.opening_km.toLocaleString() + " km" : "— not entered —"}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#555">Closing Odometer (Dec 31)</td>
        <td style="text-align:right;font-weight:600">${vehicleCfg.closing_km > 0 ? vehicleCfg.closing_km.toLocaleString() + " km" : "— not entered —"}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#555">Total KM Driven</td>
        <td style="text-align:right;font-weight:600">${vehicleCfg.total_km > 0 ? vehicleCfg.total_km.toLocaleString() + " km" : "— not calculated —"}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#555">Business KM (from mileage log)</td>
        <td style="text-align:right;font-weight:600">${vehicleCfg.business_km > 0 ? vehicleCfg.business_km.toLocaleString() + " km" : "— not entered —"}</td>
      </tr>
      <tr style="border-top:1px solid #e8d89a">
        <td style="padding:8px 0;color:#333;font-weight:600">Total Vehicle Expenses</td>
        <td style="text-align:right;font-weight:700;color:${gold}">$${fmt(vehicleSection.total)}</td>
      </tr>
    </table>
    <p style="font-size:10px;color:#888;margin:8px 0 0 0">Business-use percentage and deductible amount to be determined by accountant based on mileage log.</p>
  </div>` : ""}

  <!-- Meals note -->
  ${mealsSection && mealsSection.total > 0 ? `
  <div style="margin-top:12px;padding:10px 14px;border:1px solid #ddd;border-radius:6px;background:#fafafa;font-size:11px;color:#666">
    <strong>Meals &amp; Entertainment:</strong> CRA generally allows a 50% deduction. Total recorded: <strong>$${fmt(mealsSection.total)}</strong>. Estimated 50% deduction: <strong>$${fmt(mealsSection.total * 0.5)}</strong>. Final deductible amount to be confirmed by accountant.
  </div>` : ""}

  <!-- Business expense total -->
  <div style="margin-top:20px;padding:16px 20px;border:2px solid ${gold};border-radius:8px;background:#fffbf0">
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      ${expenseSections.map(sec => `
        <tr>
          <td style="padding:5px 0;color:#444">${esc(sec.title)}</td>
          <td style="text-align:right;font-weight:600">$${fmt(sec.total)}</td>
        </tr>`).join("")}
      <tr style="border-top:2px solid ${gold}">
        <td style="padding:10px 0;font-size:15px;font-weight:800">Total Business Expenses</td>
        <td style="text-align:right;font-size:15px;font-weight:800;color:${gold}">$${fmt(totalBusinessExpenses)}</td>
      </tr>
    </table>
  </div>

</div>

<!-- ═══ PAGE 3: PERSONAL REFERENCE + NOTES ═══ -->
<div class="page page-break">

  <div style="font-size:18px;font-weight:800;color:${dark};padding-bottom:12px;border-bottom:3px solid #94a3b8;margin-bottom:20px">
    Personal Expenses — Reference Only
  </div>
  <p style="font-size:12px;color:#666;margin:0 0 16px 0">The following expenses are personal in nature and are <strong>not</strong> claimed as business deductions. Provided for reference and completeness only.</p>

  ${personalSection && personalSection.rows.length > 0 ? `
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
    <thead>
      <tr style="background:#f0f0f4">
        <th style="padding:7px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#666;font-weight:600">Category</th>
        <th style="padding:7px 12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#666;font-weight:600">Amount (CAD)</th>
      </tr>
    </thead>
    <tbody>
      ${personalSection.rows.slice(0, 20).map((r, i) => `
        <tr style="background:${i % 2 === 1 ? lightBg : "#fff"}">
          <td style="padding:7px 12px;border-bottom:1px solid #eee;font-size:12px;color:#666">${esc(r.label)}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:right;font-size:12px;color:#94a3b8">$${fmt(r.amount)}</td>
        </tr>`).join("")}
    </tbody>
    <tfoot>
      <tr style="background:#f0f0f4">
        <td style="padding:8px 12px;font-weight:700;font-size:13px">Total Personal (Not Deductible)</td>
        <td style="padding:8px 12px;text-align:right;font-weight:700;font-size:13px;color:#94a3b8">$${fmt(personalSection.total)}</td>
      </tr>
    </tfoot>
  </table>

  <div style="padding:12px 16px;background:#fff8f0;border:1px solid #f0d0a0;border-radius:6px;font-size:11px;color:#7a5a20;margin-bottom:20px">
    <strong>Note:</strong> Personal section includes credit card payments, loan repayments, TFSA/investment contributions, Interac transfers, and day-to-day personal spending. These are not expenses — they are either balance sheet movements or personal consumption. The large dollar amount does not represent tax-deductible items.
  </div>` : ""}

  <!-- Accountant notes section -->
  <div style="margin-top:24px">
    <div style="font-size:14px;font-weight:700;color:${dark};margin-bottom:12px;border-bottom:1px solid #e0e0e0;padding-bottom:6px">Notes for Accountant</div>
    ${[
      "All amounts sourced from uploaded BMO and credit card statements. Some cheque deposits may be identified generically.",
      "Employment income from Gordon Food Service should be verified against the T4 slip (Box 14).",
      "ROWNMI Marketing income should be verified against FreshBooks invoiced amount.",
      "Transfers section includes Interac e-transfers, TFSA contributions, and cost-sharing deposits — these are not income or expenses.",
      "Vehicle business-use % requires a mileage log. Odometer readings entered in app if available.",
      "Manulife amounts may include both disability insurance benefits and investment dividends — please classify appropriately.",
    ].map(note => `
      <div style="display:flex;gap:8px;margin-bottom:8px;font-size:12px;color:#444">
        <span style="color:${gold};font-weight:700;flex-shrink:0">›</span>
        <span>${note}</span>
      </div>`).join("")}
  </div>

  <!-- Final disclaimer -->
  <div class="footer">
    Generated by XspensesAI · xspensesai.com · This document organizes financial data for accountant review. It is not tax advice and does not constitute a complete tax return. Consult a qualified CPA or tax professional for all tax filing decisions. Prepared ${esc(preparedDate)}.
  </div>

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
    const year: number = body.year || new Date().getFullYear() - 1;
    const vehicleCfgInput = body.vehicle_config || {};

    const opening_km = vehicleCfgInput.opening_odometer || 0;
    const closing_km = vehicleCfgInput.closing_odometer || 0;
    const total_km = vehicleCfgInput.total_km || Math.max(0, closing_km - opening_km);
    const business_km = vehicleCfgInput.business_km || 0;

    // Fetch transactions
    const sb = admin();
    const { data: txData, error: txError } = await sb
      .from("transactions")
      .select("category, merchant, merchant_name, amount, type, date, subcategory, description")
      .eq("user_id", userId)
      .gte("date", `${year}-01-01`)
      .lt("date", `${year + 1}-01-01`)
      .order("date", { ascending: false })
      .limit(5000);

    if (txError) {
      return { statusCode: 500, headers: { ...CORS, "Content-Type": "application/json" }, body: JSON.stringify({ ok: false, error: txError.message }) };
    }

    // Fetch user profile for name
    const { data: profileData } = await sb
      .from("profiles")
      .select("display_name, full_name")
      .eq("id", userId)
      .single();

    const userName = profileData?.display_name || profileData?.full_name || "Client";
    const transactions = (txData || []) as Tx[];

    // Assign transactions to sections (first match wins, no double-counting)
    const claimed = new Set<number>();
    const sectionResults: { id: string; title: string; note?: string; rows: SubRow[]; total: number }[] = [];

    for (const section of SECTIONS) {
      const matched: Tx[] = [];
      transactions.forEach((tx, idx) => {
        if (claimed.has(idx)) return;
        if (section.matchFn(tx)) { matched.push(tx); claimed.add(idx); }
      });
      const rows = section.buckets.length > 0
        ? groupIntoBuckets(matched, section.buckets)
        : groupByMerchant(matched);
      const total = matched.reduce((s, t) => s + Math.abs(t.amount), 0);
      sectionResults.push({ id: section.id, title: section.title, note: section.note, rows, total });
    }

    const incomeSec = sectionResults.find(s => s.id === "income")!;
    const preparedDate = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

    const html = buildHTML({
      year,
      preparedDate,
      userName,
      incomeRows: incomeSec.rows,
      totalIncome: incomeSec.total,
      sectionResults,
      vehicleCfg: { opening_km, closing_km, total_km, business_km },
    });

    return {
      statusCode: 200,
      headers: {
        ...CORS,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="tax-summary-${year}.html"`,
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
