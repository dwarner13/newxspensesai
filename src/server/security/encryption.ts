import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { getSupabaseServerClient } from '../db';

const scryptAsync = promisify(scrypt);

export interface EncryptedField {
  encrypted: boolean;
  keyId: string;
  fieldName: string;
}

export class FieldEncryption {
  private readonly algorithm = 'aes-256-gcm';
  private keyCache = new Map<string, Buffer>();
  
  async encryptField(
    data: string,
    userId: string,
    fieldName: string
  ): Promise<EncryptedField> {
    // Get or generate encryption key for user
    const key = await this.getUserKey(userId);
    
    // Generate IV
    const iv = randomBytes(16);
    
    // Create cipher
    const cipher = createCipheriv(this.algorithm, key, iv);
    
    // Encrypt
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get auth tag
    const authTag = cipher.getAuthTag();
    
    // Store encrypted data
    const client = getSupabaseServerClient();
    await client
      .from('encrypted_pii')
      .upsert({
        user_id: userId,
        field_name: fieldName,
        encrypted_value: Buffer.concat([iv, authTag, Buffer.from(encrypted, 'hex')]),
        encryption_key_id: `user_${userId}`,
      });
    
    return {
      encrypted: true,
      keyId: `user_${userId}`,
      fieldName,
    };
  }
  
  async decryptField(
    userId: string,
    fieldName: string
  ): Promise<string | null> {
    const client = getSupabaseServerClient();
    
    // Get encrypted data
    const { data } = await client
      .from('encrypted_pii')
      .select('encrypted_value, encryption_key_id')
      .eq('user_id', userId)
      .eq('field_name', fieldName)
      .single();
    
    if (!data) return null;
    
    // Get decryption key
    const key = await this.getUserKey(userId);
    
    // Extract components
    const encryptedBuffer = Buffer.from(data.encrypted_value);
    const iv = encryptedBuffer.slice(0, 16);
    const authTag = encryptedBuffer.slice(16, 32);
    const encrypted = encryptedBuffer.slice(32);
    
    // Create decipher
    const decipher = createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  async getAllUserFields(userId: string): Promise<Record<string, string>> {
    const client = getSupabaseServerClient();
    
    // Get all encrypted fields for user
    const { data } = await client
      .from('encrypted_pii')
      .select('field_name, encrypted_value, encryption_key_id')
      .eq('user_id', userId);
    
    if (!data) return {};
    
    const decryptedFields: Record<string, string> = {};
    
    for (const field of data) {
      const decrypted = await this.decryptField(userId, field.field_name);
      if (decrypted) {
        decryptedFields[field.field_name] = decrypted;
      }
    }
    
    return decryptedFields;
  }
  
  async deleteUserField(userId: string, fieldName: string): Promise<void> {
    const client = getSupabaseServerClient();
    
    await client
      .from('encrypted_pii')
      .delete()
      .eq('user_id', userId)
      .eq('field_name', fieldName);
  }
  
  async deleteAllUserFields(userId: string): Promise<void> {
    const client = getSupabaseServerClient();
    
    await client
      .from('encrypted_pii')
      .delete()
      .eq('user_id', userId);
  }
  
  async rotateUserKeys(userId: string): Promise<void> {
    // Get all encrypted fields
    const client = getSupabaseServerClient();
    const { data: fields } = await client
      .from('encrypted_pii')
      .select('field_name')
      .eq('user_id', userId);
    
    if (!fields) return;
    
    // Decrypt with old key
    const decrypted = new Map<string, string>();
    for (const field of fields) {
      const value = await this.decryptField(userId, field.field_name);
      if (value) {
        decrypted.set(field.field_name, value);
      }
    }
    
    // Clear key cache to force new key generation
    this.keyCache.delete(`user_${userId}`);
    
    // Re-encrypt with new key
    for (const [fieldName, value] of decrypted) {
      await this.encryptField(value, userId, fieldName);
    }
  }
  
  async encryptSensitiveData(data: Record<string, any>, userId: string): Promise<Record<string, any>> {
    const encrypted: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (this.isSensitiveField(key)) {
        await this.encryptField(String(value), userId, key);
        encrypted[key] = '[ENCRYPTED]';
      } else {
        encrypted[key] = value;
      }
    }
    
    return encrypted;
  }
  
  async decryptSensitiveData(data: Record<string, any>, userId: string): Promise<Record<string, any>> {
    const decrypted: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (this.isSensitiveField(key)) {
        const decryptedValue = await this.decryptField(userId, key);
        decrypted[key] = decryptedValue;
      } else {
        decrypted[key] = value;
      }
    }
    
    return decrypted;
  }
  
  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'email',
      'phone',
      'ssn',
      'sin',
      'credit_card',
      'bank_account',
      'address',
      'full_name',
      'date_of_birth',
    ];
    
    return sensitiveFields.some(field => 
      fieldName.toLowerCase().includes(field)
    );
  }
  
  private async getUserKey(userId: string): Promise<Buffer> {
    const cacheKey = `user_${userId}`;
    
    if (this.keyCache.has(cacheKey)) {
      return this.keyCache.get(cacheKey)!;
    }
    
    // Derive key from master key + user ID
    const masterKey = process.env.ENCRYPTION_MASTER_KEY;
    if (!masterKey) {
      throw new Error('ENCRYPTION_MASTER_KEY not configured');
    }
    
    const salt = userId;
    const key = await scryptAsync(masterKey, salt, 32) as Buffer;
    
    this.keyCache.set(cacheKey, key);
    
    return key;
  }
  
  // Clear key cache (useful for key rotation)
  clearKeyCache(): void {
    this.keyCache.clear();
  }
  
  // Clear specific user's key from cache
  clearUserKeyCache(userId: string): void {
    this.keyCache.delete(`user_${userId}`);
  }
  
  // Get cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.keyCache.size,
      keys: Array.from(this.keyCache.keys()),
    };
  }
}
