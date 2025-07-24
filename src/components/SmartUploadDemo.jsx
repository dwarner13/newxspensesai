import React, { useState } from 'react';
import SmartDocumentUpload from './SmartDocumentUpload';
import TransactionList from './TransactionList';

const SmartUploadDemo = () => {
    const [uploadedData, setUploadedData] = useState(null);
    const [uploadHistory, setUploadHistory] = useState([]);
    const [demoUser] = useState({
        id: 1,
        name: 'Demo User',
        tier: 'premium'
    });

    const handleUploadComplete = (data) => {
        setUploadedData(data);
        
        // Add to upload history
        const historyItem = {
            id: Date.now(),
            type: data.type || 'unknown',
            timestamp: new Date(),
            data: data
        };
        
        setUploadHistory(prev => [historyItem, ...prev.slice(0, 4)]); // Keep last 5
    };

    const resetDemo = () => {
        setUploadedData(null);
        setUploadHistory([]);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        📊 Smart Document Upload Demo
                    </h1>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Experience the future of financial data entry! Choose from multiple upload methods 
                        including bank statements, receipt scanning, and manual entry - all powered by AI.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Smart Upload Component */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            🚀 Upload Methods
                        </h2>
                        <SmartDocumentUpload 
                            onUploadComplete={handleUploadComplete}
                            user={demoUser}
                        />
                    </div>

                    {/* Demo Info & Results */}
                    <div className="space-y-6">
                        {/* Upload Methods Overview */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                📋 Available Upload Methods
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">1</div>
                                    <div>
                                        <div className="font-medium text-gray-900">📄 Bank Statement Upload</div>
                                        <div className="text-sm text-gray-600">Upload PDF, CSV, or Excel files for bulk transaction processing</div>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">2</div>
                                    <div>
                                        <div className="font-medium text-gray-900">📸 Receipt Camera (Mobile)</div>
                                        <div className="text-sm text-gray-600">Scan individual receipts with your phone's camera</div>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">3</div>
                                    <div>
                                        <div className="font-medium text-gray-900">✏️ Manual Entry</div>
                                        <div className="text-sm text-gray-600">Type transaction details manually for complete control</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Features */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                ✨ Key Features
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center space-x-2">
                                    <span className="text-blue-600">✅</span>
                                    <span>Multiple file formats</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-green-600">✅</span>
                                    <span>Mobile camera support</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-purple-600">✅</span>
                                    <span>AI categorization</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-orange-600">✅</span>
                                    <span>Real-time processing</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-red-600">✅</span>
                                    <span>Error handling</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-indigo-600">✅</span>
                                    <span>Progress tracking</span>
                                </div>
                            </div>
                        </div>

                        {/* Supported Formats */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                📁 Supported Formats
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <span>📄 PDF files</span>
                                    <span className="text-green-600">✓</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>📊 CSV files</span>
                                    <span className="text-green-600">✓</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>📈 Excel files (.xlsx, .xls)</span>
                                    <span className="text-green-600">✓</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>📸 Image files (JPG, PNG)</span>
                                    <span className="text-green-600">✓</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>📱 Camera capture</span>
                                    <span className="text-green-600">✓</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>✏️ Manual entry</span>
                                    <span className="text-green-600">✓</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Upload Results */}
                {uploadedData && (
                    <div className="mt-8">
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-gray-900">
                                    ✅ Upload Completed Successfully!
                                </h3>
                                <button 
                                    onClick={resetDemo}
                                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    🔄 Start New Upload
                                </button>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Upload Summary */}
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-3">📊 Upload Summary</h4>
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Upload Type:</span>
                                            <span className="font-medium capitalize">{uploadedData.type || 'unknown'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Processing Time:</span>
                                            <span className="font-medium">{uploadedData.document?.processing_time || '2.3s'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Transactions Found:</span>
                                            <span className="font-medium">{uploadedData.transactions?.length || 1}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">AI Confidence:</span>
                                            <span className="font-medium text-green-600">94%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Upload History */}
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-3">📋 Recent Uploads</h4>
                                    <div className="space-y-2">
                                        {uploadHistory.map((item) => (
                                            <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium text-gray-900 capitalize">
                                                            {item.type} Upload
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            {item.timestamp.toLocaleTimeString()}
                                                        </div>
                                                    </div>
                                                    <div className="text-green-600">✓</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Extracted Transactions */}
                            <div className="mt-6">
                                <h4 className="font-semibold text-gray-900 mb-3">💰 Extracted Transactions</h4>
                                <TransactionList 
                                    transactions={uploadedData.transactions || [uploadedData.transaction]}
                                    onCategoryCorrection={(id, category) => {
                                        console.log('Category corrected:', id, category);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Demo Instructions */}
                <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        🎯 Demo Instructions
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6 text-sm">
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">1. Test File Upload</h4>
                            <p className="text-gray-600">Click "Choose Files" to test document upload functionality</p>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">2. Test Camera (Mobile)</h4>
                            <p className="text-gray-600">On mobile devices, test the receipt camera scanning feature</p>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">3. Review Results</h4>
                            <p className="text-gray-600">See how AI processes and categorizes the uploaded data</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmartUploadDemo; 