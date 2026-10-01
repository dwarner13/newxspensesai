import { z } from 'zod';
import { VISIBLE_CANDIDATE_FRAME_MAX } from '../../../shared/tx-candidate-ownership';

export const inputSchema = z.object({
  candidateNumber: z
    .number()
    .int()
    .min(1)
    // P3.3D: only the visible candidate frame (numbered cards) is selectable.
    // The authoritative bound is enforced against the persisted frame in chat.ts.
    .max(VISIBLE_CANDIDATE_FRAME_MAX)
    .describe('Position of the transaction in the current numbered candidate list shown on the transaction cards (1 = first, 2 = second, etc.)'),
});

export const outputSchema = z.object({
  selected: z.boolean(),
  candidateNumber: z.number().optional(),
  transaction: z.object({
    id: z.string(),
    merchant: z.string().nullable(),
    amount: z.number().nullable(),
    date: z.string().nullable(),
    category: z.string().nullable(),
  }).optional(),
  error: z.string().optional(),
});

/**
 * select_transaction is a SERVER-SIDE-ONLY selection tool.
 *
 * The model provides a candidateNumber (1-based) and the server resolves
 * the UUID from the persisted TransactionResolutionContext in
 * chat_sessions.context.tx_resolution.
 *
 * This tool's `run` is a NO-OP stub — the actual selection logic lives
 * in chat.ts where the session context is available.  chat.ts intercepts
 * select_transaction calls and handles them inline before reaching
 * executeTool().
 */
export async function execute(
  _input: z.infer<typeof inputSchema>,
  _ctx: any,
): Promise<z.infer<typeof outputSchema>> {
  // This should never be reached — chat.ts intercepts select_transaction
  // before executeTool() is called.
  return {
    selected: false,
    error: 'select_transaction must be handled by the chat orchestrator, not executed directly.',
  };
}
