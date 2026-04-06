import type { Handler, HandlerEvent } from "@netlify/functions";

/**
 * Smoke-test endpoint for send-email templates.
 * POST /.netlify/functions/test-email  { type, to }
 *
 * Sends a pre-filled test payload for the given template type
 * so you can verify rendering + delivery without wiring real data.
 */

const APP_URL = process.env.URL || "https://xspensesai.com";

const TEST_DATA: Record<string, { data: Record<string, any> }> = {
  welcome: {
    data: {
      firstName: "Darrell",
      appUrl: `${APP_URL}/dashboard`,
    },
  },
  upload_complete: {
    data: {
      firstName: "Darrell",
      statementName: "BMO Chequing \u2014 Feb 2026",
      transactionCount: 119,
      income: "$11,627.36",
      expenses: "$11,525.46",
      appUrl: `${APP_URL}/dashboard/transactions`,
    },
  },
  categorization_needed: {
    data: {
      firstName: "Darrell",
      uncategorizedCount: 14,
      appUrl: `${APP_URL}/dashboard/transactions?filter=needs-review`,
    },
  },
  tax_summary_ready: {
    data: {
      firstName: "Darrell",
      taxYear: 2025,
      totalIncome: "$87,340.00",
      totalExpenses: "$42,118.50",
      netAmount: "$45,221.50",
      appUrl: `${APP_URL}/dashboard/tax-workspace`,
    },
  },
  budget_alert: {
    data: {
      firstName: "Darrell",
      category: "Dining & Restaurants",
      spent: "$482.30",
      budget: "$400.00",
      percentUsed: 121,
      appUrl: `${APP_URL}/dashboard/goal-concierge`,
    },
  },
  agent_mirror: {
    data: {
      agentKey: "prime",
      agentColor: "#c8a64e",
      messageTitle: "Weekly spending digest \u2014 Mar 31 to Apr 5",
      messageBody: "Your top 3 categories this week:\n1. Groceries \u2014 $312.40\n2. Transportation \u2014 $187.20\n3. Subscriptions \u2014 $64.99\n\nTotal: $564.59 across 23 transactions.",
      appUrl: `${APP_URL}/dashboard/inbox`,
    },
  },
};

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

  const { type, to } = body;

  if (!to) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing 'to' (email address)" }) };
  }

  if (!type || !TEST_DATA[type]) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: `Unknown type '${type}'. Available: ${Object.keys(TEST_DATA).join(", ")}`,
      }),
    };
  }

  // Forward to send-email with test data
  const sendEmailUrl = `${process.env.URL || "http://localhost:8888"}/.netlify/functions/send-email`;

  try {
    const res = await fetch(sendEmailUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, to, data: TEST_DATA[type].data }),
    });

    const result = await res.json();
    return {
      statusCode: res.status,
      body: JSON.stringify({ ok: res.ok, type, to, ...result }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
