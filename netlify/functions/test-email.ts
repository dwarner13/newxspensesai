import type { Handler } from "@netlify/functions";

// ─── Quick smoke test - hit this once from the browser to verify Resend ───────
// URL: https://your-site.netlify.app/.netlify/functions/test-email
// DELETE THIS FILE before going to production

export const handler: Handler = async () => {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "RESEND_API_KEY not set in environment variables" }),
    };
  }

  const emails = [
    {
      label: "Welcome \u2014 Prime",
      from: "Prime \u2655 | XspensesAI <prime@xspensesai.com>",
      subject: "[TEST] Welcome to XspensesAI, Darrell",
      type: "welcome",
    },
    {
      label: "Upload Complete \u2014 Byte",
      from: "Byte \u25C9 | XspensesAI <byte@xspensesai.com>",
      subject: "[TEST] BMO May 2024 imported \u2014 87 transactions ready",
      type: "upload_complete",
    },
    {
      label: "Categorization Needed \u2014 Tag",
      from: "Tag \u25C8 | XspensesAI <tag@xspensesai.com>",
      subject: "[TEST] Action needed \u2014 12 uncategorized transactions",
      type: "categorization_needed",
    },
  ];

  const results: { label: string; status: string; id?: string; error?: string }[] = [];

  for (const email of emails) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: email.from,
          to: ["darrell.warner13@gmail.com"],
          subject: email.subject,
          html: buildTestHtml(email.label, email.type),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        results.push({ label: email.label, status: "FAILED", error: JSON.stringify(data) });
      } else {
        results.push({ label: email.label, status: "SENT", id: data.id });
      }
    } catch (err: any) {
      results.push({ label: email.label, status: "ERROR", error: err.message });
    }
  }

  const allPassed = results.every((r) => r.status === "SENT");

  return {
    statusCode: allPassed ? 200 : 207,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      {
        summary: allPassed
          ? "\u2705 All 3 test emails sent \u2014 check darrell.warner13@gmail.com"
          : "\u26A0\uFE0F Some emails failed \u2014 see results",
        results,
      },
      null,
      2
    ),
  };
};

function buildTestHtml(label: string, type: string): string {
  const agentColors: Record<string, string> = {
    welcome: "#c8a64e",
    upload_complete: "#34d399",
    categorization_needed: "#22d3ee",
  };
  const color = agentColors[type] || "#c8a64e";

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:40px 16px;background:#0b1220;font-family:system-ui,sans-serif;">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
    <tr>
      <td style="text-align:center;padding-bottom:32px;">
        <span style="font-size:28px;font-weight:700;color:#c8a64e;">\u2655 XspensesAI</span>
      </td>
    </tr>
    <tr>
      <td style="background:#111a2e;border:1px solid #1e2d4a;border-radius:12px;padding:40px;">
        <div style="display:inline-block;padding:4px 12px;background:${color}20;border:1px solid ${color}50;border-radius:4px;color:${color};font-size:12px;font-weight:600;margin-bottom:20px;">
          SMOKE TEST
        </div>
        <h1 style="margin:0 0 12px;font-size:22px;color:#e8ecf4;">${label}</h1>
        <p style="margin:0 0 20px;color:#8892a4;font-size:14px;line-height:1.6;">
          If you're reading this, <strong style="color:#e8ecf4;">Resend is working correctly</strong> for XspensesAI.
          This agent address is verified and emails are landing in Gmail.
        </p>
        <div style="padding:16px;background:#0b1220;border-left:3px solid ${color};border-radius:4px;">
          <p style="margin:0;font-size:13px;color:#8892a4;">
            <strong style="color:#e8ecf4;">Template:</strong> ${type}<br/>
            <strong style="color:#e8ecf4;">Agent color:</strong> ${color}<br/>
            <strong style="color:#e8ecf4;">Timestamp:</strong> ${new Date().toISOString()}
          </p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding-top:24px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#8892a4;">
          This is a test email from XspensesAI \u00b7 Delete test-email.ts before production
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
