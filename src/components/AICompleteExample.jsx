import React, { useState } from 'react';
import DocumentUpload from './DocumentUpload';
import TransactionList from './TransactionList';
import AIIntegrationTest from './AIIntegrationTest';

const AICompleteExample = () => {
    const [uploadedData, setUploadedData] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [activeTab, setActiveTab] = useState('upload');

    const handleUploadComplete = (data) => {
        setUploadedData(data.document);
        setTransactions(data.transactions);
        setActiveTab('results');
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

    const resetUpload = () => {
        setUploadedData(null);
        setTransactions([]);
        setActiveTab('upload');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        🤖 Complete AI Integration Example
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        See how all AI components work together seamlessly
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="mb-8">
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('upload')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                                activeTab === 'upload'
                                    ? 'bg-white text-purple-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            📄 Upload
                        </button>
                        <button
                            onClick={() => setActiveTab('results')}
                            disabled={!uploadedData}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                                activeTab === 'results'
                                    ? 'bg-white text-purple-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            } ${!uploadedData ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            📊 Results
                        </button>
                        <button
                            onClick={() => setActiveTab('test')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                                activeTab === 'test'
                                    ? 'bg-white text-purple-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            🔧 Test
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="space-y-8">
                    {activeTab === 'upload' && (
                        <div>
                            <DocumentUpload onUploadComplete={handleUploadComplete} />
                        </div>
                    )}

                    {activeTab === 'results' && uploadedData && (
                        <div className="space-y-8">
                            {/* Upload Summary */}
                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-2xl font-semibold text-gray-900">
                                        📄 Document Processed Successfully!
                                    </h3>
                                    <button 
                                        onClick={resetUpload}
                                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
                                    >
                                        📄 Upload Another Document
                                    </button>
                                </div>
                                
                                <div className="grid md:grid-cols-4 gap-6">
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
                                        <div className="text-lg font-semibold text-gray-900">{uploadedData.processing_time}</div>
                                    </div>
                                    <div className="bg-orange-50 rounded-lg p-4">
                                        <div className="text-sm text-orange-600 font-medium">Confidence</div>
                                        <div className="text-lg font-semibold text-gray-900">
                                            {Math.round(uploadedData.extraction_confidence * 100)}%
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

                    {activeTab === 'test' && (
                        <div>
                            <AIIntegrationTest />
                        </div>
                    )}
                </div>

                {/* Instructions */}
                <div className="mt-12 bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        🚀 How This Works
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-2">📄 Upload Tab</h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li>• Drag & drop or click to upload files</li>
                                <li>• Supports PDF, CSV, Excel, and images</li>
                                <li>• AI processes and extracts transactions</li>
                                <li>• Automatic categorization with confidence scores</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-2">📊 Results Tab</h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li>• View all extracted transactions</li>
                                <li>• Click categories to edit and teach AI</li>
                                <li>• See processing statistics</li>
                                <li>• Export or save results</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AICompleteExample; 