import { z } from 'zod';
import { Result, Ok } from '../../../types/result';

/**
 * delete_my_data — DESTRUCTIVE CAPABILITY DISABLED (owner, 2026-11-25).
 *
 * The previous implementation let an AI employee call deleteUserData() after the model itself
 * supplied { confirm: true }, i.e. an AI-generated message could stand in for the customer's
 * explicit authorization, and the deletion targeted mostly legacy tables with no truthful report.
 * No employee may run unrestricted account deletion or bulk financial-data destruction.
 *
 * Until a separately reviewed server-side deletion design ships (individual conversation deletion,
 * financial-data reset, permanent account deletion — each authenticated, re-authenticated,
 * explicitly confirmed by the customer in the app, retry-safe and truthfully reported), this tool
 * deletes NOTHING and gives the customer an honest next step.
 */

export const id = 'delete_my_data';

export const inputSchema = z.object({
  confirm: z.boolean().optional(),
});

export const outputSchema = z.object({
  ok: z.boolean(),
  message: z.string(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

export const DELETE_UNAVAILABLE_MESSAGE =
  "I can't delete your account or data from chat. Nothing has been deleted. To delete your account or your data, please contact XspensesAI support — they'll confirm it's you and tell you exactly what will be removed.";

export async function execute(_input: Input, _context: { userId: string }): Promise<Result<Output>> {
  void _input;
  void _context;
  return Ok({ ok: false, message: DELETE_UNAVAILABLE_MESSAGE });
}

export const metadata = {
  name: 'Delete My Data (disabled)',
  description: 'Disabled: data and account deletion are not available from chat. Never deletes anything.',
  requiresConfirmation: false,
  dangerous: false,
  category: 'data_management',
};
