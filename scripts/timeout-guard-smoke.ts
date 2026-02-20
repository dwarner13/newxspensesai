type OrchCtxSmoke = {
  fallback_used: boolean;
  openai_timeout: boolean;
  timeout_label: string | null;
  timeout_ms: number | null;
};

class OpenAiTimeoutError extends Error {
  readonly isOpenAiTimeout = true;
  readonly timeoutMs: number;
  readonly timeoutLabel: string;

  constructor(message: string, timeoutMs: number, timeoutLabel: string) {
    super(message);
    this.name = 'OpenAiTimeoutError';
    this.timeoutMs = timeoutMs;
    this.timeoutLabel = timeoutLabel;
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
  orchCtx: OrchCtxSmoke
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      orchCtx.fallback_used = true;
      orchCtx.openai_timeout = true;
      orchCtx.timeout_label = label;
      orchCtx.timeout_ms = ms;
      reject(new OpenAiTimeoutError(`Timed out: ${label}`, ms, label));
    }, ms);

    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function buildSafeFallbackResponse(stage: string): string {
  return `I'm processing your data — one moment. I hit a delay in the ${stage} step, so please retry and I'll continue from there.\n\nThis is taking longer than normal. I can still help — tell me if you want a quick answer or a detailed one.`;
}

function ensureAssistantContent(content: string): string {
  const text = String(content || '').trim();
  return text.length > 0 ? text : buildSafeFallbackResponse('respond');
}

function buildJsonFallbackShape(input: {
  employee: string;
  sessionId: string;
  threadId: string;
  content: string;
}) {
  return {
    ok: false,
    error: 'OpenAI timeout',
    content: input.content,
    employee: input.employee,
    employeeSlug: input.employee,
    sessionId: input.sessionId,
    thread_id: input.threadId,
  };
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function run(): Promise<void> {
  const ctx: OrchCtxSmoke = {
    fallback_used: false,
    openai_timeout: false,
    timeout_label: null,
    timeout_ms: null,
  };

  let timeoutCaught = false;
  try {
    await withTimeout(
      new Promise<string>(() => {
        // intentionally never resolve
      }),
      25,
      'smoke_never_resolves',
      ctx
    );
  } catch (error: any) {
    timeoutCaught = Boolean(error?.isOpenAiTimeout);
  }

  assert(timeoutCaught, 'expected timeout error');
  assert(ctx.fallback_used, 'expected fallback_used=true');
  assert(ctx.openai_timeout, 'expected openai_timeout=true');
  assert(ctx.timeout_label === 'smoke_never_resolves', 'expected timeout label');
  assert(ctx.timeout_ms === 25, 'expected timeout ms');

  const content = ensureAssistantContent(buildSafeFallbackResponse('respond'));
  assert(content.trim().length > 0, 'fallback content must be non-empty');

  const shape = buildJsonFallbackShape({
    employee: 'prime-boss',
    sessionId: 'session-smoke',
    threadId: 'thread-smoke',
    content,
  });
  assert(typeof shape.ok === 'boolean', 'expected ok in shape');
  assert(typeof shape.content === 'string' && shape.content.length > 0, 'expected non-empty content in shape');
  assert(Boolean(shape.thread_id), 'expected thread_id in shape');

  console.log('[timeout-guard-smoke] PASS');
}

run().catch((error) => {
  console.error('[timeout-guard-smoke] FAIL', error);
  process.exitCode = 1;
});
