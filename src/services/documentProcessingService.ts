// Document Processing Service
// This service handles real document processing with AI workers

export interface DocumentUploadResult {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'csv';
  url: string;
  size: number;
  uploadTime: string;
}

export interface ProcessingJob {
  id: string;
  documentId: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  progress: number;
  workerUpdates: WorkerUpdate[];
  startTime: string;
  endTime?: string;
}

export interface WorkerUpdate {
  workerId: string;
  workerName: string;
  status: 'idle' | 'working' | 'completed';
  progress: number;
  currentTask: string;
  timestamp: string;
  type: 'status' | 'chat' | 'progress';
  message?: string;
}

export interface ExtractedData {
  transactions: Transaction[];
  categories: Category[];
  totalAmount: number;
  confidence: number;
  processingTime: number;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  confidence: number;
  lineNumber?: number;
}

export interface Category {
  name: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

// Mock data for demonstration - replace with real API calls
class DocumentProcessingService {
  private processingJobs: Map<string, ProcessingJob> = new Map();
  private subscribers: Map<string, ((update: WorkerUpdate) => void)[]> = new Map();

  // Upload document
  async uploadDocument(file: File): Promise<DocumentUploadResult> {
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: documentId,
      name: file.name,
      type: this.getFileType(file.name),
      url: URL.createObjectURL(file), // In real app, this would be a cloud storage URL
      size: file.size,
      uploadTime: new Date().toISOString()
    };
  }

  // Start processing job
  async startProcessing(documentId: string, documentType: string): Promise<ProcessingJob> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: ProcessingJob = {
      id: jobId,
      documentId,
      status: 'queued',
      progress: 0,
      workerUpdates: [],
      startTime: new Date().toISOString()
    };

    this.processingJobs.set(jobId, job);
    
    // Start processing simulation
    this.simulateProcessing(jobId, documentType);
    
    return job;
  }

  // Subscribe to job updates
  subscribeToJob(jobId: string, callback: (update: WorkerUpdate) => void): () => void {
    if (!this.subscribers.has(jobId)) {
      this.subscribers.set(jobId, []);
    }
    
    this.subscribers.get(jobId)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(jobId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // Get extracted data
  async getExtractedData(documentId: string): Promise<ExtractedData> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock extracted data - replace with real AI processing
    return {
      transactions: [
        {
          id: 'txn_1',
          date: '2024-01-15',
          description: 'Starbucks Coffee',
          amount: 4.95,
          category: 'Food & Dining',
          confidence: 95,
          lineNumber: 1
        },
        {
          id: 'txn_2',
          date: '2024-01-15',
          description: 'Shell Gas Station',
          amount: 45.20,
          category: 'Transportation',
          confidence: 98,
          lineNumber: 2
        },
        {
          id: 'txn_3',
          date: '2024-01-14',
          description: 'Amazon Purchase',
          amount: 29.99,
          category: 'Shopping',
          confidence: 92,
          lineNumber: 3
        },
        {
          id: 'txn_4',
          date: '2024-01-14',
          description: 'Netflix Subscription',
          amount: 15.99,
          category: 'Entertainment',
          confidence: 100,
          lineNumber: 4
        },
        {
          id: 'txn_5',
          date: '2024-01-13',
          description: 'Whole Foods Market',
          amount: 87.45,
          category: 'Food & Dining',
          confidence: 96,
          lineNumber: 5
        }
      ],
      categories: [
        { name: 'Food & Dining', amount: 92.40, percentage: 52.1, transactionCount: 2 },
        { name: 'Transportation', amount: 45.20, percentage: 25.5, transactionCount: 1 },
        { name: 'Shopping', amount: 29.99, percentage: 16.9, transactionCount: 1 },
        { name: 'Entertainment', amount: 15.99, percentage: 9.0, transactionCount: 1 }
      ],
      totalAmount: 183.58,
      confidence: 96,
      processingTime: 2.3
    };
  }

  // Get document preview
  async getDocumentPreview(documentId: string): Promise<string> {
    // In real app, this would return a preview URL from cloud storage
    return `https://example.com/preview/${documentId}`;
  }

  // Private methods
  private getFileType(filename: string): 'pdf' | 'image' | 'csv' {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension || '')) {
      return 'image';
    }
    
    if (extension === 'pdf') {
      return 'pdf';
    }
    
    if (['csv', 'xlsx', 'xls'].includes(extension || '')) {
      return 'csv';
    }
    
    return 'pdf'; // default
  }

  private simulateProcessing(jobId: string, documentType: string) {
    const job = this.processingJobs.get(jobId);
    if (!job) return;

    const workers = [
      { id: 'finley', name: 'Finley', color: 'from-blue-500 to-cyan-500' },
      { id: 'crystal', name: 'Crystal', color: 'from-purple-500 to-pink-500' },
      { id: 'tag', name: 'Tag', color: 'from-green-500 to-emerald-500' },
      { id: 'prime', name: 'Prime', color: 'from-orange-500 to-yellow-500' }
    ];

    const tasks = this.getProcessingTasks(documentType);
    let taskIndex = 0;

    const processNextTask = () => {
      if (taskIndex >= tasks.length) {
        job.status = 'completed';
        job.progress = 100;
        job.endTime = new Date().toISOString();
        return;
      }

      const task = tasks[taskIndex];
      const worker = workers.find(w => w.id === task.workerId);
      
      if (worker) {
        const update: WorkerUpdate = {
          workerId: worker.id,
          workerName: worker.name,
          status: task.progress === 100 ? 'completed' : 'working',
          progress: task.progress,
          currentTask: task.task,
          timestamp: new Date().toISOString(),
          type: task.progress === 100 ? 'status' : 'progress',
          message: task.message
        };

        job.workerUpdates.push(update);
        job.progress = Math.round((taskIndex + 1) / tasks.length * 100);

        // Notify subscribers
        const callbacks = this.subscribers.get(jobId);
        if (callbacks) {
          callbacks.forEach(callback => callback(update));
        }

        // Add random chat messages
        if (Math.random() > 0.7) {
          const chatMessages = [
            { worker: 'Finley', message: 'Processing is going smoothly!' },
            { worker: 'Crystal', message: 'I can see clear patterns in this data.' },
            { worker: 'Tag', message: 'Categories are being optimized automatically.' },
            { worker: 'Prime', message: 'Team coordination is excellent today!' }
          ];

          const randomChat = chatMessages[Math.floor(Math.random() * chatMessages.length)];
          const chatUpdate: WorkerUpdate = {
            workerId: randomChat.worker.toLowerCase(),
            workerName: randomChat.worker,
            status: 'working',
            progress: 0,
            currentTask: '',
            timestamp: new Date().toISOString(),
            type: 'chat',
            message: randomChat.message
          };

          job.workerUpdates.push(chatUpdate);
          
          const callbacks = this.subscribers.get(jobId);
          if (callbacks) {
            callbacks.forEach(callback => callback(chatUpdate));
          }
        }
      }

      taskIndex++;
      setTimeout(processNextTask, 2000);
    };

    // Start processing
    setTimeout(processNextTask, 1000);
  }

  private getProcessingTasks(documentType: string) {
    const baseTasks = [
      { workerId: 'finley', task: 'Initializing document processing...', progress: 20, message: 'Starting AI analysis' },
      { workerId: 'finley', task: 'Analyzing document structure...', progress: 40, message: 'Document structure detected' },
      { workerId: 'finley', task: 'Extracting text and data...', progress: 60, message: 'Data extraction in progress' },
      { workerId: 'finley', task: 'Validating extracted data...', progress: 80, message: 'Data validation complete' },
      { workerId: 'finley', task: 'Document processing complete!', progress: 100, message: 'Processing successful' }
    ];

    if (documentType === 'csv') {
      return [
        ...baseTasks.slice(0, 3),
        { workerId: 'tag', task: 'Parsing CSV structure...', progress: 50, message: 'CSV format detected' },
        { workerId: 'tag', task: 'Auto-categorizing transactions...', progress: 80, message: 'Categories applied' },
        { workerId: 'tag', task: 'CSV processing complete!', progress: 100, message: 'All transactions categorized' },
        { workerId: 'crystal', task: 'Analyzing spending patterns...', progress: 70, message: 'Pattern analysis complete' },
        { workerId: 'crystal', task: 'Generating insights...', progress: 100, message: 'Insights ready' }
      ];
    }

    if (documentType === 'image') {
      return [
        ...baseTasks.slice(0, 2),
        { workerId: 'finley', task: 'Running OCR on image...', progress: 50, message: 'Text extraction from image' },
        { workerId: 'finley', task: 'Validating OCR results...', progress: 80, message: 'OCR validation complete' },
        { workerId: 'finley', task: 'Image processing complete!', progress: 100, message: 'Image processed successfully' },
        { workerId: 'tag', task: 'Categorizing extracted data...', progress: 100, message: 'Data categorized' }
      ];
    }

    return baseTasks;
  }
}

// Export singleton instance
export const documentProcessingService = new DocumentProcessingService();
