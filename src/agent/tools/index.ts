import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import * as deleteMyData from './impl/delete_my_data';
import * as exportMyData from './impl/export_my_data';
import * as ingestStatementEnhanced from './impl/ingest_statement_enhanced';
import * as generateMonthlyReportEnhanced from './impl/generate_monthly_report_enhanced';
import * as detectAnomalies from './impl/detect_anomalies';
import * as merchantLookup from './impl/merchant_lookup';
import * as bulkCategorize from './impl/bulk_categorize';
import * as checkUsageLimits from './impl/check_usage_limits';
import * as recordUsage from './impl/record_usage';
import * as manageBilling from './impl/manage_billing';
import * as searchDocs from './impl/search_docs';
import * as safeWebResearch from './impl/safe_web_research';
import * as manageKnowledgePack from './impl/manage_knowledge_pack';
import * as createOrg from './impl/create_org';
import * as inviteMember from './impl/invite_member';
import * as setReminder from './impl/set_reminder';
import * as detectAnomaliesAdvanced from './impl/detect_anomalies_advanced';
import * as tagExplain from './impl/tag_explain';
import * as tagMerchantInsights from './impl/tag_merchant_insights';
import * as tagCategoryBrain from './impl/tag_category_brain';
import * as tagUpdateTransactionCategory from './impl/tag_update_transaction_category';
import * as tagCreateManualTransaction from './impl/tag_create_manual_transaction';
import * as requestEmployeeHandoff from './impl/request_employee_handoff';
import * as analyticsForecast from './impl/analytics_forecast';
import * as analyticsExtractPatterns from './impl/analytics_extract_patterns';
import * as visionOcrLight from './impl/vision_ocr_light';
import * as transactionsQuery from './impl/transactions_query';
import * as transactionCategoryTotals from './impl/transaction_category_totals';
import * as accountBalancesQuery from './impl/account_balances_query';
import * as goalsQuery from './impl/goals_query';
import * as createGoal from './impl/create_goal';
import * as updateGoal from './impl/update_goal';
import * as crystalSummarizeIncome from './impl/crystal_summarize_income';
import * as crystalSummarizeExpenses from './impl/crystal_summarize_expenses';
import * as finleyDebtPayoffForecast from './impl/finley_debt_payoff_forecast';
import * as finleySavingsForecast from './impl/finley_savings_forecast';
import * as finleyLoanForecast from './impl/finley_loan_forecast';
import * as goalieCreateGoal from './impl/goalie_create_goal';
import * as goalieListGoals from './impl/goalie_list_goals';
import * as goalieUpdateGoalProgress from './impl/goalie_update_goal_progress';
import * as goalieSummarizeGoals from './impl/goalie_summarize_goals';
import * as goalieSuggestActions from './impl/goalie_suggest_actions';
import * as chimeSummarizeUpcomingObligations from './impl/chime_summarize_upcoming_obligations';
import * as chimeListObligations from './impl/chime_list_obligations';
import * as chimeListUpcomingNotifications from './impl/chime_list_upcoming_notifications';
import * as chimeDraftNotificationCopy from './impl/chime_draft_notification_copy';
import * as chimeGenerateNotification from './impl/chime_generate_notification';
import { OpenAIToolDef } from '../../server/ai/openai';

export interface ToolModule {
  id: string;
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
  run: (input: any, ctx: ToolContext) => Promise<any>;
  meta: {
    requiresConfirm?: boolean;
    mutates?: boolean;
    costly?: boolean;
    timeout?: number; // milliseconds
    rateLimit?: { perMinute: number };
  };
  description: string;
}

export interface ToolContext {
  userId: string;
  conversationId: string;
  sessionId?: string;
  abortSignal?: AbortSignal;
}

const toolModules: Map<string, ToolModule> = new Map([
  ['delete_my_data', {
    id: 'delete_my_data',
    description: 'Permanently delete all user data from the system',
    inputSchema: deleteMyData.inputSchema,
    outputSchema: deleteMyData.outputSchema,
    run: deleteMyData.execute,
    meta: {
      requiresConfirm: true,
      mutates: true,
      timeout: 30000,
      rateLimit: { perMinute: 1 },
    },
  }],
  ['export_my_data', {
    id: 'export_my_data',
    description: 'Export all user data as a downloadable file',
    inputSchema: exportMyData.inputSchema,
    outputSchema: exportMyData.outputSchema,
    run: exportMyData.execute,
    meta: {
      costly: true,
      timeout: 60000,
      rateLimit: { perMinute: 5 },
    },
  }],
  ['ingest_statement_enhanced', {
    id: 'ingest_statement_enhanced',
    description: 'Process financial statements with OCR, validation, and intelligent categorization',
    inputSchema: ingestStatementEnhanced.inputSchema,
    outputSchema: ingestStatementEnhanced.outputSchema,
    run: ingestStatementEnhanced.execute,
    meta: {
      requiresConfirm: true,
      mutates: true,
      costly: true,
      timeout: 120000, // 2 minutes for OCR processing
      rateLimit: { perMinute: 3 },
    },
  }],
  ['generate_monthly_report_enhanced', {
    id: 'generate_monthly_report_enhanced',
    description: 'Generate comprehensive monthly financial reports with insights and trends',
    inputSchema: generateMonthlyReportEnhanced.inputSchema,
    outputSchema: generateMonthlyReportEnhanced.outputSchema,
    run: generateMonthlyReportEnhanced.execute,
    meta: {
      costly: true,
      timeout: 90000, // 1.5 minutes for report generation
      rateLimit: { perMinute: 2 },
    },
  }],
  ['detect_anomalies', {
    id: 'detect_anomalies',
    description: 'Detect unusual spending patterns and transaction anomalies',
    inputSchema: detectAnomalies.inputSchema,
    outputSchema: detectAnomalies.outputSchema,
    run: detectAnomalies.execute,
    meta: {
      timeout: 30000,
      rateLimit: { perMinute: 10 },
    },
  }],
  ['merchant_lookup', {
    id: 'merchant_lookup',
    description: 'Look up and enrich merchant information for better categorization',
    inputSchema: merchantLookup.inputSchema,
    outputSchema: merchantLookup.outputSchema,
    run: merchantLookup.execute,
    meta: {
      timeout: 15000,
      rateLimit: { perMinute: 20 },
    },
  }],
  ['bulk_categorize', {
    id: 'bulk_categorize',
    description: 'Bulk categorize transactions by vendor pattern or date range',
    inputSchema: bulkCategorize.inputSchema,
    outputSchema: bulkCategorize.outputSchema,
    run: bulkCategorize.execute,
    meta: {
      requiresConfirm: true,
      mutates: true,
      dangerous: true,
      timeout: 30000,
      rateLimit: { perMinute: 5 },
    },
  }],
  ['check_usage_limits', {
    id: 'check_usage_limits',
    description: 'Check if user can perform an action within their plan limits',
    inputSchema: checkUsageLimits.inputSchema,
    outputSchema: checkUsageLimits.outputSchema,
    run: checkUsageLimits.execute,
    meta: {
      timeout: 5000,
      rateLimit: { perMinute: 60 },
    },
  }],
  ['record_usage', {
    id: 'record_usage',
    description: 'Record resource usage for billing and limit tracking',
    inputSchema: recordUsage.inputSchema,
    outputSchema: recordUsage.outputSchema,
    run: recordUsage.execute,
    meta: {
      timeout: 10000,
      rateLimit: { perMinute: 100 },
    },
  }],
  ['manage_billing', {
    id: 'manage_billing',
    description: 'Handle billing operations like upgrades, downgrades, cancellations, and payment retries',
    inputSchema: manageBilling.inputSchema,
    outputSchema: manageBilling.outputSchema,
    run: manageBilling.execute,
    meta: {
      requiresConfirm: true,
      mutates: true,
      dangerous: true,
      timeout: 30000,
      rateLimit: { perMinute: 5 },
    },
  }],
  ['search_docs', {
    id: 'search_docs',
    description: 'Search through knowledge packs and cached web content',
    inputSchema: searchDocs.inputSchema,
    outputSchema: searchDocs.outputSchema,
    run: searchDocs.execute,
    meta: {
      timeout: 15000,
      rateLimit: { perMinute: 30 },
    },
  }],
  ['safe_web_research', {
    id: 'safe_web_research',
    description: 'Research information from approved web sources only',
    inputSchema: safeWebResearch.inputSchema,
    outputSchema: safeWebResearch.outputSchema,
    run: safeWebResearch.execute,
    meta: {
      costly: true,
      timeout: 30000,
      rateLimit: { perMinute: 10 },
    },
  }],
  ['manage_knowledge_pack', {
    id: 'manage_knowledge_pack',
    description: 'Upload, update, or delete documents in knowledge packs',
    inputSchema: manageKnowledgePack.inputSchema,
    outputSchema: manageKnowledgePack.outputSchema,
    run: manageKnowledgePack.execute,
    meta: {
      requiresConfirm: true,
      mutates: true,
      costly: true,
      timeout: 60000,
      rateLimit: { perMinute: 5 },
    },
  }],
  ['create_org', {
    id: 'create_org',
    description: 'Create a new organization for team collaboration',
    inputSchema: createOrg.inputSchema,
    outputSchema: createOrg.outputSchema,
    run: createOrg.execute,
    meta: {
      requiresConfirm: true,
      mutates: true,
      costly: true,
      timeout: 30000,
      rateLimit: { perMinute: 2 },
    },
  }],
  ['invite_member', {
    id: 'invite_member',
    description: 'Invite a new member to the organization',
    inputSchema: inviteMember.inputSchema,
    outputSchema: inviteMember.outputSchema,
    run: inviteMember.execute,
    meta: {
      requiresConfirm: true,
      mutates: true,
      timeout: 15000,
      rateLimit: { perMinute: 10 },
    },
  }],
  ['set_reminder', {
    id: 'set_reminder',
    description: 'Schedule automated reminders and notifications',
    inputSchema: setReminder.inputSchema,
    outputSchema: setReminder.outputSchema,
    run: setReminder.execute,
    meta: {
      requiresConfirm: true,
      mutates: true,
      timeout: 10000,
      rateLimit: { perMinute: 20 },
    },
  }],
  ['detect_anomalies_advanced', {
    id: 'detect_anomalies_advanced',
    description: 'Run advanced anomaly detection with ML models',
    inputSchema: detectAnomaliesAdvanced.inputSchema,
    outputSchema: detectAnomaliesAdvanced.outputSchema,
    run: detectAnomaliesAdvanced.execute,
    meta: {
      costly: true,
      timeout: 60000,
      rateLimit: { perMinute: 5 },
    },
  }],
  ['tag_explain_category', {
    id: 'tag_explain_category',
    description: 'Explain why Tag chose a specific category for a transaction. Use this when users ask "why is this categorized as X?" or "how did Tag decide this?"',
    inputSchema: tagExplain.inputSchema,
    outputSchema: tagExplain.outputSchema,
    run: tagExplain.execute,
    meta: {
      timeout: 15000,
      rateLimit: { perMinute: 30 },
    },
  }],
  ['tag_merchant_insights', {
    id: 'tag_merchant_insights',
    description: 'Get Tag\'s learning history for a specific merchant. Shows what category the user usually assigns to this merchant based on past corrections. Use this when users ask "what do I usually categorize [merchant] as?"',
    inputSchema: tagMerchantInsights.inputSchema,
    outputSchema: tagMerchantInsights.outputSchema,
    run: tagMerchantInsights.execute,
    meta: {
      timeout: 15000,
      rateLimit: { perMinute: 30 },
    },
  }],
  ['tag_category_brain', {
    id: 'tag_category_brain',
    description: 'Get aggregated intelligence for a spending category including totals, top merchants, confidence metrics, and insights. Use this when users ask "what have you learned about this category?", "how much do I usually spend here?", "which merchants are most common?", or "is this category trending up or down?".',
    inputSchema: tagCategoryBrain.inputSchema,
    outputSchema: tagCategoryBrain.outputSchema,
    run: tagCategoryBrain.execute,
    meta: {
      timeout: 20000,
      rateLimit: { perMinute: 20 },
    },
  }],
  ['tag_update_transaction_category', {
    id: 'tag_update_transaction_category',
    description: 'Update the category of an existing transaction and save the correction for learning. Use this when users say things like "move this to Income", "change this category to X", "this is in the wrong category", "fix the category for transaction Y", or "those GFS deposits are actually Salary, not Misc". Always confirm which transaction (by ID or description) and which category before calling this tool. This tool automatically saves corrections to Tag\'s learning system (tag_category_corrections table) so future categorizations improve.',
    inputSchema: tagUpdateTransactionCategory.inputSchema,
    outputSchema: tagUpdateTransactionCategory.outputSchema,
    run: tagUpdateTransactionCategory.execute,
    meta: {
      requiresConfirm: true,
      mutates: true,
      timeout: 15000,
      rateLimit: { perMinute: 30 },
    },
  }],
  ['tag_create_manual_transaction', {
    id: 'tag_create_manual_transaction',
    description: 'Create a new income or expense transaction from natural language. Use this when users say things like "add an income of $500", "I was paid $1000 on Feb 10", "create a transaction for $50 from GFS", "add $200 income last Friday", or "add an income for $500 from GFS last Friday". Always confirm the amount, date (YYYY-MM-DD), description, and category before calling this tool. If category is "Income", the transaction type will be income; otherwise expense.',
    inputSchema: tagCreateManualTransaction.inputSchema,
    outputSchema: tagCreateManualTransaction.outputSchema,
    run: tagCreateManualTransaction.execute,
    meta: {
      requiresConfirm: true,
      mutates: true,
      timeout: 15000,
      rateLimit: { perMinute: 20 },
    },
  }],
  ['request_employee_handoff', {
    id: 'request_employee_handoff',
    description: 'Transfer the conversation to another AI employee who is better suited to answer the user\'s question. Use this when users ask about Smart Import/OCR/document uploads (→ Byte), high-level strategy or "who should I talk to" questions (→ Prime), analytics/trends (→ Crystal), tax questions (→ Ledger), or goal setting (→ Goalie).',
    inputSchema: requestEmployeeHandoff.inputSchema,
    outputSchema: requestEmployeeHandoff.outputSchema,
    run: requestEmployeeHandoff.execute,
    meta: {
      timeout: 5000,
      rateLimit: { perMinute: 10 },
    },
  }],
  ['analytics_forecast', {
    id: 'analytics_forecast',
    description: 'Forecast financial scenarios: payoff timelines, future balances, spending projections using structured data from Prime/Byte or user-provided parameters. Use this when users ask about payoff timelines, future balances, or spending forecasts.',
    inputSchema: analyticsForecast.inputSchema,
    outputSchema: analyticsForecast.outputSchema,
    run: analyticsForecast.execute,
    meta: {
      costly: false,
      timeout: 10000,
      rateLimit: { perMinute: 10 },
    },
  }],
  ['analytics_extract_patterns', {
    id: 'analytics_extract_patterns',
    description: 'Extract patterns from structured financial data: spending patterns, recurring transactions, anomalies, trends, risks. Use this when analyzing structured JSON data from Prime/Byte after OCR/Vision processing.',
    inputSchema: analyticsExtractPatterns.inputSchema,
    outputSchema: analyticsExtractPatterns.outputSchema,
    run: analyticsExtractPatterns.execute,
    meta: {
      costly: false,
      timeout: 15000,
      rateLimit: { perMinute: 10 },
    },
  }],
  ['vision_ocr_light', {
    id: 'vision_ocr_light',
    description: 'Light Vision OCR for reading simple text from images (not full financial parsing - use Byte/Prime for that). Use this for quick text extraction when needed, but prefer Byte/Prime for full statement parsing.',
    inputSchema: visionOcrLight.inputSchema,
    outputSchema: visionOcrLight.outputSchema,
    run: visionOcrLight.execute,
    meta: {
      costly: true,
      timeout: 30000,
      rateLimit: { perMinute: 5 },
    },
  }],
  ['transactions_query', {
    id: 'transactions_query',
    description: 'Query transactions with flexible filters (date range, category, type, amount, merchant). Use this to analyze spending patterns, calculate totals, list uncategorized transactions, or run projections based on actual transaction data. Can filter by specific categories or leave category empty to get all transactions.',
    inputSchema: transactionsQuery.inputSchema,
    outputSchema: transactionsQuery.outputSchema,
    run: transactionsQuery.execute,
    meta: {
      timeout: 15000,
      rateLimit: { perMinute: 30 },
    },
  }],
  ['transaction_category_totals', {
    id: 'transaction_category_totals',
    description: 'Get transaction totals grouped by category. Use this when Finley needs category-level spending summaries for forecasts or pattern analysis.',
    inputSchema: transactionCategoryTotals.inputSchema,
    outputSchema: transactionCategoryTotals.outputSchema,
    run: transactionCategoryTotals.execute,
    meta: {
      timeout: 15000,
      rateLimit: { perMinute: 30 },
    },
  }],
  ['account_balances_query', {
    id: 'account_balances_query',
    description: 'Query account balances and summaries. Use this when Finley needs current account balances for wealth calculations or net worth projections.',
    inputSchema: accountBalancesQuery.inputSchema,
    outputSchema: accountBalancesQuery.outputSchema,
    run: accountBalancesQuery.execute,
    meta: {
      timeout: 15000,
      rateLimit: { perMinute: 20 },
    },
  }],
  ['goals_query', {
    id: 'goals_query',
    description: 'Query user financial goals. Use this when Finley needs to understand user goals for forecasting or scenario planning.',
    inputSchema: goalsQuery.inputSchema,
    outputSchema: goalsQuery.outputSchema,
    run: goalsQuery.execute,
    meta: {
      timeout: 15000,
      rateLimit: { perMinute: 30 },
    },
  }],
  ['create_goal', {
    id: 'create_goal',
    description: 'Create a new financial goal. Use this when Finley needs to help users set up goals for forecasting or tracking progress.',
    inputSchema: createGoal.inputSchema,
    outputSchema: createGoal.outputSchema,
    run: createGoal.execute,
    meta: {
      mutates: true,
      timeout: 15000,
      rateLimit: { perMinute: 10 },
    },
  }],
  ['update_goal', {
    id: 'update_goal',
    description: 'Update an existing financial goal. Use this when Finley needs to update goal progress or details based on user requests or forecast updates.',
    inputSchema: updateGoal.inputSchema,
    outputSchema: updateGoal.outputSchema,
    run: updateGoal.execute,
    meta: {
      mutates: true,
      timeout: 15000,
      rateLimit: { perMinute: 20 },
    },
  }],
  ['crystal_summarize_income', {
    id: 'crystal_summarize_income',
    description: 'Summarize income transactions. Provides clean financial summary: total, count, average, top merchants. Use when users ask about income totals, income breakdowns, or income summaries.',
    inputSchema: crystalSummarizeIncome.inputSchema,
    outputSchema: crystalSummarizeIncome.outputSchema,
    run: crystalSummarizeIncome.execute,
    meta: {
      timeout: 15000,
      rateLimit: { perMinute: 30 },
    },
  }],
  ['crystal_summarize_expenses', {
    id: 'crystal_summarize_expenses',
    description: 'Summarize expense transactions. Provides clean financial summary: total, count, average, top merchants. Use when users ask about spending totals, expense breakdowns, or expense summaries.',
    inputSchema: crystalSummarizeExpenses.inputSchema,
    outputSchema: crystalSummarizeExpenses.outputSchema,
    run: crystalSummarizeExpenses.execute,
    meta: {
      timeout: 15000,
      rateLimit: { perMinute: 30 },
    },
  }],
  ['finley_debt_payoff_forecast', {
    id: 'finley_debt_payoff_forecast',
    description: 'Calculate how long it will take to pay off a debt given balance, monthly payment, and interest rate. Returns month-by-month projection showing remaining balance over time. Use when users ask about debt payoff timelines, interest calculations, or "how long until paid off" questions.',
    inputSchema: finleyDebtPayoffForecast.inputSchema,
    outputSchema: finleyDebtPayoffForecast.outputSchema,
    run: finleyDebtPayoffForecast.execute,
    meta: {
      timeout: 10000,
      rateLimit: { perMinute: 30 },
    },
  }],
  ['finley_savings_forecast', {
    id: 'finley_savings_forecast',
    description: 'Calculate how much savings will grow over time given starting balance, monthly contributions, and interest rate. Returns month-by-month projection showing balance growth. Use when users ask about savings goals, "how much will I have saved", or future savings projections.',
    inputSchema: finleySavingsForecast.inputSchema,
    outputSchema: finleySavingsForecast.outputSchema,
    run: finleySavingsForecast.execute,
    meta: {
      timeout: 10000,
      rateLimit: { perMinute: 30 },
    },
  }],
  ['finley_loan_forecast', {
    id: 'finley_loan_forecast',
    description: 'Calculate loan/mortgage payoff timelines with and without extra payments. Returns payoff times, total interest, and interest savings. Use when users ask about paying off loans faster, extra payments, interest saved, or payoff dates. Can use a loan snapshot from OCR or manual inputs.',
    inputSchema: finleyLoanForecast.inputSchema,
    outputSchema: finleyLoanForecast.outputSchema,
    run: finleyLoanForecast.execute,
    meta: {
      timeout: 10000,
      rateLimit: { perMinute: 30 },
    },
  }],
  ['goalie_create_goal', {
    id: 'goalie_create_goal',
    description: 'Create a new financial goal. Use this when users want to set up a new goal. Goalie helps them define clear, achievable goals with realistic timelines.',
    inputSchema: goalieCreateGoal.inputSchema,
    outputSchema: goalieCreateGoal.outputSchema,
    run: goalieCreateGoal.execute,
    meta: {
      mutates: true,
      timeout: 15000,
      rateLimit: { perMinute: 10 },
    },
  }],
  ['goalie_list_goals', {
    id: 'goalie_list_goals',
    description: 'List user financial goals with progress tracking. Use this when users ask about their goals, want to see progress, or need a summary of all goals. Returns all goals filtered by status and type, with calculated progress percentages.',
    inputSchema: goalieListGoals.inputSchema,
    outputSchema: goalieListGoals.outputSchema,
    run: goalieListGoals.execute,
    meta: {
      timeout: 15000,
      rateLimit: { perMinute: 30 },
    },
  }],
  ['goalie_update_goal_progress', {
    id: 'goalie_update_goal_progress',
    description: 'Update goal progress or status. Use this when users want to update their goal progress, mark a goal as completed, or adjust the current amount saved toward a goal.',
    inputSchema: goalieUpdateGoalProgress.inputSchema,
    outputSchema: goalieUpdateGoalProgress.outputSchema,
    run: goalieUpdateGoalProgress.execute,
    meta: {
      mutates: true,
      timeout: 15000,
      rateLimit: { perMinute: 20 },
    },
  }],
  ['goalie_summarize_goals', {
    id: 'goalie_summarize_goals',
    description: 'Summarize user\'s goals with aggregated statistics. Use this when users ask for an overview of their goals, want to see overall progress, or need a high-level summary. Returns structured data that Goalie can turn into a friendly, encouraging summary.',
    inputSchema: goalieSummarizeGoals.inputSchema,
    outputSchema: goalieSummarizeGoals.outputSchema,
    run: goalieSummarizeGoals.execute,
    meta: {
      timeout: 15000,
      rateLimit: { perMinute: 30 },
    },
  }],
  ['goalie_suggest_actions', {
    id: 'goalie_suggest_actions',
    description: 'Suggest actionable next steps based on user goals and spending patterns. Use this when users ask "what should I do next?", "how can I reach my goal faster?", or want recommendations based on their goals and current spending.',
    inputSchema: goalieSuggestActions.inputSchema,
    outputSchema: goalieSuggestActions.outputSchema,
    run: goalieSuggestActions.execute,
    meta: {
      timeout: 20000,
      rateLimit: { perMinute: 20 },
    },
  }],
  ['chime_summarize_upcoming_obligations', {
    id: 'chime_summarize_upcoming_obligations',
    description: 'Get a list of upcoming recurring payment obligations (mortgages, loans, subscriptions, etc.) within a specified time window. Use when users ask about upcoming bills, payments due soon, or want reminders about recurring expenses.',
    inputSchema: chimeSummarizeUpcomingObligations.inputSchema,
    outputSchema: chimeSummarizeUpcomingObligations.outputSchema,
    run: chimeSummarizeUpcomingObligations.execute,
    meta: {
      timeout: 15000,
      rateLimit: { perMinute: 30 },
    },
  }],
  ['chime_list_obligations', {
    id: 'chime_list_obligations',
    description: 'List all recurring payment obligations detected for the user. Returns merchant names, amounts, frequencies, and next estimated dates. Use when users ask "what recurring payments do I have?" or "show me my recurring bills".',
    inputSchema: chimeListObligations.inputSchema,
    outputSchema: chimeListObligations.outputSchema,
    run: chimeListObligations.execute,
    meta: {
      timeout: 15000,
      rateLimit: { perMinute: 30 },
    },
  }],
  ['chime_list_upcoming_notifications', {
    id: 'chime_list_upcoming_notifications',
    description: 'List notifications queued for the user within a specified time window. Returns notification type, channel, scheduled time, and context. Use when users ask "what reminders do I have?" or "show me my upcoming notifications".',
    inputSchema: chimeListUpcomingNotifications.inputSchema,
    outputSchema: chimeListUpcomingNotifications.outputSchema,
    run: chimeListUpcomingNotifications.execute,
    meta: {
      timeout: 15000,
      rateLimit: { perMinute: 30 },
    },
  }],
  ['chime_draft_notification_copy', {
    id: 'chime_draft_notification_copy',
    description: 'Draft friendly notification text (title, in-app body, email body) for payment reminders and milestones. Ensures guardrail-compliant, non-shaming tone. Use when creating or refining notifications for users.',
    inputSchema: chimeDraftNotificationCopy.inputSchema,
    outputSchema: chimeDraftNotificationCopy.outputSchema,
    run: chimeDraftNotificationCopy.execute,
    meta: {
      timeout: 10000,
      rateLimit: { perMinute: 50 },
    },
  }],
  ['chime_generate_notification', {
    id: 'chime_generate_notification',
    description: 'Generate safe notification text (title + body) for recurring debt/obligation scenarios. Takes structured scenario data (merchant, amount, days until due, progress summaries) and returns guardrail-compliant, friendly notification copy. Use when Chime needs to generate notification text from structured obligation data.',
    inputSchema: chimeGenerateNotification.inputSchema,
    outputSchema: chimeGenerateNotification.outputSchema,
    run: chimeGenerateNotification.execute,
    meta: {
      timeout: 10000,
      rateLimit: { perMinute: 50 },
    },
  }],
]);

export function toOpenAIToolDefs(ids: string[]): OpenAIToolDef[] {
  return ids
    .map(id => toolModules.get(id))
    .filter(Boolean)
    .map(tool => ({
      type: 'function' as const,
      function: {
        name: tool!.id,
        description: tool!.description,
        parameters: zodToJsonSchema(tool!.inputSchema, {
          target: 'openApi3',
          $refStrategy: 'none',
        }),
      },
    }));
}

export function pickTools(ids: string[]): Record<string, ToolModule> {
  const picked: Record<string, ToolModule> = {};
  for (const id of ids) {
    const tool = toolModules.get(id);
    if (tool) picked[id] = tool;
  }
  return picked;
}

// Tool execution with timeout and cancellation
export async function executeTool(
  tool: ToolModule,
  input: any,
  ctx: ToolContext,
  loggingOptions?: {
    employeeSlug?: string;
    mode?: 'explain-only' | 'propose-confirm' | 'auto-pilot';
    autonomyLevel?: number;
  }
): Promise<any> {
  // Validate input
  const validation = tool.inputSchema.safeParse(input);
  if (!validation.success) {
    // Log validation error (fire-and-forget)
    if (loggingOptions?.employeeSlug) {
      const { logToolExecution, generateInputSummary } = await import('./logToolExecution');
      logToolExecution({
        userId: ctx.userId,
        employeeSlug: loggingOptions.employeeSlug,
        toolId: tool.id,
        mode: loggingOptions.mode || 'propose-confirm',
        autonomyLevel: loggingOptions.autonomyLevel ?? 1,
        inputSummary: generateInputSummary(tool.id, input),
        status: 'error',
        errorMessage: 'Invalid input validation',
      }).catch(err => console.error('[executeTool] Failed to log validation error:', err));
    }
    
    return {
      error: 'Invalid input',
      details: validation.error.errors,
    };
  }
  
  // Check rate limit
  if (tool.meta.rateLimit) {
    const rateLimitKey = `tool:${tool.id}:${ctx.userId}`;
    const isAllowed = await checkToolRateLimit(rateLimitKey, tool.meta.rateLimit);
    if (!isAllowed) {
      // Log rate limit (fire-and-forget)
      if (loggingOptions?.employeeSlug) {
        const { logToolExecution, generateInputSummary } = await import('./logToolExecution');
        logToolExecution({
          userId: ctx.userId,
          employeeSlug: loggingOptions.employeeSlug,
          toolId: tool.id,
          mode: loggingOptions.mode || 'propose-confirm',
          autonomyLevel: loggingOptions.autonomyLevel ?? 1,
          inputSummary: generateInputSummary(tool.id, input),
          status: 'skipped',
          errorMessage: 'Rate limit exceeded',
        }).catch(err => console.error('[executeTool] Failed to log rate limit:', err));
      }
      
      return {
        error: 'Rate limit exceeded',
        retryAfter: 60,
      };
    }
  }
  
  // Execute with timeout
  const timeout = tool.meta.timeout || 30000;
  const controller = new AbortController();
  
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const result = await tool.run(validation.data, {
      ...ctx,
      abortSignal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // Handle Result type (Ok/Err) if tool returns it
    let unwrappedResult = result;
    if (result && typeof result === 'object' && 'ok' in result) {
      if (!result.ok) {
        // Error case
        return {
          error: result.error?.message || 'Tool execution failed',
          details: result.error,
        };
      }
      // Success case - unwrap the value
      unwrappedResult = result.value;
    }
    
    // Validate output
    const outputValidation = tool.outputSchema.safeParse(unwrappedResult);
    if (!outputValidation.success) {
      console.error('Tool output validation failed:', outputValidation.error);
      
      // Log failed validation
      if (loggingOptions?.employeeSlug) {
        const { logToolExecution } = await import('./logToolExecution');
        logToolExecution({
          userId: ctx.userId,
          employeeSlug: loggingOptions.employeeSlug,
          toolId: tool.id,
          mode: loggingOptions.mode || 'propose-confirm',
          autonomyLevel: loggingOptions.autonomyLevel ?? 1,
          status: 'error',
          errorMessage: 'Tool returned invalid output',
        }).catch(err => console.error('[executeTool] Failed to log validation error:', err));
      }
      
      return {
        error: 'Tool returned invalid output',
        details: outputValidation.error.errors,
      };
    }
    
    // Log successful execution (fire-and-forget)
    if (loggingOptions?.employeeSlug) {
      const { logToolExecution, extractAffectedCount, generateInputSummary } = await import('./logToolExecution');
      logToolExecution({
        userId: ctx.userId,
        employeeSlug: loggingOptions.employeeSlug,
        toolId: tool.id,
        mode: loggingOptions.mode || 'propose-confirm',
        autonomyLevel: loggingOptions.autonomyLevel ?? 1,
        inputSummary: generateInputSummary(tool.id, input),
        affectedCount: extractAffectedCount(outputValidation.data),
        status: 'success',
      }).catch(err => console.error('[executeTool] Failed to log tool execution:', err));
    }
    
    return outputValidation.data;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Log error (fire-and-forget)
    if (loggingOptions?.employeeSlug) {
      const { logToolExecution, generateInputSummary } = await import('./logToolExecution');
      const errorMessage = error instanceof Error ? error.message : String(error);
      logToolExecution({
        userId: ctx.userId,
        employeeSlug: loggingOptions.employeeSlug,
        toolId: tool.id,
        mode: loggingOptions.mode || 'propose-confirm',
        autonomyLevel: loggingOptions.autonomyLevel ?? 1,
        inputSummary: generateInputSummary(tool.id, input),
        status: error.name === 'AbortError' ? 'cancelled' : 'error',
        errorMessage: errorMessage,
      }).catch(err => console.error('[executeTool] Failed to log error:', err));
    }
    
    if (error.name === 'AbortError') {
      return {
        error: 'Tool execution timeout',
        timeout,
      };
    }
    
    throw error;
  }
}

// Simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

async function checkToolRateLimit(
  key: string,
  limit: { perMinute: number }
): Promise<boolean> {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + 60000,
    });
    return true;
  }
  
  if (entry.count >= limit.perMinute) {
    return false;
  }
  
  entry.count++;
  return true;
}
