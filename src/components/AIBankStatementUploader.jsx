import React, { useState, useCallback } from 'react';
import { AIService } from '../services/AIService';
import TransactionList from './TransactionList';

const AIBankStatementUploader = () => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [documentId, setDocumentId] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        setError(null);
        setSuccess(null);
    };

    const handleUpload = useCallback(async () => {
        if (!file) {
            setError('Please select a file first');
            return;
        }

        setUploading(true);
        setError(null);
        setSuccess(null);

        try {
            // Upload document to AI backend
            const uploadResult = await AIService.uploadDocument(file);
            console.log('Upload result:', uploadResult);

            setDocumentId(uploadResult.document_id);
            setSuccess(`✅ Document uploaded successfully! Extracted ${uploadResult.total_transactions} transactions.`);

            // Get categorized transactions
            const transactionsData = await AIService.getTransactions(uploadResult.document_id);
            console.log('Transactions data:', transactionsData);

            // Handle both array and object responses
            const transactionsList = Array.isArray(transactionsData) 
                ? transactionsData 
                : transactionsData.transactions || [];

            setTransactions(transactionsList);

        } catch (err) {
            console.error('Upload failed:', err);
            setError(`Upload failed: ${err.message}`);
        } finally {
            setUploading(false);
        }
    }, [file]);

    const handleCategorizeTransaction = async (transaction) => {
        try {
            const result = await AIService.categorizeTransaction(transaction);
            console.log('Categorization result:', result);
            
            // Update the transaction with AI categorization
            setTransactions(prev => prev.map(t => 
                t.id === transaction.id 
                    ? { ...t, category: result.category, confidence: result.confidence }
                    : t
            ));
            
        } catch (err) {
            console.error('Categorization failed:', err);
            setError(`Categorization failed: ${err.message}`);
        }
    };

    const handleCategoryCorrection = (transactionId, newCategory) => {
        setTransactions(prev => prev.map(t => 
            t.id === transactionId || t.description === transactionId
                ? { ...t, category: newCategory, corrected: true }
                : t
        ));
        setSuccess('✅ Category corrected! AI will learn from this correction.');
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
                🤖 AI Bank Statement Analyzer
            </h2>

            {/* File Upload Section */}
            <div className="mb-8 p-6 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                    <div className="text-4xl mb-4">📄</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Upload Your Bank Statement
                    </h3>
                    <p className="text-gray-600 mb-4">
                        Supports PDF, CSV, Excel, and image files
                    </p>
                    
                    <input
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg"
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    />
                    
                    {file && (
                        <div className="mt-4 p-3 bg-green-50 rounded-lg">
                            <p className="text-green-800">
                                📎 Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                            </p>
                        </div>
                    )}
                    
                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                        {uploading ? '🤖 AI Processing...' : '🚀 Upload & Analyze'}
                    </button>
                </div>
            </div>

            {/* Status Messages */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">❌ {error}</p>
                </div>
            )}
            
            {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800">{success}</p>
                </div>
            )}

            {/* Transactions Display */}
            {transactions.length > 0 && (
                <TransactionList 
                    transactions={transactions}
                    onCategoryCorrection={handleCategoryCorrection}
                />
            )}

            {/* AI Status */}
            {documentId && (
                <div className="mt-8 p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-purple-900 mb-2">🤖 AI Status</h4>
                    <p className="text-purple-700 text-sm">
                        Document ID: {documentId} • Ready for categorization and learning
                    </p>
                </div>
            )}
        </div>
    );
};

export default AIBankStatementUploader; 