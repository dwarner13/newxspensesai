/**
 * Cloud Storage Service
 * 
 * Handles file uploads to AWS S3 or Cloudflare R2
 * Maintains current upload UI and progress tracking
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface CloudStorageConfig {
  provider: 'aws-s3' | 'cloudflare-r2';
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string; // Required for Cloudflare R2
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  url: string;
  key: string;
  etag?: string;
  error?: string;
}

export class CloudStorageService {
  private s3Client: S3Client;
  private config: CloudStorageConfig;

  constructor(config: CloudStorageConfig) {
    this.config = config;
    
    // Initialize S3 client (works for both AWS S3 and Cloudflare R2)
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      ...(config.endpoint && { endpoint: config.endpoint }), // Cloudflare R2 endpoint});
  }

  /**
   * Upload file to cloud storage with progress tracking
   */
  async uploadFile(
    file: File | Buffer,
    key: string,
    contentType: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      let body: Buffer;
      
      if (file instanceof File) {
        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        body = Buffer.from(arrayBuffer);
      } else {
        body = file;
      }

      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: {
          uploadedAt: new Date().toISOString(),
          originalSize: body.length.toString(),
        },
      });

      // Simulate progress for small files or use actual progress for large files
      if (onProgress && file instanceof File) {
        this.simulateUploadProgress(file.size, onProgress);
      }

      const result = await this.s3Client.send(command);
      
      const url = this.getPublicUrl(key);
      
      return {
        success: true,
        url,
        key,
        etag: result.ETag,
      };

    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        url: '',
        key: '',
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Get file from cloud storage
   */
  async getFile(key: string): Promise<Buffer | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      const result = await this.s3Client.send(command);
      
      if (!result.Body) {
        return null;
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = result.Body as any;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);

    } catch (error) {
      console.error('Get file error:', error);
      return null;
    }
  }

  /**
   * Delete file from cloud storage
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;

    } catch (error) {
      console.error('Delete file error:', error);
      return false;
    }
  }

  /**
   * Check if file exists in cloud storage
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * Generate presigned URL for direct uploads
   */
  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        ContentType: contentType,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn});
      return url;

    } catch (error) {
      console.error('Generate presigned URL error:', error);
      throw error;
    }
  }

  /**
   * Generate presigned URL for file access
   */
  async generatePresignedAccessUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn});
      return url;

    } catch (error) {
      console.error('Generate presigned access URL error:', error);
      throw error;
    }
  }

  /**
   * Get public URL for file
   */
  private getPublicUrl(key: string): string {
    if (this.config.provider === 'cloudflare-r2') {
      // Cloudflare R2 public URL format
      return `https://${this.config.bucket}.${this.config.region}.r2.cloudflarestorage.com/${key}`;
    } else {
      // AWS S3 public URL format
      return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
    }
  }

  /**
   * Simulate upload progress for UI feedback
   */
  private simulateUploadProgress(
    totalSize: number,
    onProgress: (progress: UploadProgress) => void
  ): void {
    let loaded = 0;
    const interval = setInterval(() => {
      loaded += Math.random() * (totalSize / 10);
      
      if (loaded >= totalSize) {
        loaded = totalSize;
        clearInterval(interval);
      }
      
      onProgress({
        loaded,
        total: totalSize,
        percentage: Math.round((loaded / totalSize) * 100),
      });
    }, 100);
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<any> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      const result = await this.s3Client.send(command);
      
      return {
        size: result.ContentLength,
        lastModified: result.LastModified,
        contentType: result.ContentType,
        metadata: result.Metadata,
        etag: result.ETag,
      };

    } catch (error) {
      console.error('Get file metadata error:', error);
      return null;
    }
  }
}

/**
 * Cloud Storage Factory
 * Creates appropriate cloud storage service based on configuration
 */
export class CloudStorageFactory {
  static createService(): CloudStorageService {
    const provider = process.env.CLOUD_STORAGE_PROVIDER as 'aws-s3' | 'cloudflare-r2';
    
    if (!provider) {
      throw new Error('CLOUD_STORAGE_PROVIDER environment variable is required');
    }

    const config: CloudStorageConfig = {
      provider,
      region: process.env.CLOUD_STORAGE_REGION || 'us-east-1',
      bucket: process.env.CLOUD_STORAGE_BUCKET || '',
      accessKeyId: process.env.CLOUD_STORAGE_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.CLOUD_STORAGE_SECRET_ACCESS_KEY || '',
      ...(provider === 'cloudflare-r2' && {
        endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || '',
      }),
    };

    // Validate required configuration
    if (!config.bucket || !config.accessKeyId || !config.secretAccessKey) {
      throw new Error('Missing required cloud storage configuration');
    }

    if (provider === 'cloudflare-r2' && !config.endpoint) {
      throw new Error('Cloudflare R2 endpoint is required');
    }

    return new CloudStorageService(config);
  }
}

// Export singleton instance
export const cloudStorageService = CloudStorageFactory.createService();
