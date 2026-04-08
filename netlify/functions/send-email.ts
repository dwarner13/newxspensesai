import type { Handler, HandlerEvent } from "@netlify/functions";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const RESEND_API_URL = "https://api.resend.com/emails";

// ─── Agent identities ────────────────────────────────────────────────────────
const AGENTS = {
  prime:   { name: "Prime \u2655 | XspensesAI",  email: "prime@xspensesai.com" },
  tag:     { name: "Tag \u25C8 | XspensesAI",    email: "tag@xspensesai.com" },
  byte:    { name: "Byte \u25C9 | XspensesAI",   email: "byte@xspensesai.com" },
  goalie:  { name: "Goalie \u25CE | XspensesAI", email: "goalie@xspensesai.com" },
  noreply: { name: "XspensesAI",                 email: "noreply@xspensesai.com" },
};

// ─── Design tokens (matches your dark design system) ─────────────────────────
const COLORS = {
  bg:       "#0b1220",
  surface:  "#111a2e",
  border:   "#1e2d4a",
  text:     "#e8ecf4",
  muted:    "#8892a4",
  gold:     "#c8a64e",
  cyan:     "#22d3ee",
  purple:   "#a78bfa",
  green:    "#34d399",
  yellow:   "#fbbf24",
};

// ─── Shared helpers ───────────────────────────────────────────────────────────
function agentBadge(agentKey: string, color: string): string {
  const symbols: Record<string, string> = { prime: "\u2655", tag: "\u25C8", byte: "\u25C9", goalie: "\u25CE", noreply: "" };
  const agent = AGENTS[agentKey as keyof typeof AGENTS];
  if (!agent) return "";
  return `<div style="display:inline-block;padding:4px 12px;background:${color}15;border:1px solid ${color}33;border-radius:20px;font-size:12px;font-weight:700;color:${color};margin-bottom:16px;">
    ${symbols[agentKey] || ""} ${agent.name.split(" | ")[0]}
  </div>`;
}

function ctaButton(label: string, url: string, color: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
    <tr>
      <td style="background:${color};border-radius:8px;padding:14px 32px;">
        <a href="${url}" style="color:#0b1220;font-size:14px;font-weight:700;text-decoration:none;display:inline-block;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function statPill(label: string, value: string, color: string): string {
  return `<span style="display:inline-block;padding:6px 14px;background:${color}12;border:1px solid ${color}33;border-radius:8px;font-size:13px;color:${color};font-weight:600;margin-right:8px;margin-bottom:4px;">
    <span style="font-size:11px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.5px;">${label}</span>&nbsp;&nbsp;${value}
  </span>`;
}

// ─── Shared email wrapper ─────────────────────────────────────────────────────
function emailWrapper(content: string, previewText: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>XspensesAI</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:'Plus Jakarta Sans',system-ui,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${previewText}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <span style="font-size:28px;font-weight:700;color:${COLORS.gold};letter-spacing:-0.5px;">
                \u2655 XspensesAI
              </span>
              <p style="margin:4px 0 0;font-size:12px;color:${COLORS.muted};letter-spacing:1px;text-transform:uppercase;">
                AI Financial Intelligence
              </p>
            </td>
          </tr>

          <!-- Body card -->
          <tr>
            <td style="background:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:12px;padding:40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:${COLORS.muted};">
                XspensesAI \u00b7 Built for self-employed Canadians
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:${COLORS.muted};">
                You're receiving this because you have an XspensesAI account.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Email templates ──────────────────────────────────────────────────────────

function welcomeTemplate(data: {
  firstName: string;
  appUrl: string;
}): { subject: string; html: string; from: typeof AGENTS[keyof typeof AGENTS] } {
  const content = `
    ${agentBadge("prime", COLORS.gold)}
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${COLORS.text};">
      Welcome to XspensesAI, ${data.firstName} \uD83D\uDC4B
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${COLORS.muted};line-height:1.6;">
      Your AI financial team is standing by. I'm Prime \u2014 your CFO advisor. Here\'s who else is on your bench:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:12px;background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:8px;margin-bottom:8px;">
          <span style="color:${COLORS.cyan};font-weight:700;">\u25C8 Tag</span>
          <span style="color:${COLORS.muted};font-size:13px;margin-left:8px;">Auto-categorizes every transaction</span>
        </td>
      </tr>
      <tr><td style="height:8px;"></td></tr>
      <tr>
        <td style="padding:12px;background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:8px;">
          <span style="color:${COLORS.green};font-weight:700;">\u25C9 Byte</span>
          <span style="color:${COLORS.muted};font-size:13px;margin-left:8px;">Processes your bank statements via OCR</span>
        </td>
      </tr>
      <tr><td style="height:8px;"></td></tr>
      <tr>
        <td style="padding:12px;background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:8px;">
          <span style="color:${COLORS.yellow};font-weight:700;">\u25CE Goalie</span>
          <span style="color:${COLORS.muted};font-size:13px;margin-left:8px;">Tracks your financial goals</span>
        </td>
      </tr>
      <tr><td style="height:8px;"></td></tr>
      <tr>
        <td style="padding:12px;background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:8px;">
          <span style="color:${COLORS.green};font-weight:700;">L Ledger</span>
          <span style="color:${COLORS.muted};font-size:13px;margin-left:8px;">Your Canadian tax workspace</span>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:14px;color:${COLORS.muted};">
      <strong style="color:${COLORS.text};">Start here:</strong> Upload your first bank statement and watch the pipeline run.
    </p>

    ${ctaButton("Open XspensesAI \u2192", data.appUrl, COLORS.gold)}

    <p style="margin:32px 0 0;font-size:13px;color:${COLORS.muted};border-top:1px solid ${COLORS.border};padding-top:20px;">
      \u2014 Prime \u2655<br/>
      <span style="font-size:12px;">Your AI CFO Advisor \u00b7 XspensesAI</span>
    </p>
  `;

  return {
    subject: `Welcome to XspensesAI, ${data.firstName} \u2014 your AI financial team is ready`,
    html: emailWrapper(content, `Your AI financial team is standing by, ${data.firstName}.`),
    from: AGENTS.prime,
  };
}

function uploadCompleteTemplate(data: {
  firstName: string;
  statementName: string;
  transactionCount: number;
  income: string;
  expenses: string;
  appUrl: string;
}): { subject: string; html: string; from: typeof AGENTS[keyof typeof AGENTS] } {
  const content = `
    ${agentBadge("byte", COLORS.green)}
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${COLORS.text};">
      Statement processed \u2713
    </h1>
    <p style="margin:0 0 20px;font-size:14px;color:${COLORS.muted};">
      <strong style="color:${COLORS.text};">${data.statementName}</strong> has been imported and is ready for review.
    </p>

    <div style="margin-bottom:20px;">
      ${statPill("transactions", String(data.transactionCount), COLORS.cyan)}
      ${statPill("income", data.income, COLORS.green)}
      ${statPill("expenses", data.expenses, COLORS.yellow)}
    </div>

    <p style="margin:0;font-size:14px;color:${COLORS.muted};line-height:1.6;">
      Tag is already running categorization in the background. Head to your dashboard to review and approve.
    </p>

    ${ctaButton("Review Transactions \u2192", data.appUrl, COLORS.green)}

    <p style="margin:32px 0 0;font-size:13px;color:${COLORS.muted};border-top:1px solid ${COLORS.border};padding-top:20px;">
      \u2014 Byte \u25C9<br/>
      <span style="font-size:12px;">Document Processor \u00b7 XspensesAI</span>
    </p>
  `;

  return {
    subject: `${data.statementName} imported \u2014 ${data.transactionCount} transactions ready`,
    html: emailWrapper(content, `${data.transactionCount} transactions processed from ${data.statementName}.`),
    from: AGENTS.byte,
  };
}

function categorizationNeededTemplate(data: {
  firstName: string;
  uncategorizedCount: number;
  appUrl: string;
}): { subject: string; html: string; from: typeof AGENTS[keyof typeof AGENTS] } {
  const content = `
    ${agentBadge("tag", COLORS.cyan)}
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${COLORS.text};">
      ${data.uncategorizedCount} transactions need your attention
    </h1>
    <p style="margin:0 0 20px;font-size:14px;color:${COLORS.muted};line-height:1.6;">
      I've processed everything I can automatically, but <strong style="color:${COLORS.text};">${data.uncategorizedCount} transactions</strong>
      need a human decision. Once you review them, I'll remember your choices and apply them automatically next time.
    </p>

    <div style="padding:16px;background:${COLORS.bg};border-left:3px solid ${COLORS.cyan};border-radius:4px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:${COLORS.muted};">
        \uD83D\uDCA1 <strong style="color:${COLORS.text};">Tip:</strong> Saving a rule in Tag applies it to all past and future transactions from that merchant automatically.
      </p>
    </div>

    ${ctaButton("Review in Tag \u2192", data.appUrl, COLORS.cyan)}

    <p style="margin:32px 0 0;font-size:13px;color:${COLORS.muted};border-top:1px solid ${COLORS.border};padding-top:20px;">
      \u2014 Tag \u25C8<br/>
      <span style="font-size:12px;">Categorization Agent \u00b7 XspensesAI</span>
    </p>
  `;

  return {
    subject: `Action needed \u2014 ${data.uncategorizedCount} uncategorized transactions`,
    html: emailWrapper(content, `${data.uncategorizedCount} transactions are waiting for your review.`),
    from: AGENTS.tag,
  };
}

function taxSummaryReadyTemplate(data: {
  firstName: string;
  taxYear: number;
  totalIncome: string;
  totalExpenses: string;
  netAmount: string;
  appUrl: string;
}): { subject: string; html: string; from: typeof AGENTS[keyof typeof AGENTS] } {
  const content = `
    ${agentBadge("prime", COLORS.gold)}
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${COLORS.text};">
      Your ${data.taxYear} tax summary is ready
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:${COLORS.muted};line-height:1.6;">
      Ledger has finished organizing your ${data.taxYear} financials. Here's the summary for your accountant.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid ${COLORS.border};border-radius:8px;overflow:hidden;">
      <tr style="background:${COLORS.bg};">
        <td style="padding:14px 16px;color:${COLORS.muted};font-size:13px;">Total Income</td>
        <td style="padding:14px 16px;text-align:right;color:${COLORS.green};font-weight:700;font-size:16px;">${data.totalIncome}</td>
      </tr>
      <tr style="border-top:1px solid ${COLORS.border};">
        <td style="padding:14px 16px;color:${COLORS.muted};font-size:13px;">Total Deductible Expenses</td>
        <td style="padding:14px 16px;text-align:right;color:${COLORS.yellow};font-weight:700;font-size:16px;">${data.totalExpenses}</td>
      </tr>
      <tr style="background:${COLORS.bg};border-top:1px solid ${COLORS.border};">
        <td style="padding:14px 16px;color:${COLORS.text};font-size:13px;font-weight:600;">Net Business Income</td>
        <td style="padding:14px 16px;text-align:right;color:${COLORS.gold};font-weight:700;font-size:18px;">${data.netAmount}</td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:${COLORS.muted};">
      These are raw organized numbers for your accountant \u2014 no deduction calculations applied.
    </p>

    ${ctaButton("Open Tax Workspace \u2192", data.appUrl, COLORS.gold)}

    <p style="margin:32px 0 0;font-size:13px;color:${COLORS.muted};border-top:1px solid ${COLORS.border};padding-top:20px;">
      \u2014 Prime \u2655<br/>
      <span style="font-size:12px;">Your AI CFO Advisor \u00b7 XspensesAI</span>
    </p>
  `;

  return {
    subject: `Your ${data.taxYear} tax summary is ready \u2014 review before sending to your accountant`,
    html: emailWrapper(content, `${data.taxYear} financials organized. Net business income: ${data.netAmount}.`),
    from: AGENTS.prime,
  };
}

function budgetAlertTemplate(data: {
  firstName: string;
  category: string;
  spent: string;
  budget: string;
  percentUsed: number;
  appUrl: string;
}): { subject: string; html: string; from: typeof AGENTS[keyof typeof AGENTS] } {
  const isOver = data.percentUsed >= 100;
  const barColor = isOver ? "#ef4444" : data.percentUsed >= 80 ? COLORS.yellow : COLORS.green;
  const barWidth = Math.min(data.percentUsed, 100);

  const content = `
    ${agentBadge("goalie", COLORS.yellow)}
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${COLORS.text};">
      ${isOver ? "Budget exceeded" : "Budget alert"} \u2014 ${data.category}
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:${COLORS.muted};line-height:1.6;">
      You've used <strong style="color:${COLORS.text};">${data.percentUsed}%</strong> of your ${data.category} budget this month.
    </p>

    <!-- Progress bar -->
    <div style="background:${COLORS.bg};border-radius:4px;height:8px;margin-bottom:12px;overflow:hidden;">
      <div style="background:${barColor};height:8px;width:${barWidth}%;border-radius:4px;"></div>
    </div>
    <div style="margin-bottom:24px;">
      ${statPill("spent", data.spent, barColor)}
      ${statPill("budget", data.budget, COLORS.muted)}
    </div>

    ${ctaButton("View Goals \u2192", data.appUrl, COLORS.yellow)}

    <p style="margin:32px 0 0;font-size:13px;color:${COLORS.muted};border-top:1px solid ${COLORS.border};padding-top:20px;">
      \u2014 Goalie \u25CE<br/>
      <span style="font-size:12px;">Goals Agent \u00b7 XspensesAI</span>
    </p>
  `;

  return {
    subject: `${isOver ? "\u26A0\uFE0F Budget exceeded" : "Budget alert"} \u2014 ${data.category} at ${data.percentUsed}%`,
    html: emailWrapper(content, `Your ${data.category} budget is at ${data.percentUsed}%.`),
    from: AGENTS.goalie,
  };
}

function agentMirrorTemplate(data: {
  agentKey: keyof typeof AGENTS;
  agentColor: string;
  messageTitle: string;
  messageBody: string;
  appUrl: string;
}): { subject: string; html: string; from: typeof AGENTS[keyof typeof AGENTS] } {
  const agent = AGENTS[data.agentKey];

  const content = `
    ${agentBadge(data.agentKey, data.agentColor)}
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:${COLORS.text};">
      ${data.messageTitle}
    </h1>
    <div style="font-size:14px;color:${COLORS.muted};line-height:1.7;white-space:pre-wrap;">
      ${data.messageBody}
    </div>

    ${ctaButton("Open Inbox \u2192", data.appUrl, data.agentColor)}

    <p style="margin:32px 0 0;font-size:13px;color:${COLORS.muted};border-top:1px solid ${COLORS.border};padding-top:20px;">
      \u2014 ${agent.name}<br/>
      <span style="font-size:12px;">XspensesAI Internal Inbox \u00b7 mirrored to Gmail</span>
    </p>
  `;

  return {
    subject: `[XspensesAI] ${data.messageTitle}`,
    html: emailWrapper(content, data.messageBody.slice(0, 120)),
    from: agent,
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body: Record<string, any>;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { type, to, data } = body;

  if (!type || !to) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing type or to" }) };
  }

  // ── Build template based on type ──────────────────────────────────────────
  let template: { subject: string; html: string; from: typeof AGENTS[keyof typeof AGENTS] };

  try {
    switch (type) {
      case "welcome":
        template = welcomeTemplate(data);
        break;
      case "upload_complete":
        template = uploadCompleteTemplate(data);
        break;
      case "categorization_needed":
        template = categorizationNeededTemplate(data);
        break;
      case "tax_summary_ready":
        template = taxSummaryReadyTemplate(data);
        break;
      case "budget_alert":
        template = budgetAlertTemplate(data);
        break;
      case "agent_mirror":
        template = agentMirrorTemplate(data);
        break;
      default:
        return { statusCode: 400, body: JSON.stringify({ error: `Unknown email type: ${type}` }) };
    }
  } catch (err: any) {
    return { statusCode: 400, body: JSON.stringify({ error: `Template error: ${err.message}` }) };
  }

  // ── Send via Resend ───────────────────────────────────────────────────────
  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${template.from.name} <${template.from.email}>`,
        to: Array.isArray(to) ? to : [to],
        subject: template.subject,
        html: template.html,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Resend error:", result);
      return { statusCode: res.status, body: JSON.stringify({ ok: false, error: result }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, id: result.id }) };
  } catch (err: any) {
    console.error("Send email error:", err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
