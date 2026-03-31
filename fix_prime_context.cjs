const fs = require('fs');
const fp = 'src/pages/PrimeChatV2/PrimeChatV2.tsx';
let cc = fs.readFileSync(fp, 'utf8');

// Wire real financial data into Prime's context
cc = cc.replace(
  `  } = useUnifiedChatEngine({
    employeeSlug: "prime-boss",
    additionalPrimeContext: teamActivity.summaryText ? { teamActivitySummary: teamActivity.summaryText } : undefined,
  });`,
  `  } = useUnifiedChatEngine({
    employeeSlug: "prime-boss",
    additionalPrimeContext: data.loading ? undefined : {
      // Real financial snapshot from usePrimeBriefingData
      financialSnapshot: {
        hasTransactions: data.transactionCount > 0,
        uncategorizedCount: data.uncategorizedCount,
        monthlySpend: data.totalSpent,
        topCategories: data.categoryBreakdown.slice(0, 6).map(c => ({
          name: c.label,
          amount: c.amount,
        })),
        hasDebt: data.categoryBreakdown.some(c =>
          c.label.toLowerCase().includes('debt') || c.label.toLowerCase().includes('loan')
        ),
      },
      // Real income/expense summary
      totalIncome: data.totalIncome,
      totalSpent: data.totalSpent,
      statementCount: data.statementCount,
      transactionCount: data.transactionCount,
      uncategorizedCount: data.uncategorizedCount,
      categorySummary: data.categorySummary,
      topMerchant: data.topMerchant?.name ?? null,
      pendingImports: data.pendingImports,
      // Team agent activity
      teamActivitySummary: teamActivity.summaryText || undefined,
    },
  });`
);

fs.writeFileSync(fp, cc, 'utf8');
console.log('Prime context wired');
