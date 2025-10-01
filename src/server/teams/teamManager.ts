import { getSupabaseServerClient } from '../db';

export interface CreateOrgParams {
  name: string;
  ownerUserId: string;
  planId?: string;
}

export interface InviteMemberParams {
  orgId: string;
  email: string;
  role: 'admin' | 'member' | 'viewer' | 'billing';
  invitedBy: string;
}

export interface OrgContext {
  orgId: string;
  role: string;
  orgName: string;
  permissions: string[];
}

export class TeamManager {
  private client = getSupabaseServerClient();
  
  async createOrganization(params: CreateOrgParams): Promise<string> {
    // Start transaction
    const { data: org, error: orgError } = await this.client
      .from('organizations')
      .insert({
        name: params.name,
        slug: this.generateSlug(params.name),
        plan_id: params.planId || 'team_starter',
      })
      .select()
      .single();
    
    if (orgError) throw orgError;
    
    // Add owner as first member
    await this.client
      .from('organization_members')
      .insert({
        org_id: org.id,
        user_id: params.ownerUserId,
        role: 'owner',
        accepted_at: new Date().toISOString(),
      });
    
    // Log activity
    await this.logActivity({
      orgId: org.id,
      userId: params.ownerUserId,
      action: 'org_created',
      details: { name: params.name },
    });
    
    return org.id;
  }
  
  async inviteMember(params: InviteMemberParams): Promise<void> {
    // Check permissions
    const hasPermission = await this.checkPermission(
      params.invitedBy,
      params.orgId,
      'invite'
    );
    
    if (!hasPermission) {
      throw new Error('Insufficient permissions to invite members');
    }
    
    // Check if user exists
    const { data: existingUser } = await this.client
      .from('profiles')
      .select('id')
      .eq('billing_email', params.email)
      .single();
    
    if (existingUser) {
      // Add existing user directly
      await this.client
        .from('organization_members')
        .upsert({
          org_id: params.orgId,
          user_id: existingUser.id,
          role: params.role,
          invited_by: params.invitedBy,
          invited_at: new Date().toISOString(),
        });
      
      // Send notification
      await this.client
        .from('notifications')
        .insert({
          user_id: existingUser.id,
          org_id: params.orgId,
          type: 'team_invitation',
          severity: 'info',
          title: 'Team Invitation',
          message: `You've been invited to join a team`,
          action_type: 'link',
          action_url: `/teams/${params.orgId}/accept`,
        });
    } else {
      // Create invitation for new user
      const token = this.generateToken();
      
      await this.client
        .from('org_invitations')
        .insert({
          org_id: params.orgId,
          email: params.email,
          role: params.role,
          token,
          invited_by: params.invitedBy,
        });
      
      // Send invitation email
      await this.sendInvitationEmail(params.email, token, params.orgId, params.role);
    }
    
    await this.logActivity({
      orgId: params.orgId,
      userId: params.invitedBy,
      action: 'member_invited',
      details: { email: params.email, role: params.role },
    });
  }
  
  async checkPermission(
    userId: string,
    orgId: string,
    action: string
  ): Promise<boolean> {
    const { data } = await this.client
      .rpc('check_org_permission', {
        p_user_id: userId,
        p_org_id: orgId,
        p_permission: action,
      });
    
    return data || false;
  }
  
  async getOrgContext(userId: string): Promise<OrgContext | null> {
    // Get user's active org (from session or preference)
    const { data: member } = await this.client
      .from('organization_members')
      .select('org_id, role, organizations!inner(*)')
      .eq('user_id', userId)
      .single();
    
    if (!member) return null;
    
    return {
      orgId: member.org_id,
      role: member.role,
      orgName: member.organizations.name,
      permissions: await this.getEffectivePermissions(userId, member.org_id),
    };
  }
  
  async getOrgMembers(orgId: string): Promise<any[]> {
    const { data: members } = await this.client
      .from('organization_members')
      .select(`
        id,
        role,
        invited_at,
        accepted_at,
        suspended_at,
        profiles!inner(
          id,
          billing_email,
          first_name,
          last_name
        )
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: true});
    
    return members || [];
  }
  
  async updateMemberRole(
    orgId: string,
    userId: string,
    newRole: string,
    updatedBy: string
  ): Promise<void> {
    // Check permissions
    const hasPermission = await this.checkPermission(updatedBy, orgId, 'invite');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to update member roles');
    }
    
    await this.client
      .from('organization_members')
      .update({ role: newRole })
      .eq('org_id', orgId)
      .eq('user_id', userId);
    
    await this.logActivity({
      orgId,
      userId: updatedBy,
      action: 'role_updated',
      details: { target_user: userId, new_role: newRole },
    });
  }
  
  async removeMember(
    orgId: string,
    userId: string,
    removedBy: string
  ): Promise<void> {
    // Check permissions
    const hasPermission = await this.checkPermission(removedBy, orgId, 'delete');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to remove members');
    }
    
    // Don't allow removing the last owner
    const { data: owners } = await this.client
      .from('organization_members')
      .select('id')
      .eq('org_id', orgId)
      .eq('role', 'owner');
    
    if (owners && owners.length === 1 && owners[0].id === userId) {
      throw new Error('Cannot remove the last owner of the organization');
    }
    
    await this.client
      .from('organization_members')
      .delete()
      .eq('org_id', orgId)
      .eq('user_id', userId);
    
    await this.logActivity({
      orgId,
      userId: removedBy,
      action: 'member_removed',
      details: { removed_user: userId },
    });
  }
  
  async acceptInvitation(token: string, userId: string): Promise<void> {
    const { data: invitation } = await this.client
      .from('org_invitations')
      .select('*')
      .eq('token', token)
      .eq('expires_at', new Date().toISOString(), { operator: 'gt' })
      .single();
    
    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }
    
    // Add user to organization
    await this.client
      .from('organization_members')
      .insert({
        org_id: invitation.org_id,
        user_id: userId,
        role: invitation.role,
        invited_by: invitation.invited_by,
        invited_at: invitation.created_at,
        accepted_at: new Date().toISOString(),
      });
    
    // Mark invitation as accepted
    await this.client
      .from('org_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);
    
    await this.logActivity({
      orgId: invitation.org_id,
      userId,
      action: 'invitation_accepted',
      details: { invited_by: invitation.invited_by },
    });
  }
  
  private async getEffectivePermissions(
    userId: string,
    orgId: string
  ): Promise<string[]> {
    const { data: member } = await this.client
      .from('organization_members')
      .select('role, permissions')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .single();
    
    if (!member) return [];
    
    // Role-based permissions
    const rolePermissions: Record<string, string[]> = {
      owner: ['*'],
      admin: ['read', 'write', 'invite', 'manage_settings'],
      member: ['read', 'write'],
      viewer: ['read'],
      billing: ['read', 'billing'],
    };
    
    const basePermissions = rolePermissions[member.role] || [];
    const customPermissions = member.permissions || [];
    
    return [...new Set([...basePermissions, ...customPermissions])];
  }
  
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }
  
  private generateToken(): string {
    return crypto.randomUUID().replace(/-/g, '');
  }
  
  private async logActivity(params: any): Promise<void> {
    await this.client
      .from('team_activity')
      .insert(params);
  }
  
  private async sendInvitationEmail(
    email: string,
    token: string,
    orgId: string,
    role: string
  ): Promise<void> {
    // This would integrate with your email service
    const orgName = await this.getOrgName(orgId);
    const inviteUrl = `${process.env.APP_URL}/invite/${token}`;
    
    console.log(`Sending invitation email to ${email} for ${orgName} as ${role}`);
    console.log(`Invite URL: ${inviteUrl}`);
    
    // In production, this would call your email service
    // await sendEmail({
    //   to: email,
    //   subject: `You've been invited to join ${orgName} on XspensesAI`,
    //   template: 'team-invitation',
    //   data: { orgName, role, inviteUrl },
    // });
  }
  
  private async getOrgName(orgId: string): Promise<string> {
    const { data } = await this.client
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single();
    
    return data?.name || 'Unknown Org';
  }
}
