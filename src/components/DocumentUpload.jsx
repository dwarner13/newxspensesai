import React, { useState, useCallback } from 'react';
import { AIService } from '../services/AIService';
const DocumentUpload = ({ onUploadComplete }) => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        setError(null);
    };

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setError(null);
        }
    }, []);

    const handleUpload = useCallback(async () => {
        if (!file) {
            setError('Please select a file first');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const startTime = Date.now();
            
            // Upload document to AI backend
            const uploadResult = await AIService.uploadDocument(file);
            console.log('Upload result:', uploadResult);

            // Get categorized transactions
            const transactionsData = await AIService.getTransactions(uploadResult.document_id);
            console.log('Transactions data:', transactionsData);

            // Handle both array and object responses
            const transactionsList = Array.isArray(transactionsData) 
                ? transactionsData 
                : transactionsData.transactions || [];

            const processingTime = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;

            // Call the parent callback with processed data
            onUploadComplete({
                document: {
                    id: uploadResult.document_id,
                    filename: file.name,
                    processing_time: processingTime,
                    total_transactions: uploadResult.total_transactions,
                    extraction_confidence: uploadResult.extraction_confidence
                },
                transactions: transactionsList});

        } catch (err) {
            console.error('Upload failed:', err);
            setError(`Upload failed: ${err.message}`);
        } finally {
            setUploading(false);
        }
    }, [file, onUploadComplete]);

    const getFileIcon = (filename) => {
        const ext = filename?.split('.').pop()?.toLowerCase();
        const icons = {
            'pdf': '📄',
            'csv': '📊',
            'xlsx': '📈',
            'xls': '📈',
            'png': '🖼️',
            'jpg': '🖼️',
            'jpeg': '🖼️'
        };
        return icons[ext] || '📄';
    };

    return (
        <div
            className="max-w-4xl mx-auto"
        >
            <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-center mb-8">
                    <div className="text-6xl mb-4">🚀</div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">
                        Upload Your Bank Statement
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Drop any bank statement, receipt, or financial document. 
                        Our AI will extract and categorize all transactions instantly.
                    </p>
                </div>

                {/* File Upload Area */}
                <div
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                        dragActive 
                            ? 'border-purple-400 bg-purple-50' 
                            : 'border-gray-300 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploading}
                    />
                    
                    <div className="space-y-4">
                        <div className="text-4xl">
                            {file ? getFileIcon(file.name) : '📄'}
                        </div>
                        
                        {file ? (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    {file.name}
                                </h3>
                                <p className="text-gray-600">
                                    {(file.size / 1024).toFixed(1)} KB • Ready to process
                                </p>
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Drop your file here
                                </h3>
                                <p className="text-gray-600">
                                    or click to browse
                                </p>
                            </div>
                        )}
                        
                        <div className="text-sm text-gray-500">
                            Supports PDF, CSV, Excel, and image files
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div
                        className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
                    >
                        <p className="text-red-800">❌ {error}</p>
                    </div>
                )}

                {/* Upload Button */}
                {file && (
                    <div
                        className="mt-6 text-center"
                    >
                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                        >
                            {uploading ? (
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    🤖 AI Processing...
                                </div>
                            ) : (
                                '🚀 Upload & Analyze with AI'
                            )}
                        </button>
                    </div>
                )}

                {/* Features */}
                <div className="mt-8 grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                        <div className="text-3xl mb-2">⚡</div>
                        <h4 className="font-semibold text-gray-900 mb-1">Instant Processing</h4>
                        <p className="text-sm text-gray-600">Get results in seconds, not minutes</p>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl mb-2">🎯</div>
                        <h4 className="font-semibold text-gray-900 mb-1">94% Accuracy</h4>
                        <p className="text-sm text-gray-600">AI-powered categorization with high precision</p>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl mb-2">🧠</div>
                        <h4 className="font-semibold text-gray-900 mb-1">Smart Learning</h4>
                        <p className="text-sm text-gray-600">Improves with every correction</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentUpload; 