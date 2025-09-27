// Duplicate Detection System to prevent re-uploads of the same receipt
export interface ReceiptHash {
  id: string;
  userId: string;
  imageHash: string;
  contentHash: string;
  merchant: string;
  amount: number;
  date: string;
  confidence: number;
  timestamp: number;
  metadata: {
    fileSize: number;
    fileName: string;
    lastModified: number;
  };
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingId?: string;
  confidence: number;
  similarity: number;
  reason: string;
  existingReceipt?: ReceiptHash;
  suggestions?: string[];
}

export interface SimilarityMetrics {
  imageSimilarity: number;
  contentSimilarity: number;
  merchantSimilarity: number;
  amountSimilarity: number;
  dateSimilarity: number;
  overallSimilarity: number;
}

export interface DetectionConfig {
  imageSimilarityThreshold: number;
  contentSimilarityThreshold: number;
  merchantSimilarityThreshold: number;
  amountSimilarityThreshold: number;
  dateSimilarityThreshold: number;
  overallSimilarityThreshold: number;
  timeWindowDays: number;
  enableFuzzyMatching: boolean;
  enableImageHashing: boolean;
  enableContentHashing: boolean;
}

export class DuplicateDetectionSystem {
  private receiptHashes: Map<string, ReceiptHash[]>;
  private detectionConfig: DetectionConfig;
  private processingStats = {
    totalChecks: 0,
    duplicatesFound: 0,
    falsePositives: 0,
    averageCheckTime: 0,
    cacheHitRate: 0
  };

  constructor() {
    this.receiptHashes = new Map();
    this.detectionConfig = {
      imageSimilarityThreshold: 0.95,
      contentSimilarityThreshold: 0.85,
      merchantSimilarityThreshold: 0.8,
      amountSimilarityThreshold: 0.9,
      dateSimilarityThreshold: 0.8,
      overallSimilarityThreshold: 0.8,
      timeWindowDays: 7,
      enableFuzzyMatching: true,
      enableImageHashing: true,
      enableContentHashing: true
    };
  }

  // Main duplicate detection method
  async checkDuplicate(
    file: File,
    extractedData: {
      merchant: string;
      amount: number;
      date: string;
      description: string;
    },
    userId: string
  ): Promise<DuplicateCheckResult> {
    const startTime = Date.now();
    console.log(`🔍 Duplicate Detection: Checking for duplicates for user ${userId}`);
    
    try {
      // Generate hashes
      const imageHash = await this.generateImageHash(file);
      const contentHash = await this.generateContentHash(extractedData);
      
      // Get user's receipt history
      const userReceipts = this.getUserReceipts(userId);
      
      if (userReceipts.length === 0) {
        console.log(`🔍 Duplicate Detection: No previous receipts for user ${userId}`);
        return {
          isDuplicate: false,
          confidence: 0,
          similarity: 0,
          reason: 'No previous receipts to compare against'
        };
      }
      
      // Check for exact matches first
      const exactMatch = this.checkExactMatch(imageHash, contentHash, userReceipts);
      if (exactMatch) {
        console.log(`🔍 Duplicate Detection: Found exact match`);
        this.updateStats(Date.now() - startTime, true, false);
        return exactMatch;
      }
      
      // Check for similar receipts
      const similarMatch = await this.checkSimilarReceipts(
        file,
        extractedData,
        imageHash,
        contentHash,
        userReceipts
      );
      
      if (similarMatch.isDuplicate) {
        console.log(`🔍 Duplicate Detection: Found similar receipt with ${similarMatch.similarity} similarity`);
        this.updateStats(Date.now() - startTime, true, false);
        return similarMatch;
      }
      
      // No duplicate found
      console.log(`🔍 Duplicate Detection: No duplicates found`);
      this.updateStats(Date.now() - startTime, false, false);
      
      return {
        isDuplicate: false,
        confidence: 0,
        similarity: 0,
        reason: 'No similar receipts found'
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateStats(processingTime, false, false);
      
      console.error(`🔍 Duplicate Detection: Error checking duplicates:`, error);
      
      return {
        isDuplicate: false,
        confidence: 0,
        similarity: 0,
        reason: `Error during duplicate check: ${error}`
      };
    }
  }

  // Generate image hash
  private async generateImageHash(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Generate content hash
  private async generateContentHash(data: {
    merchant: string;
    amount: number;
    date: string;
    description: string;
  }): Promise<string> {
    const content = `${data.merchant}|${data.amount}|${data.date}|${data.description}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Get user's receipt history
  private getUserReceipts(userId: string): ReceiptHash[] {
    return this.receiptHashes.get(userId) || [];
  }

  // Check for exact matches
  private checkExactMatch(
    imageHash: string,
    contentHash: string,
    userReceipts: ReceiptHash[]
  ): DuplicateCheckResult | null {
    for (const receipt of userReceipts) {
      // Check image hash
      if (this.detectionConfig.enableImageHashing && receipt.imageHash === imageHash) {
        return {
          isDuplicate: true,
          existingId: receipt.id,
          confidence: 1.0,
          similarity: 1.0,
          reason: 'Exact image match found',
          existingReceipt: receipt,
          suggestions: [
            'This appears to be the same image as a previously uploaded receipt',
            'Consider checking if you meant to upload a different receipt',
            'The previous upload was processed successfully'
          ]
        };
      }
      
      // Check content hash
      if (this.detectionConfig.enableContentHashing && receipt.contentHash === contentHash) {
        return {
          isDuplicate: true,
          existingId: receipt.id,
          confidence: 0.95,
          similarity: 0.95,
          reason: 'Exact content match found',
          existingReceipt: receipt,
          suggestions: [
            'This receipt has the same content as a previously uploaded one',
            'The merchant, amount, and date match exactly',
            'Consider if this is a different receipt or a duplicate'
          ]
        };
      }
    }
    
    return null;
  }

  // Check for similar receipts
  private async checkSimilarReceipts(
    file: File,
    extractedData: {
      merchant: string;
      amount: number;
      date: string;
      description: string;
    },
    imageHash: string,
    contentHash: string,
    userReceipts: ReceiptHash[]
  ): Promise<DuplicateCheckResult> {
    const timeWindow = this.detectionConfig.timeWindowDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - timeWindow;
    
    // Filter receipts within time window
    const recentReceipts = userReceipts.filter(receipt => receipt.timestamp > cutoffTime);
    
    if (recentReceipts.length === 0) {
      return {
        isDuplicate: false,
        confidence: 0,
        similarity: 0,
        reason: 'No recent receipts to compare against'
      };
    }
    
    let bestMatch: ReceiptHash | null = null;
    let bestSimilarity = 0;
    let bestMetrics: SimilarityMetrics | null = null;
    
    // Check each recent receipt
    for (const receipt of recentReceipts) {
      const metrics = await this.calculateSimilarityMetrics(
        file,
        extractedData,
        imageHash,
        contentHash,
        receipt
      );
      
      if (metrics.overallSimilarity > bestSimilarity) {
        bestSimilarity = metrics.overallSimilarity;
        bestMatch = receipt;
        bestMetrics = metrics;
      }
    }
    
    // Check if best match exceeds threshold
    if (bestMatch && bestSimilarity >= this.detectionConfig.overallSimilarityThreshold) {
      return {
        isDuplicate: true,
        existingId: bestMatch.id,
        confidence: bestSimilarity,
        similarity: bestSimilarity,
        reason: this.generateDuplicateReason(bestMetrics!),
        existingReceipt: bestMatch,
        suggestions: this.generateDuplicateSuggestions(bestMetrics!, bestMatch)
      };
    }
    
    return {
      isDuplicate: false,
      confidence: bestSimilarity,
      similarity: bestSimilarity,
      reason: `Best match similarity: ${(bestSimilarity * 100).toFixed(1)}% (below threshold)`
    };
  }

  // Calculate similarity metrics
  private async calculateSimilarityMetrics(
    file: File,
    extractedData: {
      merchant: string;
      amount: number;
      date: string;
      description: string;
    },
    imageHash: string,
    contentHash: string,
    existingReceipt: ReceiptHash
  ): Promise<SimilarityMetrics> {
    // Image similarity (if enabled)
    const imageSimilarity = this.detectionConfig.enableImageHashing ? 
      this.calculateImageSimilarity(imageHash, existingReceipt.imageHash) : 0;
    
    // Content similarity (if enabled)
    const contentSimilarity = this.detectionConfig.enableContentHashing ? 
      this.calculateContentSimilarity(contentHash, existingReceipt.contentHash) : 0;
    
    // Merchant similarity
    const merchantSimilarity = this.calculateMerchantSimilarity(
      extractedData.merchant,
      existingReceipt.merchant
    );
    
    // Amount similarity
    const amountSimilarity = this.calculateAmountSimilarity(
      extractedData.amount,
      existingReceipt.amount
    );
    
    // Date similarity
    const dateSimilarity = this.calculateDateSimilarity(
      extractedData.date,
      existingReceipt.date
    );
    
    // Calculate overall similarity
    const overallSimilarity = this.calculateOverallSimilarity({
      imageSimilarity,
      contentSimilarity,
      merchantSimilarity,
      amountSimilarity,
      dateSimilarity
    });
    
    return {
      imageSimilarity,
      contentSimilarity,
      merchantSimilarity,
      amountSimilarity,
      dateSimilarity,
      overallSimilarity
    };
  }

  // Calculate image similarity
  private calculateImageSimilarity(hash1: string, hash2: string): number {
    if (hash1 === hash2) return 1.0;
    
    // Calculate Hamming distance
    let distance = 0;
    const minLength = Math.min(hash1.length, hash2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (hash1[i] !== hash2[i]) {
        distance++;
      }
    }
    
    // Add difference for length mismatch
    distance += Math.abs(hash1.length - hash2.length);
    
    // Convert to similarity (0-1)
    const maxDistance = Math.max(hash1.length, hash2.length);
    return 1 - (distance / maxDistance);
  }

  // Calculate content similarity
  private calculateContentSimilarity(hash1: string, hash2: string): number {
    if (hash1 === hash2) return 1.0;
    
    // For content hashes, exact match is required for high similarity
    // Small differences in content should result in very different hashes
    return this.calculateImageSimilarity(hash1, hash2);
  }

  // Calculate merchant similarity
  private calculateMerchantSimilarity(merchant1: string, merchant2: string): number {
    if (merchant1.toLowerCase() === merchant2.toLowerCase()) return 1.0;
    
    // Use Levenshtein distance for fuzzy matching
    const distance = this.levenshteinDistance(
      merchant1.toLowerCase(),
      merchant2.toLowerCase()
    );
    
    const maxLength = Math.max(merchant1.length, merchant2.length);
    return 1 - (distance / maxLength);
  }

  // Calculate amount similarity
  private calculateAmountSimilarity(amount1: number, amount2: number): number {
    if (amount1 === amount2) return 1.0;
    
    // Calculate percentage difference
    const difference = Math.abs(amount1 - amount2);
    const average = (amount1 + amount2) / 2;
    
    if (average === 0) return 0;
    
    const percentageDifference = difference / average;
    
    // Convert to similarity (0-1)
    return Math.max(0, 1 - percentageDifference);
  }

  // Calculate date similarity
  private calculateDateSimilarity(date1: string, date2: string): number {
    if (date1 === date2) return 1.0;
    
    try {
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      
      // Check if dates are the same day
      if (d1.toDateString() === d2.toDateString()) return 1.0;
      
      // Check if dates are within 1 day
      const timeDiff = Math.abs(d1.getTime() - d2.getTime());
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
      
      if (daysDiff <= 1) return 0.8;
      if (daysDiff <= 7) return 0.5;
      if (daysDiff <= 30) return 0.2;
      
      return 0;
    } catch (error) {
      return 0;
    }
  }

  // Calculate overall similarity
  private calculateOverallSimilarity(metrics: {
    imageSimilarity: number;
    contentSimilarity: number;
    merchantSimilarity: number;
    amountSimilarity: number;
    dateSimilarity: number;
  }): number {
    // Weighted average of all similarity metrics
    const weights = {
      imageSimilarity: 0.3,
      contentSimilarity: 0.2,
      merchantSimilarity: 0.2,
      amountSimilarity: 0.2,
      dateSimilarity: 0.1
    };
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    Object.entries(weights).forEach(([key, weight]) => {
      const value = metrics[key as keyof typeof metrics];
      if (value > 0) {
        weightedSum += value * weight;
        totalWeight += weight;
      }
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  // Generate duplicate reason
  private generateDuplicateReason(metrics: SimilarityMetrics): string {
    const reasons: string[] = [];
    
    if (metrics.imageSimilarity > 0.9) {
      reasons.push('Very similar image');
    }
    
    if (metrics.contentSimilarity > 0.9) {
      reasons.push('Identical content');
    }
    
    if (metrics.merchantSimilarity > 0.8) {
      reasons.push('Same merchant');
    }
    
    if (metrics.amountSimilarity > 0.9) {
      reasons.push('Same amount');
    }
    
    if (metrics.dateSimilarity > 0.8) {
      reasons.push('Same date');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'Similar receipt found';
  }

  // Generate duplicate suggestions
  private generateDuplicateSuggestions(
    metrics: SimilarityMetrics,
    existingReceipt: ReceiptHash
  ): string[] {
    const suggestions: string[] = [];
    
    if (metrics.imageSimilarity > 0.9) {
      suggestions.push('This appears to be the same image as a previously uploaded receipt');
    }
    
    if (metrics.contentSimilarity > 0.9) {
      suggestions.push('The content matches exactly with a previous upload');
    }
    
    if (metrics.merchantSimilarity > 0.8 && metrics.amountSimilarity > 0.9) {
      suggestions.push('Same merchant and amount suggest this might be a duplicate');
    }
    
    if (metrics.dateSimilarity > 0.8) {
      suggestions.push('Same date increases the likelihood of duplication');
    }
    
    suggestions.push(`Previous upload: ${existingReceipt.merchant} - $${existingReceipt.amount} on ${new Date(existingReceipt.date).toLocaleDateString()}`);
    suggestions.push('If this is a different receipt, please verify and try again');
    
    return suggestions;
  }

  // Levenshtein distance calculation
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Store receipt hash
  async storeReceiptHash(
    file: File,
    extractedData: {
      merchant: string;
      amount: number;
      date: string;
      description: string;
    },
    userId: string,
    confidence: number
  ): Promise<void> {
    console.log(`🔍 Duplicate Detection: Storing receipt hash for user ${userId}`);
    
    const imageHash = await this.generateImageHash(file);
    const contentHash = await this.generateContentHash(extractedData);
    
    const receiptHash: ReceiptHash = {
      id: `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      imageHash,
      contentHash,
      merchant: extractedData.merchant,
      amount: extractedData.amount,
      date: extractedData.date,
      confidence,
      timestamp: Date.now(),
      metadata: {
        fileSize: file.size,
        fileName: file.name,
        lastModified: file.lastModified
      }
    };
    
    // Store in memory
    const userReceipts = this.getUserReceipts(userId);
    userReceipts.push(receiptHash);
    this.receiptHashes.set(userId, userReceipts);
    
    // Store in localStorage
    await this.saveReceiptHash(userId, receiptHash);
    
    console.log(`🔍 Duplicate Detection: Receipt hash stored with ID ${receiptHash.id}`);
  }

  // Save receipt hash to localStorage
  private async saveReceiptHash(userId: string, receiptHash: ReceiptHash): Promise<void> {
    try {
      const existing = JSON.parse(localStorage.getItem(`receipt_hashes_${userId}`) || '[]');
      existing.push(receiptHash);
      localStorage.setItem(`receipt_hashes_${userId}`, JSON.stringify(existing));
    } catch (error) {
      console.error('🔍 Duplicate Detection: Error saving receipt hash:', error);
    }
  }

  // Load receipt hashes from localStorage
  loadUserReceiptHashes(userId: string): void {
    try {
      const hashes = JSON.parse(localStorage.getItem(`receipt_hashes_${userId}`) || '[]');
      this.receiptHashes.set(userId, hashes);
      console.log(`🔍 Duplicate Detection: Loaded ${hashes.length} receipt hashes for user ${userId}`);
    } catch (error) {
      console.error('🔍 Duplicate Detection: Error loading receipt hashes:', error);
    }
  }

  // Update processing statistics
  private updateStats(processingTime: number, duplicateFound: boolean, cacheHit: boolean): void {
    this.processingStats.totalChecks++;
    
    if (duplicateFound) {
      this.processingStats.duplicatesFound++;
    }
    
    this.processingStats.averageCheckTime = 
      (this.processingStats.averageCheckTime * (this.processingStats.totalChecks - 1) + processingTime) / 
      this.processingStats.totalChecks;
    
    this.processingStats.cacheHitRate = 
      (this.processingStats.cacheHitRate * (this.processingStats.totalChecks - 1) + (cacheHit ? 1 : 0)) / 
      this.processingStats.totalChecks;
  }

  // Get processing statistics
  getProcessingStats() {
    return { ...this.processingStats };
  }

  // Update detection configuration
  updateConfig(newConfig: Partial<DetectionConfig>): void {
    this.detectionConfig = { ...this.detectionConfig, ...newConfig };
    console.log('🔍 Duplicate Detection: Configuration updated');
  }

  // Get detection configuration
  getConfig(): DetectionConfig {
    return { ...this.detectionConfig };
  }

  // Clear user's receipt hashes
  clearUserReceipts(userId: string): void {
    this.receiptHashes.delete(userId);
    localStorage.removeItem(`receipt_hashes_${userId}`);
    console.log(`🔍 Duplicate Detection: Cleared receipt hashes for user ${userId}`);
  }

  // Get user's receipt count
  getUserReceiptCount(userId: string): number {
    return this.getUserReceipts(userId).length;
  }

  // Get duplicate statistics for user
  getUserDuplicateStats(userId: string): {
    totalReceipts: number;
    duplicatesFound: number;
    duplicateRate: number;
    averageSimilarity: number;
  } {
    const receipts = this.getUserReceipts(userId);
    const totalReceipts = receipts.length;
    
    // This would require more complex tracking in a real implementation
    const duplicatesFound = 0; // Placeholder
    const duplicateRate = totalReceipts > 0 ? duplicatesFound / totalReceipts : 0;
    const averageSimilarity = 0; // Placeholder
    
    return {
      totalReceipts,
      duplicatesFound,
      duplicateRate,
      averageSimilarity
    };
  }
}

// Export singleton instance
export const duplicateDetectionSystem = new DuplicateDetectionSystem();
