// AI Backend Service - Connect React to your Python AI
const API_BASE_URL = 'http://127.0.0.1:5000/api';

export class AIService {
    
    // Upload bank statement to AI
    static async uploadDocument(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch(`${API_BASE_URL}/documents/upload`, {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) throw new Error('Upload failed');
            return await response.json();
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }
    
    // Get categorized transactions
    static async getTransactions(documentId) {
        try {
            const response = await fetch(`${API_BASE_URL}/documents/${documentId}/transactions`);
            if (!response.ok) throw new Error('Failed to get transactions');
            return await response.json();
        } catch (error) {
            console.error('Get transactions error:', error);
            throw error;
        }
    }
    
    // Categorize single transaction
    static async categorizeTransaction(transaction) {
        try {
            const response = await fetch(`${API_BASE_URL}/categorize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transaction })
            });
            
            if (!response.ok) throw new Error('Categorization failed');
            return await response.json();
        } catch (error) {
            console.error('Categorization error:', error);
            throw error;
        }
    }
    
    // Correct AI categorization (teaches the AI)
    static async correctCategory(transactionId, correction) {
        try {
            const response = await fetch(`${API_BASE_URL}/categorize/correct`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transaction_id: transactionId,
                    correct_category: correction.category,
                    correct_subcategory: correction.subcategory
                })
            });
            
            if (!response.ok) throw new Error('Correction failed');
            return await response.json();
        } catch (error) {
            console.error('Correction error:', error);
            throw error;
        }
    }
    
    // Get user preferences
    static async getPreferences() {
        try {
            const response = await fetch(`${API_BASE_URL}/preferences`);
            if (!response.ok) throw new Error('Failed to get preferences');
            return await response.json();
        } catch (error) {
            console.error('Get preferences error:', error);
            throw error;
        }
    }
    
    // Get analytics
    static async getAnalytics() {
        try {
            const response = await fetch(`${API_BASE_URL}/analytics`);
            if (!response.ok) throw new Error('Failed to get analytics');
            return await response.json();
        } catch (error) {
            console.error('Get analytics error:', error);
            throw error;
        }
    }
    
    // Health check
    static async healthCheck() {
        try {
            const response = await fetch(`${API_BASE_URL}/health`);
            return response.ok;
        } catch (error) {
            console.error('Health check error:', error);
            return false;
        }
    }
    
    // AI Chat
    static async chat(prompt, userContext = {}, personality = 'encouraging') {
        try {
            const response = await fetch(`${API_BASE_URL}/ai-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    user_context: userContext,
                    personality
                })
            });
            
            if (!response.ok) throw new Error('Chat failed');
            return await response.json();
        } catch (error) {
            console.error('Chat error:', error);
            throw error;
        }
    }
    
    // Process Receipt Image
    static async processReceipt(imageFile) {
        try {
            const formData = new FormData();
            formData.append('file', imageFile);
            
            const response = await fetch(`${API_BASE_URL}/receipts/process`, {
                method: 'POST',
                body: formData});
            
            if (!response.ok) throw new Error('Receipt processing failed');
            return await response.json();
        } catch (error) {
            console.error('Receipt processing error:', error);
            throw error;
        }
    }
} 