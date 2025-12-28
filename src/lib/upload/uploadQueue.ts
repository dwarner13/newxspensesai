/**
 * Upload Queue with Concurrency Control
 * 
 * Manages file uploads with configurable concurrency limits:
 * - Desktop: 2 concurrent uploads
 * - Mobile: 1 concurrent upload
 * 
 * Features:
 * - Per-file progress tracking (percentage, Mbps, ETA)
 * - Cancel/retry support per file
 * - Duplicate prevention (stable upload_id per file selection)
 * - Progress events for UI updates
 */

export interface UploadQueueItem {
  id: string; // Stable upload_id (file name + size + timestamp)
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled';
  progress: number; // 0-100
  speed: number; // Mbps
  eta: number; // seconds remaining
  error?: string;
  result?: any;
  startTime?: number;
  uploadedBytes?: number;
}

export interface UploadQueueProgress {
  total: number;
  completed: number;
  failed: number;
  cancelled: number;
  uploading: number;
  pending: number;
  overallProgress: number; // 0-100
  overallSpeed: number; // Mbps (average)
  overallEta: number; // seconds
}

export type UploadQueueEvent = 
  | { type: 'item-started'; item: UploadQueueItem }
  | { type: 'item-progress'; item: UploadQueueItem }
  | { type: 'item-completed'; item: UploadQueueItem }
  | { type: 'item-error'; item: UploadQueueItem }
  | { type: 'item-cancelled'; item: UploadQueueItem }
  | { type: 'queue-progress'; progress: UploadQueueProgress }
  | { type: 'queue-completed'; items: UploadQueueItem[] }
  | { type: 'queue-error'; error: string };

export type UploadQueueEventHandler = (event: UploadQueueEvent) => void;

/**
 * Detect if device is mobile
 */
function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Generate stable upload ID for a file
 * Format: {filename}-{size}-{timestamp}
 */
export function generateUploadId(file: File, timestamp?: number): string {
  const ts = timestamp || Date.now();
  return `${file.name}-${file.size}-${ts}`;
}

/**
 * Upload Queue Manager
 */
export class UploadQueue {
  private items: Map<string, UploadQueueItem> = new Map();
  private activeUploads: Set<string> = new Set();
  private concurrency: number;
  private eventHandlers: Set<UploadQueueEventHandler> = new Set();
  private uploadFunction: (file: File, onProgress?: (progress: number) => void) => Promise<any>;
  private cancelledIds: Set<string> = new Set();

  constructor(
    uploadFunction: (file: File, onProgress?: (progress: number) => void) => Promise<any>,
    concurrency?: number
  ) {
    this.uploadFunction = uploadFunction;
    this.concurrency = concurrency ?? (isMobile() ? 1 : 2);
  }

  /**
   * Add files to queue
   */
  addFiles(files: File[], uploadIdPrefix?: string): string[] {
    const uploadIds: string[] = [];
    const timestamp = Date.now();

    for (const file of files) {
      // Generate stable upload ID
      const uploadId = uploadIdPrefix 
        ? `${uploadIdPrefix}-${generateUploadId(file, timestamp)}`
        : generateUploadId(file, timestamp);

      // Skip if already in queue (duplicate prevention)
      if (this.items.has(uploadId)) {
        console.warn(`[UploadQueue] Skipping duplicate file: ${file.name} (uploadId: ${uploadId})`);
        continue;
      }

      const item: UploadQueueItem = {
        id: uploadId,
        file,
        status: 'pending',
        progress: 0,
        speed: 0,
        eta: 0,
      };

      this.items.set(uploadId, item);
      uploadIds.push(uploadId);
    }

    // Start processing queue
    this.processQueue();

    return uploadIds;
  }

  /**
   * Cancel an upload
   */
  cancel(uploadId: string): void {
    const item = this.items.get(uploadId);
    if (!item) return;

    if (item.status === 'uploading') {
      this.cancelledIds.add(uploadId);
      this.activeUploads.delete(uploadId);
    }

    item.status = 'cancelled';
    this.items.set(uploadId, item);

    this.emit({
      type: 'item-cancelled',
      item,
    });

    this.processQueue();
  }

  /**
   * Retry a failed upload
   */
  retry(uploadId: string): void {
    const item = this.items.get(uploadId);
    if (!item || item.status !== 'error') return;

    item.status = 'pending';
    item.progress = 0;
    item.speed = 0;
    item.eta = 0;
    item.error = undefined;
    this.items.set(uploadId, item);

    this.processQueue();
  }

  /**
   * Process queue (start uploads up to concurrency limit)
   */
  private async processQueue(): Promise<void> {
    // Start uploads up to concurrency limit
    while (this.activeUploads.size < this.concurrency) {
      const pendingItem = Array.from(this.items.values()).find(
        item => item.status === 'pending'
      );

      if (!pendingItem) break;

      this.startUpload(pendingItem);
    }

    // Emit queue progress
    this.emitQueueProgress();
  }

  /**
   * Start uploading a single file
   */
  private async startUpload(item: UploadQueueItem): Promise<void> {
    if (this.activeUploads.has(item.id)) return;
    if (this.cancelledIds.has(item.id)) return;

    this.activeUploads.add(item.id);
    item.status = 'uploading';
    item.startTime = Date.now();
    item.uploadedBytes = 0;
    this.items.set(item.id, item);

    this.emit({
      type: 'item-started',
      item: { ...item },
    });

    // Track upload progress
    let lastProgressTime = Date.now();
    let lastProgressBytes = 0;

    try {
      const result = await this.uploadFunction(item.file, (progress: number) => {
        // Check if cancelled
        if (this.cancelledIds.has(item.id)) {
          throw new Error('Upload cancelled');
        }

        const now = Date.now();
        const elapsed = (now - lastProgressTime) / 1000; // seconds
        const bytesUploaded = (progress / 100) * item.file.size;
        const bytesDelta = bytesUploaded - lastProgressBytes;

        // Calculate speed (Mbps)
        if (elapsed > 0) {
          const speedBytesPerSecond = bytesDelta / elapsed;
          item.speed = (speedBytesPerSecond * 8) / (1024 * 1024); // Convert to Mbps
        }

        // Calculate ETA
        if (item.speed > 0 && progress < 100) {
          const remainingBytes = item.file.size - bytesUploaded;
          const remainingBits = remainingBytes * 8;
          item.eta = remainingBits / (item.speed * 1024 * 1024); // seconds
        }

        item.progress = progress;
        item.uploadedBytes = bytesUploaded;
        this.items.set(item.id, item);

        lastProgressTime = now;
        lastProgressBytes = bytesUploaded;

        this.emit({
          type: 'item-progress',
          item: { ...item },
        });

        this.emitQueueProgress();
      });

      // Check if cancelled
      if (this.cancelledIds.has(item.id)) {
        item.status = 'cancelled';
        this.items.set(item.id, item);
        this.emit({
          type: 'item-cancelled',
          item: { ...item },
        });
        return;
      }

      item.status = 'completed';
      item.progress = 100;
      item.speed = 0;
      item.eta = 0;
      item.result = result;
      this.items.set(item.id, item);

      this.emit({
        type: 'item-completed',
        item: { ...item },
      });

    } catch (error: any) {
      item.status = 'error';
      item.error = error.message || 'Upload failed';
      this.items.set(item.id, item);

      this.emit({
        type: 'item-error',
        item: { ...item },
      });
    } finally {
      this.activeUploads.delete(item.id);
      this.emitQueueProgress();

      // Process next item in queue
      this.processQueue();
    }
  }

  /**
   * Emit queue progress event
   */
  private emitQueueProgress(): void {
    const items = Array.from(this.items.values());
    const completed = items.filter(i => i.status === 'completed').length;
    const failed = items.filter(i => i.status === 'error').length;
    const cancelled = items.filter(i => i.status === 'cancelled').length;
    const uploading = items.filter(i => i.status === 'uploading').length;
    const pending = items.filter(i => i.status === 'pending').length;
    const total = items.length;

    // Calculate overall progress
    const totalProgress = items.reduce((sum, item) => sum + item.progress, 0);
    const overallProgress = total > 0 ? totalProgress / total : 0;

    // Calculate overall speed (average of active uploads)
    const activeItems = items.filter(i => i.status === 'uploading' && i.speed > 0);
    const overallSpeed = activeItems.length > 0
      ? activeItems.reduce((sum, item) => sum + item.speed, 0) / activeItems.length
      : 0;

    // Calculate overall ETA (max of active uploads)
    const activeEtas = activeItems.map(i => i.eta).filter(eta => eta > 0);
    const overallEta = activeEtas.length > 0 ? Math.max(...activeEtas) : 0;

    const progress: UploadQueueProgress = {
      total,
      completed,
      failed,
      cancelled,
      uploading,
      pending,
      overallProgress,
      overallSpeed,
      overallEta,
    };

    this.emit({
      type: 'queue-progress',
      progress,
    });

    // Emit queue completed if all done
    if (completed + failed + cancelled === total && total > 0) {
      this.emit({
        type: 'queue-completed',
        items: items.filter(i => i.status === 'completed'),
      });
    }
  }

  /**
   * Subscribe to queue events
   */
  on(eventHandler: UploadQueueEventHandler): () => void {
    this.eventHandlers.add(eventHandler);
    return () => {
      this.eventHandlers.delete(eventHandler);
    };
  }

  /**
   * Emit event to all handlers
   */
  private emit(event: UploadQueueEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[UploadQueue] Event handler error:', error);
      }
    }
  }

  /**
   * Get current queue state
   */
  getState(): {
    items: UploadQueueItem[];
    progress: UploadQueueProgress;
  } {
    const items = Array.from(this.items.values());
    const completed = items.filter(i => i.status === 'completed').length;
    const failed = items.filter(i => i.status === 'error').length;
    const cancelled = items.filter(i => i.status === 'cancelled').length;
    const uploading = items.filter(i => i.status === 'uploading').length;
    const pending = items.filter(i => i.status === 'pending').length;
    const total = items.length;

    const totalProgress = items.reduce((sum, item) => sum + item.progress, 0);
    const overallProgress = total > 0 ? totalProgress / total : 0;

    const activeItems = items.filter(i => i.status === 'uploading' && i.speed > 0);
    const overallSpeed = activeItems.length > 0
      ? activeItems.reduce((sum, item) => sum + item.speed, 0) / activeItems.length
      : 0;

    const activeEtas = activeItems.map(i => i.eta).filter(eta => eta > 0);
    const overallEta = activeEtas.length > 0 ? Math.max(...activeEtas) : 0;

    return {
      items,
      progress: {
        total,
        completed,
        failed,
        cancelled,
        uploading,
        pending,
        overallProgress,
        overallSpeed,
        overallEta,
      },
    };
  }

  /**
   * Clear completed items
   */
  clearCompleted(): void {
    for (const [id, item] of this.items.entries()) {
      if (item.status === 'completed' || item.status === 'cancelled') {
        this.items.delete(id);
      }
    }
    this.emitQueueProgress();
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.items.clear();
    this.activeUploads.clear();
    this.cancelledIds.clear();
    this.emitQueueProgress();
  }
}


