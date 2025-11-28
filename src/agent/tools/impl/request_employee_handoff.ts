import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';

export const id = 'request_employee_handoff';

export const inputSchema = z.object({
  target_slug: z.string().min(1, 'Target employee slug is required').describe('The slug of the employee to hand off to (e.g., "goalie-ai", "liberty-ai", "prime-boss")'),
  reason: z.string().optional().describe('Optional reason for the handoff (for logging and context)'),
  summary_for_next_employee: z.string().optional().describe('Short recap of what the user needs (helps the next employee understand context)'),
});

export const outputSchema = z.object({
  ok: z.boolean(),
  data: z.object({
    requested_handoff: z.boolean(),
    target_slug: z.string(),
    reason: z.string().optional(),
    summary_for_next_employee: z.string().optional(),
  }),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Request handoff to another AI employee
 * 
 * This tool allows any employee to transfer the conversation to a more appropriate
 * employee. The backend will switch the active employee for the session and continue
 * the conversation with the new employee.
 * 
 * The tool does NOT modify the database directly - it returns a signal that the
 * backend chat handler will use to update the session and insert system messages.
 */
export async function execute(
  input: Input,
  ctx: { userId: string; sessionId?: string }
): Promise<Result<Output>> {
  try {
    const { target_slug, reason, summary_for_next_employee } = input;
    
    // Validate that target_slug is not empty
    if (!target_slug || target_slug.trim().length === 0) {
      return Err(new Error('target_slug is required and cannot be empty'));
    }
    
    return Ok({
      ok: true,
      data: {
        requested_handoff: true,
        target_slug: target_slug.trim(),
        reason: reason?.trim(),
        summary_for_next_employee: summary_for_next_employee?.trim(),
      },
    });
  } catch (error) {
    return Err(error as Error);
  }
}

export const metadata = {
  name: 'Request Employee Handoff',
  description: 'Transfer the conversation to another AI employee who is better suited to answer the user\'s question. Use this when the user asks about topics outside your domain (e.g., goal tracking → Goalie, emotional support → Liberty, analytics → Crystal, strategic planning → Prime/Finley).',
  requiresConfirmation: false,
  dangerous: false,
};


