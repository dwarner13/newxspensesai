import { z } from 'zod';
import { TeamManager } from '../../../server/teams/teamManager';

export const id = 'invite_member';

export const inputSchema = z.object({
  org_id: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer', 'billing']),
  confirm: z.boolean().optional(),
});

export const outputSchema = z.object({
  ok: z.boolean(),
  message: z.string(),
});

export async function execute(input: any, ctx: any) {
  const teamManager = new TeamManager();
  
  await teamManager.inviteMember({
    orgId: input.org_id,
    email: input.email,
    role: input.role,
    invitedBy: ctx.userId,
  });
  
  return {
    ok: true,
    message: `Invitation sent to ${input.email} as ${input.role}`,
  };
}

export const metadata = {
  name: 'Invite Team Member',
  description: 'Invite a new member to the organization',
  category: 'team',
  requiresConfirmation: true,
  mutates: true,
  costly: false,
  timeout: 15000,
};
