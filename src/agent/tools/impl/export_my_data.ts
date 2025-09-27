import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { exportUserData } from '../../../server/db';

export const id = 'export_my_data';

export const inputSchema = z.object({
  format: z.enum(['json', 'csv', 'pdf']).optional().default('json'),
});

export const outputSchema = z.object({
  url: z.string(),
  expiresAt: z.string(),
  format: z.string(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

export async function execute(
  input: Input,
  context: { userId: string }
): Promise<Result<Output>> {
  try {
    const parsed = inputSchema.parse(input);
    
    // Execute actual export
    const result = await exportUserData(context.userId);
    
    if (!result.ok) {
      return Err(new Error(`Export failed: ${result.error.message}`));
    }
    
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    return Ok({
      url: result.value,
      expiresAt,
      format: parsed.format,
    });
  } catch (error) {
    return Err(error as Error);
  }
}

export const metadata = {
  name: 'Export My Data',
  description: 'Export all user data for download (GDPR compliance)',
  requiresConfirmation: false,
  dangerous: false,
  category: 'data_management',
};
