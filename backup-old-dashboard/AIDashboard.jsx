import React, { useState } from 'react';
import DocumentUpload from './DocumentUpload';
import TransactionList from './TransactionList';

const AIDashboard = () => {
    const [uploadedData, setUploadedData] = useState(null);
    const [transactions, setTransactions] = useState([]);

    const handleUploadComplete = (data) => {
        setUploadedData(data.document);
        setTransactions(data.transactions);
    };

    const handleCategoryCorrection = (transactionId, newCategory) => {
        setTransactions(prev => 
            prev.map(t => 
                t.id === transactionId 
                    ? { ...t, category: newCategory, corrected: true }
                    : t
            )
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Dashboard Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        🤖 XspensesAI Smart Import
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Upload any bank statement and watch AI categorize everything instantly!
                    </p>
                </div>

                {!uploadedData ? (
                    <DocumentUpload onUploadComplete={handleUploadComplete} />
                ) : (
                    <div className="space-y-8">
                        {/* Upload Summary */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-2xl font-semibold text-gray-900">
                                    📄 Document Processed Successfully!
                                </h3>
                                <button 
                                    onClick={() => {
                                        setUploadedData(null);
                                        setTransactions([]);
                                    }}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
                                >
                                    📄 Upload Another Document
                                </button>
                            </div>
                            
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="bg-purple-50 rounded-lg p-4">
                                    <div className="text-sm text-purple-600 font-medium">File Name</div>
                                    <div className="text-lg font-semibold text-gray-900">{uploadedData.filename}</div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-4">
                                    <div className="text-sm text-green-600 font-medium">Transactions</div>
                                    <div className="text-lg font-semibold text-gray-900">{transactions.length}</div>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <div className="text-sm text-blue-600 font-medium">Processing Time</div>
                                    <div className="text-lg font-semibold text-gray-900">
                                        {uploadedData.processing_time || 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Transactions List */}
                        <TransactionList 
                            transactions={transactions}
                            onCategoryCorrection={handleCategoryCorrection}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIDashboard; 