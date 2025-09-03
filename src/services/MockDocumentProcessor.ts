import { mockTransactions, mockProcessingSteps, MockTransaction } from '../data/mockTransactionData';
import { Transaction } from '../types/database.types';

export interface ProcessingStep {
  step: number;
  title: string;
  description: string;
  icon: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export interface ProcessingResult {
  success: boolean;
  transactions: Transaction[];
  processingSteps: ProcessingStep[];
  byteMessages: string[];
  totalProcessed: number;
  categoriesFound: string[];
  insights: string[];
}

export class MockDocumentProcessor {
  private lastProcessedData: ProcessingResult | null = null;
  
  private bytePersonality = {
    greetings: [
      "Ooh, what document treasure did you bring me today? I'm practically bouncing with excitement to organize this beautiful data!",
      "YES! This is going to be such a beautiful data transformation!",
      "I LOVE organizing chaos! Let me turn this into something spectacular!",
      "Oh my goodness, look at all this data! I'm so excited to make sense of it all!",
      "This is going to be the most satisfying organization project ever!"
    ],
    processing: [
      "I'm finding fascinating patterns in your spending data!",
      "Look at these beautiful transaction patterns emerging!",
      "I'm seeing some really interesting spending rhythms here!",
      "This data is telling such an interesting story!",
      "I'm practically giddy with excitement about these patterns!"
    ],
    insights: [
      "I found 23 uncategorized transactions just begging for perfect homes!",
      "Your spending patterns are telling such an interesting story!",
      "I have some ideas for improving your category system...",
      "The data spirits are speaking... I see fascinating patterns!",
      "This is going to be such a satisfying categorization project!"
    ],
    completion: [
      "All done! Your transactions are beautifully organized and ready to explore!",
      "I've transformed your chaos into beautiful, organized data!",
      "Look at this masterpiece of financial organization!",
      "Your data is now perfectly categorized and ready for analysis!",
      "I'm so proud of this beautiful data transformation!"
    ]
  };

  private convertMockToTransaction(mockTxn: MockTransaction): Transaction {
    return {
      id: mockTxn.id,
      created_at: new Date().toISOString(),
      user_id: 'mock-user-id',
      date: mockTxn.date,
      description: mockTxn.description,
      amount: mockTxn.amount,
      type: mockTxn.type === 'debit' ? 'Debit' : 'Credit',
      category: mockTxn.category,
      subcategory: mockTxn.subcategory || null,
      file_name: 'processed-document.csv',
      hash_id: `mock-hash-${mockTxn.id}`,
      categorization_source: 'ai',
      receipt_url: null
    };
  }

  async processDocument(file: File): Promise<ProcessingResult> {
    // Simulate processing time
    await this.delay(1000);

    const byteMessages: string[] = [];
    const processingSteps: ProcessingStep[] = [...mockProcessingSteps];
    
    // Add Byte's personality messages
    byteMessages.push(this.getRandomMessage(this.bytePersonality.greetings));
    
    // Simulate step-by-step processing (but don't set status here - let the UI handle it)
    for (let i = 0; i < processingSteps.length; i++) {
      processingSteps[i].status = 'pending'; // Start as pending
      
      if (i === 2) { // Transaction parsing step
        byteMessages.push(this.getRandomMessage(this.bytePersonality.processing));
      }
    }

    // Add completion message
    byteMessages.push(this.getRandomMessage(this.bytePersonality.completion));
    byteMessages.push(this.getRandomMessage(this.bytePersonality.insights));

    // Convert mock transactions to proper Transaction format
    const transactions = mockTransactions.map(txn => this.convertMockToTransaction(txn));
    
    // Calculate insights
    const categoriesFound = [...new Set(mockTransactions.map(t => t.category))];
    const totalProcessed = mockTransactions.length;
    
    const insights = [
      `Found ${totalProcessed} transactions across ${categoriesFound.length} categories`,
      `Top spending category: ${this.getTopCategory()}`,
      `Average transaction amount: $${this.getAverageAmount().toFixed(2)}`,
      `Recurring transactions identified: ${this.getRecurringCount()}`,
      `AI categorization confidence: ${this.getAverageConfidence()}%`
    ];

    const result = {
      success: true,
      transactions,
      processingSteps,
      byteMessages,
      totalProcessed,
      categoriesFound,
      insights
    };

    // Store the processed data for later retrieval
    this.lastProcessedData = result;
    
    return result;
  }

  private getRandomMessage(messages: string[]): string {
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private getTopCategory(): string {
    const categoryCounts = mockTransactions.reduce((acc, txn) => {
      acc[txn.category] = (acc[txn.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)[0][0];
  }

  private getAverageAmount(): number {
    const total = mockTransactions.reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
    return total / mockTransactions.length;
  }

  private getRecurringCount(): number {
    return mockTransactions.filter(txn => txn.isRecurring).length;
  }

  private getAverageConfidence(): number {
    const total = mockTransactions.reduce((sum, txn) => sum + txn.aiConfidence, 0);
    return Math.round((total / mockTransactions.length) * 100);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get the last processed data
  getLastProcessedData(): ProcessingResult | null {
    return this.lastProcessedData;
  }

  // Generate sample CSV content for download
  generateSampleCSV(): string {
    const headers = 'Date,Description,Amount,Account\n';
    const rows = mockTransactions.map(txn => 
      `${txn.date},${txn.description},${txn.amount},${txn.account}`
    ).join('\n');
    return headers + rows;
  }

  // Parse uploaded CSV (simplified)
  parseCSV(csvContent: string): MockTransaction[] {
    const lines = csvContent.split('\n');
    const transactions: MockTransaction[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const [date, description, amount, account] = line.split(',');
      if (date && description && amount && account) {
        // Find matching transaction from mock data
        const mockTxn = mockTransactions.find(t => 
          t.date === date && t.description === description
        );
        
        if (mockTxn) {
          transactions.push(mockTxn);
        }
      }
    }
    
    return transactions;
  }
}
