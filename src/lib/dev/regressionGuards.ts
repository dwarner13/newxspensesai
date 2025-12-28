/**
 * DEV Regression Guards
 * 
 * These guards warn/throw when invariants are violated in development.
 * They are NO-OP in production (no UX changes).
 * 
 * Guards:
 * - Only one chat mount
 * - Engine XOR history render rule
 * - Dashboard scroll owner rule (BODY only)
 * - OCR bypass forbidden
 */

const isDev = process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true';

// ============================================================================
// Guard 1: Only One Chat Mount
// ============================================================================

let chatMountCount = 0;
const MAX_CHAT_MOUNTS = 1;

export function guardChatMount(componentName: string): () => void {
  if (!isDev) {
    return () => {}; // NO-OP in production
  }

  chatMountCount++;
  
  if (chatMountCount > MAX_CHAT_MOUNTS) {
    const error = new Error(
      `[REGRESSION GUARD] Multiple chat mounts detected! ` +
      `Current count: ${chatMountCount}, Max allowed: ${MAX_CHAT_MOUNTS}. ` +
      `Component: ${componentName}. ` +
      `This can cause double message rendering.`
    );
    console.error(error);
    throw error;
  }

  console.log(`[REGRESSION GUARD] Chat mount #${chatMountCount}: ${componentName}`);

  // Return cleanup function
  return () => {
    chatMountCount--;
    console.log(`[REGRESSION GUARD] Chat unmount: ${componentName} (remaining: ${chatMountCount})`);
  };
}

// ============================================================================
// Guard 2: Engine XOR History Render Rule
// ============================================================================

let engineRenderCount = 0;
let historyRenderCount = 0;

export function guardEngineRender(): () => void {
  if (!isDev) {
    return () => {};
  }

  engineRenderCount++;
  
  if (historyRenderCount > 0 && engineRenderCount > 0) {
    const error = new Error(
      `[REGRESSION GUARD] Both engine and history are rendering! ` +
      `Engine count: ${engineRenderCount}, History count: ${historyRenderCount}. ` +
      `Only ONE should render at a time (XOR rule).`
    );
    console.error(error);
    throw error;
  }

  console.log(`[REGRESSION GUARD] Engine render (count: ${engineRenderCount})`);

  return () => {
    engineRenderCount--;
    console.log(`[REGRESSION GUARD] Engine unmount (remaining: ${engineRenderCount})`);
  };
}

export function guardHistoryRender(): () => void {
  if (!isDev) {
    return () => {};
  }

  historyRenderCount++;
  
  if (engineRenderCount > 0 && historyRenderCount > 0) {
    const error = new Error(
      `[REGRESSION GUARD] Both engine and history are rendering! ` +
      `Engine count: ${engineRenderCount}, History count: ${historyRenderCount}. ` +
      `Only ONE should render at a time (XOR rule).`
    );
    console.error(error);
    throw error;
  }

  console.log(`[REGRESSION GUARD] History render (count: ${historyRenderCount})`);

  return () => {
    historyRenderCount--;
    console.log(`[REGRESSION GUARD] History unmount (remaining: ${historyRenderCount})`);
  };
}

// ============================================================================
// Guard 3: Dashboard Scroll Owner Rule (BODY only)
// ============================================================================

let scrollOwner: string | null = null;

export function guardScrollOwner(owner: string, path: string): () => void {
  if (!isDev) {
    return () => {};
  }

  // Only check on dashboard routes
  if (!path.startsWith('/dashboard')) {
    return () => {};
  }

  if (scrollOwner && scrollOwner !== owner) {
    const error = new Error(
      `[REGRESSION GUARD] Multiple scroll owners detected! ` +
      `Current owner: ${scrollOwner}, New owner: ${owner}, Path: ${path}. ` +
      `Only BODY should own scroll on /dashboard routes.`
    );
    console.error(error);
    throw error;
  }

  scrollOwner = owner;
  console.log(`[REGRESSION GUARD] Scroll owner set: ${owner} (path: ${path})`);

  return () => {
    if (scrollOwner === owner) {
      scrollOwner = null;
      console.log(`[REGRESSION GUARD] Scroll owner cleared: ${owner}`);
    }
  };
}

// ============================================================================
// Guard 4: OCR Bypass Forbidden
// ============================================================================

export function guardOcrBypass(functionName: string): void {
  if (!isDev) {
    return; // NO-OP in production
  }

  const error = new Error(
    `[REGRESSION GUARD] Deprecated OCR function called: ${functionName}. ` +
    `Frontend OCR bypasses guardrails and is forbidden. ` +
    `Use src/lib/ocr/requestOcrProcessing.ts instead (canonical backend pipeline).`
  );
  console.error(error);
  throw error;
}

// ============================================================================
// Guard 5: Message Persistence Duplication
// ============================================================================

const messageInsertCache = new Map<string, number>();
const CACHE_TTL = 60000; // 1 minute

export function guardMessageInsert(
  threadId: string,
  clientMessageId?: string,
  requestId?: string
): void {
  if (!isDev) {
    return; // NO-OP in production
  }

  // Create cache key
  const cacheKey = clientMessageId
    ? `${threadId}:${clientMessageId}`
    : requestId
    ? `${threadId}:${requestId}`
    : `${threadId}:${Date.now()}`; // Fallback to timestamp if no idempotency key

  const existing = messageInsertCache.get(cacheKey);
  if (existing && Date.now() - existing < CACHE_TTL) {
    const error = new Error(
      `[REGRESSION GUARD] Duplicate message insert detected! ` +
      `Thread: ${threadId}, ` +
      `Client Message ID: ${clientMessageId || 'none'}, ` +
      `Request ID: ${requestId || 'none'}. ` +
      `This should be prevented by idempotency constraints.`
    );
    console.error(error);
    throw error;
  }

  messageInsertCache.set(cacheKey, Date.now());
  
  // Cleanup old entries
  const now = Date.now();
  for (const [key, timestamp] of messageInsertCache.entries()) {
    if (now - timestamp > CACHE_TTL) {
      messageInsertCache.delete(key);
    }
  }
}

// ============================================================================
// Reset function for testing
// ============================================================================

export function resetRegressionGuards(): void {
  if (!isDev) {
    return;
  }

  chatMountCount = 0;
  engineRenderCount = 0;
  historyRenderCount = 0;
  scrollOwner = null;
  messageInsertCache.clear();
  console.log('[REGRESSION GUARD] All guards reset');
}


