export type HelpFastLaneDecision = { use: boolean; intent?: string };

function normalize(text: string): string {
  return String(text || '').trim().toLowerCase();
}

export function detectPrimeHelpFastLaneIntent(messageText: string): HelpFastLaneDecision {
  const text = normalize(messageText);
  if (!text) return { use: false };

  const blockPatterns = [
    /\bwhat did i spend\b/i,
    /\bcompare (last|this|previous) month\b/i,
    /\bwhat subscriptions do i have\b/i,
    /\bbased on my (statement|statements|transactions|data)\b/i,
    /\bhow much did i spend at\b/i,
    /\bcategori[sz]e\b/i,
    /\bwhy is this missing\b/i,
    /\bpayoff\b/i,
    /\bmortgage\b/i,
    /\bdebt math\b/i,
    /\bmy statements?\b/i,
    /\bmy transactions?\b/i,
    /\bmy data\b/i,
    /\bfrom my\b/i,
  ];
  if (blockPatterns.some((p) => p.test(text))) return { use: false };

  const rules: Array<{ intent: string; patterns: RegExp[] }> = [
    {
      intent: 'upload_howto',
      patterns: [
        /\bhow do i upload\b/i,
        /\bupload (a )?(bank|credit|statement|file)\b/i,
        /\bhow to upload\b/i,
      ],
    },
    {
      intent: 'supported_file_types',
      patterns: [
        /\bwhat file types\b/i,
        /\bdo you accept\b/i,
        /\bcredit card statements?\b/i,
        /\binvoices?\b/i,
        /\bmanulife statements?\b/i,
      ],
    },
    {
      intent: 'app_navigation',
      patterns: [
        /\bhow to use xspensesai\b/i,
        /\bwhere do i see transactions\b/i,
        /\bwhere is analytics\b/i,
      ],
    },
    {
      intent: 'simple_savings_starter',
      patterns: [
        /\bhow do i save money\b/i,
      ],
    },
  ];

  for (const rule of rules) {
    if (rule.patterns.some((p) => p.test(text))) {
      return { use: true, intent: rule.intent };
    }
  }
  return { use: false };
}

export function buildPrimeHelpFastLaneAnswer(args: {
  messageText: string;
  intent?: string;
  employeeSlug: string;
  appName?: 'XspensesAI';
}): { text: string } {
  const appName = args.appName || 'XspensesAI';
  const intent = String(args.intent || '');

  if (intent === 'simple_savings_starter') {
    return {
      text: [
        'A simple way to save money is to start small and stay consistent.',
        '',
        'Try this starter plan:',
        '1) Pick one amount you can save every week.',
        '2) Move it on the same day each week.',
        '3) Review your top spending category once a week.',
        '4) Cut just one thing first, not everything at once.',
        '',
        "If you'd like, I can help you choose a realistic first amount.",
      ].join('\n'),
    };
  }

  return {
    text: [
      `You can do this directly in ${appName} chat.`,
      '',
      'Steps:',
      '1) Open Prime chat.',
      '2) Click the + Upload button.',
      '3) Choose your file (PDF, CSV, or Excel).',
      '4) Wait for import to finish.',
      '5) Review results in Transactions and Analytics.',
      '',
      'Supported documents:',
      '- Bank statements (PDF/CSV/Excel)',
      '- Credit card statements (PDF/CSV/Excel)',
      '- Invoices (PDF)',
      '- Insurance or Manulife statements (PDF; results depend on itemized rows)',
      '',
      "If a statement doesn't import cleanly, I'll tell you what's missing and what to try next.",
    ].join('\n'),
  };
}
