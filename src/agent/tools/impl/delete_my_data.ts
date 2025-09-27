import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { deleteUserData } from '../../../server/db';

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

export async function execute(
  input: Input,
  context: { userId: string }
): Promise<Result<Output>> {
  try {
    // Validate input
    const parsed = inputSchema.parse(input);
    
    if (!parsed.confirm) {
      return Ok({
        ok: false,
        message: 'Data deletion requires confirmation. Please send {confirm: true} to proceed. This action is irreversible.',
      });
    }
    
    // Execute deletion
    const result = await deleteUserData(context.userId);
    
    if (!result.ok) {
      return Err(new Error(`Deletion failed: ${result.error.message}`));
    }
    
    return Ok({
      ok: true,
      message: 'All your data has been successfully deleted. This action has been logged for compliance.',
    });
  } catch (error) {
    return Err(error as Error);
  }
}

export const metadata = {
  name: 'Delete My Data',
  description: 'Permanently delete all user data (GDPR compliance)',
  requiresConfirmation: true,
  dangerous: true,
  category: 'data_management',
};
