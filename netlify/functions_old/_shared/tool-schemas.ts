// _shared/tool-schemas.ts
export type ToolDef = {
  name: string;
  description: string;
  parameters: Record<string, any>; // OpenAI "json_schema" style
};

export const toolSchemas: ToolDef[] = [
  {
    name: "searchEmail",
    description: "Search user email for messages. Returns message IDs and metadata.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search text like 'visa statement'" },
        days: { type: "number", description: "Look back this many days", minimum: 1, default: 90 }
      },
      required: ["query"]
    }
  },
  {
    name: "fetchAttachments",
    description: "Fetch attachments for a given email messageId and queue import.",
    parameters: {
      type: "object",
      properties: {
        messageId: { type: "string", description: "Email message ID" }
      },
      required: ["messageId"]
    }
  },
  {
    name: "startSmartImport",
    description: "Start/continue smart-import for a file already in storage.",
    parameters: {
      type: "object",
      properties: {
        storagePath: { type: "string", description: "Path in storage (e.g., u/do/doc-ghi789/file.pdf)" }
      },
      required: ["storagePath"]
    }
  },
  {
    name: "getRecentImportSummary",
    description: "Summarize recent import: last doc name, vendor, amount, needs review.",
    parameters: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "getTransactions",
    description: "Query transactions by date range, vendor, or category.",
    parameters: {
      type: "object",
      properties: {
        from: { type: "string", description: "ISO date start (inclusive)" },
        to:   { type: "string", description: "ISO date end (inclusive)" },
        vendor: { type: "string" },
        category: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 200, default: 50 }
      }
    }
  },
  {
    name: "getNeedsReview",
    description: "List transactions that need review.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", minimum: 1, maximum: 200, default: 50 }
      }
    }
  }
];

// Convert to OpenAI tools format
export const OPENAI_TOOLS = toolSchemas.map(t => ({
  type: 'function' as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.parameters
  }
}));

