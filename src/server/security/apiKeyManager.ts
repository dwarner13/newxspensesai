import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { getSupabaseServerClient } from '../db';
import { AppError } from '../errors';

export interface APIKeyConfig {
  prefix?: string;
  permissions?: string[];
  expiresInDays?: number;
  rateLimit?: number;
}

export interface APIKeyValidation {
  keyId: string;
  userId: string;
  orgId?: string;
  permissions: string[];
  rateLimit?: number;
}

export class APIKeyManager {
  private static readonly KEY_LENGTH = 32;
  private static readonly PREFIX_LENGTH = 8;
  
  async generateAPIKey(
    userId: string,
    name: string,
    config: APIKeyConfig = {}
  ): Promise<{ key: string; keyId: string }> {
    // Generate secure random key
    const keyBytes = randomBytes(APIKeyManager.KEY_LENGTH);
    const key = `xpai_${keyBytes.toString('base64url')}`;
    const keyHash = this.hashKey(key);
    const keyPrefix = key.substring(0, APIKeyManager.PREFIX_LENGTH + 5);
    
    const client = getSupabaseServerClient();
    
    // Store hashed key
    const { data, error } = await client
      .from('api_keys')
      .insert({
        user_id: userId,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name,
        permissions: config.permissions || [],
        rate_limit_override: config.rateLimit,
        expires_at: config.expiresInDays
          ? new Date(Date.now() + config.expiresInDays * 86400000).toISOString()
          : null,
      })
      .select('id')
      .single();
    
    if (error) throw error;
    
    // Audit log
    await this.auditLog({
      event_type: 'api_key_created',
      user_id: userId,
      resource_id: data.id,
      action: 'create',
      outcome: 'success',
    });
    
    return { key, keyId: data.id };
  }
  
  async generateOrgAPIKey(
    orgId: string,
    name: string,
    config: APIKeyConfig = {}
  ): Promise<{ key: string; keyId: string }> {
    // Generate secure random key
    const keyBytes = randomBytes(APIKeyManager.KEY_LENGTH);
    const key = `xpai_${keyBytes.toString('base64url')}`;
    const keyHash = this.hashKey(key);
    const keyPrefix = key.substring(0, APIKeyManager.PREFIX_LENGTH + 5);
    
    const client = getSupabaseServerClient();
    
    // Store hashed key
    const { data, error } = await client
      .from('api_keys')
      .insert({
        org_id: orgId,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name,
        permissions: config.permissions || [],
        rate_limit_override: config.rateLimit,
        expires_at: config.expiresInDays
          ? new Date(Date.now() + config.expiresInDays * 86400000).toISOString()
          : null,
      })
      .select('id')
      .single();
    
    if (error) throw error;
    
    // Audit log
    await this.auditLog({
      event_type: 'org_api_key_created',
      org_id: orgId,
      resource_id: data.id,
      action: 'create',
      outcome: 'success',
    });
    
    return { key, keyId: data.id };
  }
  
  async validateAPIKey(key: string): Promise<APIKeyValidation | null> {
    const keyHash = this.hashKey(key);
    const keyPrefix = key.substring(0, APIKeyManager.PREFIX_LENGTH + 5);
    
    const client = getSupabaseServerClient();
    
    // Find key by prefix first (for performance)
    const { data: candidates } = await client
      .from('api_keys')
      .select('*')
      .eq('key_prefix', keyPrefix)
      .is('revoked_at', null)
      .gte('expires_at', new Date().toISOString());
    
    if (!candidates || candidates.length === 0) {
      return null;
    }
    
    // Timing-safe comparison
    for (const candidate of candidates) {
      const candidateHashBuffer = Buffer.from(candidate.key_hash, 'hex');
      const providedHashBuffer = Buffer.from(keyHash, 'hex');
      
      if (timingSafeEqual(candidateHashBuffer, providedHashBuffer)) {
        // Update last used
        await client
          .from('api_keys')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', candidate.id);
        
        return {
          keyId: candidate.id,
          userId: candidate.user_id,
          orgId: candidate.org_id,
          permissions: candidate.permissions,
          rateLimit: candidate.rate_limit_override,
        };
      }
    }
    
    // Log failed attempt
    await this.auditLog({
      event_type: 'api_key_invalid',
      action: 'validate',
      outcome: 'failure',
      details: { key_prefix: keyPrefix },
    });
    
    return null;
  }
  
  async revokeAPIKey(keyId: string, userId: string): Promise<void> {
    const client = getSupabaseServerClient();
    
    const { error } = await client
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', keyId)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    await this.auditLog({
      event_type: 'api_key_revoked',
      user_id: userId,
      resource_id: keyId,
      action: 'revoke',
      outcome: 'success',
    });
  }
  
  async revokeOrgAPIKey(keyId: string, orgId: string): Promise<void> {
    const client = getSupabaseServerClient();
    
    const { error } = await client
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', keyId)
      .eq('org_id', orgId);
    
    if (error) throw error;
    
    await this.auditLog({
      event_type: 'org_api_key_revoked',
      org_id: orgId,
      resource_id: keyId,
      action: 'revoke',
      outcome: 'success',
    });
  }
  
  async rotateAPIKey(
    oldKeyId: string,
    userId: string
  ): Promise<{ key: string; keyId: string }> {
    const client = getSupabaseServerClient();
    
    // Get old key config
    const { data: oldKey } = await client
      .from('api_keys')
      .select('*')
      .eq('id', oldKeyId)
      .eq('user_id', userId)
      .single();
    
    if (!oldKey) {
      throw new AppError('API key not found', 'NOT_FOUND', 404);
    }
    
    // Generate new key with same config
    const newKey = await this.generateAPIKey(userId, oldKey.name + ' (rotated)', {
      permissions: oldKey.permissions,
      rateLimit: oldKey.rate_limit_override,
    });
    
    // Revoke old key
    await this.revokeAPIKey(oldKeyId, userId);
    
    return newKey;
  }
  
  async getUserAPIKeys(userId: string): Promise<any[]> {
    const client = getSupabaseServerClient();
    
    const { data } = await client
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false});
    
    return data || [];
  }
  
  async getOrgAPIKeys(orgId: string): Promise<any[]> {
    const client = getSupabaseServerClient();
    
    const { data } = await client
      .from('api_keys')
      .select('*')
      .eq('org_id', orgId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false});
    
    return data || [];
  }
  
  async checkPermission(
    keyValidation: APIKeyValidation,
    requiredPermission: string
  ): Promise<boolean> {
    // Check if key has required permission
    return keyValidation.permissions.includes(requiredPermission) ||
           keyValidation.permissions.includes('*');
  }
  
  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }
  
  private async auditLog(entry: any): Promise<void> {
    const client = getSupabaseServerClient();
    await client.from('security_audit_trail').insert(entry);
  }
}
