/**
 * 🔍 Input Validation Middleware
 *
 * Features:
 * - Zod schema validation (strict type safety)
 * - Graceful error handling (user-friendly messages)
 * - Field-level error details
 * - GET/POST/PUT/DELETE method handling
 * - Nested object validation
 * - Array validation with element type checking
 * - Custom error transformers
 * - PII-safe logging (never logs validated data)
 * - Telemetry & monitoring
 * - Transform function support (data normalization)
 *
 * Usage:
 *   import { z } from 'zod';
 *   import { withValidation } from './_shared/validation';
 *
 *   const schema = z.object({
 *     user_id: z.string().uuid(),
 *     amount: z.number().positive(),
 *     category: z.enum(['food', 'transport', 'other']),
 *   });
 *
 *   export const handler = withValidation(schema, async (event, context, input) => {
 *     // input is fully typed as z.infer<typeof schema>
 *     return { statusCode: 200, body: JSON.stringify({ ok: true }) };
 *   });
 */

import { ZodSchema, ZodError, z } from "zod";
import { safeLog } from "./guardrail-log";

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  received: string;
  expected: string;
}

export interface ValidationOptions {
  /** Custom error response builder */
  errorResponse?: (
    errors: ValidationErrorDetail[],
    originalError: ZodError
  ) => any;

  /** Log validation failures (default: true) */
  logFailures?: boolean;

  /** Include field-level details in error response */
  includeFieldDetails?: boolean;

  /** Custom telemetry callback */
  onValidationError?: (data: ValidationFailureEvent) => void;

  /** Transform validated data (e.g., normalize strings, convert types) */
  transform?: (data: any) => any;

  /** Allowed HTTP methods (default: all) */
  allowedMethods?: string[];

  /** Custom message for method not allowed */
  methodNotAllowedMessage?: string;
}

export interface ValidationFailureEvent {
  timestamp: number;
  method: string;
  path: string;
  errorCount: number;
  errors: ValidationErrorDetail[];
  severity: "warning" | "critical";
}

// ============================================================================
// ERROR PARSING
// ============================================================================

/**
 * Parse Zod error into user-friendly format
 */
function parseZodError(error: ZodError): ValidationErrorDetail[] {
  return error.errors.map((issue) => {
    const path = issue.path.join(".");

    return {
      field: path || "root",
      message: issue.message,
      code: issue.code,
      received: String(issue.received || "unknown"),
      expected: getExpectedType(issue),
    };
  });
}

/**
 * Extract expected type from Zod issue
 */
function getExpectedType(issue: any): string {
  if (issue.code === "invalid_type") {
    return issue.expected || "unknown";
  }
  if (issue.code === "invalid_enum_value") {
    return `one of: ${issue.options?.join(", ") || "unknown"}`;
  }
  if (issue.code === "too_small") {
    return `minimum ${issue.minimum} ${issue.type}`;
  }
  if (issue.code === "too_big") {
    return `maximum ${issue.maximum} ${issue.type}`;
  }
  return "valid value";
}

/**
 * Extract payload based on HTTP method
 */
function extractPayload(event: any): any {
  const method = event.httpMethod?.toUpperCase() || "GET";

  switch (method) {
    case "GET":
    case "DELETE":
      // Query parameters
      return event.queryStringParameters || {};

    case "POST":
    case "PUT":
    case "PATCH":
      // JSON body
      try {
        return JSON.parse(event.body || "{}");
      } catch (err) {
        throw new Error("Invalid JSON in request body");
      }

    default:
      return {};
  }
}

// ============================================================================
// MAIN MIDDLEWARE
// ============================================================================

/**
 * HOC to add Zod validation to any Netlify handler
 *
 * @example
 * const schema = z.object({
 *   user_id: z.string().uuid(),
 *   email: z.string().email(),
 * });
 *
 * export const handler = withValidation(schema, async (event, context, input) => {
 *   console.log(input.user_id); // Fully typed!
 *   return { statusCode: 200, body: JSON.stringify({ ok: true }) };
 * });
 */
export function withValidation<T extends ZodSchema<any>>(
  schema: T,
  handler: (
    event: any,
    context: any,
    input: z.infer<T>
  ) => Promise<any>,
  options: ValidationOptions = {}
): (event: any, context: any) => Promise<any> {
  const {
    errorResponse,
    logFailures = true,
    includeFieldDetails = true,
    onValidationError,
    transform,
    allowedMethods,
    methodNotAllowedMessage = "HTTP method not allowed",
  } = options;

  return async (event: any, context: any) => {
    const now = Date.now();
    const method = event.httpMethod?.toUpperCase() || "GET";
    const path = event.path || event.requestContext?.path || "/unknown";

    // ========== Method Check ==========
    if (allowedMethods && !allowedMethods.includes(method)) {
      safeLog("warn", "validation_method_not_allowed", {
        method,
        path,
        allowed: allowedMethods,
      });

      return {
        statusCode: 405,
        headers: { Allow: allowedMethods.join(", ") },
        body: JSON.stringify({
          ok: false,
          error: methodNotAllowedMessage,
          method,
          allowed: allowedMethods,
        }),
      };
    }

    try {
      // ========== Extract Payload ==========
      let payload: any;
      try {
        payload = extractPayload(event);
      } catch (err) {
        safeLog("warn", "validation_payload_extraction_failed", {
          method,
          path,
          error: err instanceof Error ? err.message : String(err),
        });

        return {
          statusCode: 400,
          body: JSON.stringify({
            ok: false,
            error: "Invalid request format",
          }),
        };
      }

      // ========== Parse & Validate ==========
      let validated: any;
      try {
        validated = schema.parse(payload);
      } catch (err) {
        if (!(err instanceof ZodError)) throw err;

        // ========== Validation Failed ==========
        const errors = parseZodError(err);
        const severity = errors.length > 5 ? "critical" : "warning";

        if (logFailures) {
          safeLog(severity, "validation_failed", {
            path,
            method,
            errorCount: errors.length,
            errors: errors.map((e) => ({ field: e.field, code: e.code })),
          });
        }

        // Emit telemetry
        onValidationError?.({
          timestamp: now,
          method,
          path,
          errorCount: errors.length,
          errors,
          severity,
        });

        // Build error response
        const response = errorResponse?.(errors, err) || {
          statusCode: 400,
          body: JSON.stringify({
            ok: false,
            error: "Validation failed",
            errorCount: errors.length,
            ...(includeFieldDetails && {
              errors: errors.map((e) => ({
                field: e.field,
                message: e.message,
                code: e.code,
                expected: e.expected,
              })),
            }),
          }),
        };

        return response;
      }

      // ========== Transform (if provided) ==========
      if (transform) {
        try {
          validated = transform(validated);
        } catch (err) {
          safeLog("error", "validation_transform_failed", {
            error: err instanceof Error ? err.message : String(err),
            path,
            method,
          });

          return {
            statusCode: 500,
            body: JSON.stringify({
              ok: false,
              error: "Data transformation failed",
            }),
          };
        }
      }

      // ========== Call Handler ==========
      const result = await handler(event, context, validated);

      // Add validation headers to response
      return {
        ...result,
        headers: {
          ...result?.headers,
          "X-Validation-Status": "passed",
          "X-Validation-Time": `${Date.now() - now}ms`,
        },
      };
    } catch (err) {
      safeLog("error", "validation_middleware_error", {
        error: err instanceof Error ? err.message : String(err),
        path,
        method,
      });

      return {
        statusCode: 500,
        body: JSON.stringify({
          ok: false,
          error: "Internal server error",
        }),
      };
    }
  };
}

// ============================================================================
// BATCH VALIDATION (for multiple schema versions)
// ============================================================================

export interface BatchValidationOptions extends ValidationOptions {
  /** Version selector (e.g., API version header) */
  versionSelector?: (event: any) => string;

  /** Default version if selector returns nothing */
  defaultVersion?: string;
}

/**
 * Validate against multiple schema versions
 * Useful for API versioning and backward compatibility
 *
 * @example
 * const schemas = {
 *   'v1': z.object({ user_id: z.string() }),
 *   'v2': z.object({ user_id: z.string().uuid() }),
 * };
 *
 * export const handler = withBatchValidation(schemas, async (evt, ctx, input, version) => {
 *   console.log(`Validated with schema v${version}`);
 *   return { statusCode: 200, body: JSON.stringify({ ok: true }) };
 * }, {
 *   versionSelector: (evt) => evt.headers['api-version'] || 'v1',
 * });
 */
export function withBatchValidation<T extends Record<string, ZodSchema<any>>>(
  schemas: T,
  handler: (
    event: any,
    context: any,
    input: any,
    version: string
  ) => Promise<any>,
  options: BatchValidationOptions = {}
): (event: any, context: any) => Promise<any> {
  const {
    versionSelector,
    defaultVersion = Object.keys(schemas)[0],
    ...validationOpts
  } = options;

  return async (event: any, context: any) => {
    // Determine which schema version to use
    const version = versionSelector?.(event) || defaultVersion;

    if (!schemas[version]) {
      safeLog("warn", "validation_unknown_version", {
        version,
        available: Object.keys(schemas),
      });

      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: `Unknown API version: ${version}`,
          available: Object.keys(schemas),
        }),
      };
    }

    // Validate with selected schema
    const schema = schemas[version];
    const wrappedHandler = async (evt: any, ctx: any, input: any) => {
      return handler(evt, ctx, input, version);
    };

    return withValidation(schema, wrappedHandler, validationOpts)(
      event,
      context
    );
  };
}

// ============================================================================
// COMMON SCHEMA TEMPLATES
// ============================================================================

/**
 * Pre-built schemas for common use cases
 */
export const CommonSchemas = {
  /** Pagination parameters */
  pagination: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sort: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("asc"),
  }),

  /** User/Auth */
  userId: z.object({
    user_id: z.string().uuid(),
  }),

  email: z.object({
    email: z.string().email(),
  }),

  /** Financial */
  amount: z.object({
    amount: z.number().positive(),
    currency: z.string().length(3).default("USD"),
  }),

  /** Search */
  search: z.object({
    q: z.string().min(1).max(200),
    category: z.string().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),

  /** Date range */
  dateRange: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  }),

  /** Filters */
  filters: z.object({
    status: z.string().optional(),
    tags: z.array(z.string()).optional(),
    archived: z.boolean().optional(),
  }),
};

// ============================================================================
// COMPOSABLE SCHEMA BUILDERS
// ============================================================================

/**
 * Combine multiple schemas
 * @example
 * const schema = combineSchemas(
 *   CommonSchemas.userId,
 *   z.object({ amount: z.number().positive() })
 * );
 */
export function combineSchemas(...schemas: ZodSchema<any>[]): ZodSchema<any> {
  return z.intersection(schemas[0], schemas[1]).and(
    schemas.slice(2).reduce((acc, schema) => acc.and(schema), schemas[0])
  );
}

/**
 * Make all fields optional
 * @example
 * const updateSchema = makeOptional(createSchema);
 */
export function makeOptional<T extends ZodSchema<any>>(
  schema: T
): ZodSchema<Partial<z.infer<T>>> {
  if (schema instanceof z.ZodObject) {
    return schema.partial() as any;
  }
  return schema;
}

/**
 * Mark fields as required
 * @example
 * const strictSchema = makeRequired(schema, ['user_id', 'amount']);
 */
export function makeRequired<T extends ZodSchema<any>>(
  schema: T,
  fields: string[]
): ZodSchema<z.infer<T>> {
  if (schema instanceof z.ZodObject) {
    return schema.required(
      fields.reduce((acc, f) => ({ ...acc, [f]: true }), {})
    ) as any;
  }
  return schema;
}

// ============================================================================
// TYPES
// ============================================================================

export type ValidationResult<T extends ZodSchema<any>> = 
  | { ok: true; data: z.infer<T> }
  | { ok: false; errors: ValidationErrorDetail[] };

/**
 * Standalone validation function (for non-Netlify contexts)
 */
export async function validate<T extends ZodSchema<any>>(
  schema: T,
  input: any
): Promise<ValidationResult<T>> {
  try {
    const data = schema.parse(input);
    return { ok: true, data };
  } catch (err) {
    if (!(err instanceof ZodError)) throw err;
    return {
      ok: false,
      errors: parseZodError(err),
    };
  }
}





