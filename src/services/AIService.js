// AI Backend Service - Connect React to Worker Backend
import { workerService } from './WorkerService';

// Demo user UUID for consistent use across the application
const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';

export class AIService {
    
    // Upload bank statement to Worker Backend
    static async uploadDocument(file, userId = DEMO_USER_ID, docType = 'bank_statement', redact = true) {
        try {
            console.log('Uploading document to worker backend:', file.name);
            
            // Use the new worker service
            const result = await workerService.uploadDocument(file, userId, docType, redact);
            
            console.log('Upload successful:', result);
            return {
                document_id: result.jobId,
                file_url: result.fileUrl,
                status: 'processing'
            };
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }
    
    // Get categorized transactions from worker result
    static async getTransactions(documentId) {
        try {
            const DEMO_MODE = import.meta.env.VITE_SMART_IMPORT_DEMO === 'true';
            
            console.log('Getting transactions for document:', documentId, 'DEMO_MODE:', DEMO_MODE);
            
            // Mock transaction data - only used in demo mode
            const mockTransactions = [
                {
                    id: '1',
                    date: '2024-01-15',
                    description: 'AMAZON.COM AMZN.COM/BILL WA',
                    amount: 123.45,
                    category: 'Shopping',
                    subcategory: 'Online',
                    direction: 'debit'
                },
                {
                    id: '2', 
                    date: '2024-01-14',
                    description: 'STARBUCKS STORE #12345',
                    amount: 8.50,
                    category: 'Food & Dining',
                    subcategory: 'Coffee',
                    direction: 'debit'
                }
            ];
            
            // In demo mode, return mock transactions if no real data is available
            // In non-demo mode, return empty array (real transactions should come from worker result)
            if (DEMO_MODE) {
                console.log('[AIService] Demo mode enabled, returning mock transactions');
                return mockTransactions;
            }
            
            // Non-demo mode: return empty array (real transactions should be passed from worker result)
            console.log('[AIService] Demo mode disabled, returning empty array. Real transactions should come from worker result.');
            return [];
        } catch (error) {
            console.error('Get transactions error:', error);
            throw error;
        }
    }
    
    // New method to poll job progress
    static async pollJobProgress(jobId, onProgress, onComplete, onError) {
        try {
            await workerService.pollJobProgress(jobId, onProgress, onComplete, onError);
        } catch (error) {
            console.error('Polling error:', error);
            throw error;
        }
    }
    
    // New method to get job status
    static async getJobStatus(jobId) {
        try {
            return await workerService.getJobStatus(jobId);
        } catch (error) {
            console.error('Get job status error:', error);
            throw error;
        }
    }
    
    // New method to check worker health
    static async checkWorkerHealth() {
        try {
            return await workerService.checkHealth();
        } catch (error) {
            console.error('Health check error:', error);
            return false;
        }
    }
    
    // Categorize single transaction (legacy - use worker service instead)
    static async categorizeTransaction(transaction) {
        console.warn('categorizeTransaction is deprecated. Use worker service for document processing.');
        // Return mock data for now
        return {
            category: 'Shopping',
            subcategory: 'Online',
            confidence: 0.85
        };
    }
    
    // Correct AI categorization (legacy)
    static async correctCategory(transactionId, correction) {
        console.warn('correctCategory is deprecated. Use worker service for document processing.');
        return { success: true, message: 'Category corrected' };
    }
    
    // Get user preferences (legacy)
    static async getPreferences() {
        console.warn('getPreferences is deprecated. Use Supabase directly.');
        return {
            categories: ['Food & Dining', 'Shopping', 'Transportation'],
            auto_categorize: true
        };
    }
    
    // Get analytics (legacy)
    static async getAnalytics() {
        console.warn('getAnalytics is deprecated. Use Supabase directly.');
        return {
            total_transactions: 0,
            monthly_spending: 0,
            top_categories: []
        };
    }
    
    // Health check (now uses worker service)
    static async healthCheck() {
        try {
            return await this.checkWorkerHealth();
        } catch (error) {
            console.error('Health check error:', error);
            return false;
        }
    }
    
    // AI Chat (legacy - use your existing AI chat system)
    static async chat(prompt, userContext = {}, personality = 'encouraging') {
        console.warn('AIService.chat is deprecated. Use your existing AI chat system.');
        return {
            response: "This feature has been moved to the main AI chat system.",
            personality: personality
        };
    }
    
    // Process Receipt Image (now uses worker service)
    static async processReceipt(imageFile, userId = DEMO_USER_ID) {
        try {
            console.log('Processing receipt with worker service:', imageFile.name);
            
            // Use the worker service for receipt processing
            const result = await workerService.uploadDocument(imageFile, userId, 'receipt', true);
            
            return {
                document_id: result.jobId,
                file_url: result.fileUrl,
                status: 'processing'
            };
        } catch (error) {
            console.error('Receipt processing error:', error);
            throw error;
        }
    }
} 