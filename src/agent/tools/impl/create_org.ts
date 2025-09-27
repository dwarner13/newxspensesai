import { z } from 'zod';
import { TeamManager } from '../../../server/teams/teamManager';

export const id = 'create_org';

export const inputSchema = z.object({
  name: z.string().min(2).max(50),
  plan_id: z.string().optional(),
  confirm: z.boolean().optional(),
});

export const outputSchema = z.object({
  ok: z.boolean(),
  org_id: z.string().optional(),
  message: z.string(),
});

export async function execute(input: any, ctx: any) {
  const teamManager = new TeamManager();
  
  const orgId = await teamManager.createOrganization({
    name: input.name,
    ownerUserId: ctx.userId,
    planId: input.plan_id,
  });
  
  return {
    ok: true,
    org_id: orgId,
    message: `Organization "${input.name}" created successfully`,
  };
}

export const metadata = {
  name: 'Create Organization',
  description: 'Create a new organization for team collaboration',
  category: 'team',
  requiresConfirmation: true,
  mutates: true,
  costly: true,
  timeout: 30000,
};
