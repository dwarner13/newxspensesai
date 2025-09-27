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
  ctx: ToolContext
): Promise<any> {
  // Validate input
  const validation = tool.inputSchema.safeParse(input);
  if (!validation.success) {
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
    
    // Validate output
    const outputValidation = tool.outputSchema.safeParse(result);
    if (!outputValidation.success) {
      console.error('Tool output validation failed:', outputValidation.error);
      return {
        error: 'Tool returned invalid output',
      };
    }
    
    return outputValidation.data;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
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
