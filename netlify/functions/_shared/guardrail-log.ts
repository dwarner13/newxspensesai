export function makeGuardrailLogger() {
  return {
    info: (msg: string, data?: any) => console.log(`[Guardrails] ${msg}`, data),
    warn: (msg: string, data?: any) => console.warn(`[Guardrails] ${msg}`, data),
    error: (msg: string, data?: any) => console.error(`[Guardrails] ${msg}`, data),
    debug: (msg: string, data?: any) => console.debug(`[Guardrails] ${msg}`, data)
  };
}
