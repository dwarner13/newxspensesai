import React, { useState } from 'react';
import ReceiptCamera from './ReceiptCamera';
import TransactionList from './TransactionList';

const ReceiptCameraDemo = () => {
    const [processedReceipt, setProcessedReceipt] = useState(null);
    const [demoUser] = useState({
        id: 1,
        name: 'Demo User',
        tier: 'premium'
    });

    const handleReceiptProcessed = (result) => {
        setProcessedReceipt(result);
    };

    const resetDemo = () => {
        setProcessedReceipt(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        📸 AI Receipt Scanner Demo
                    </h1>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Experience the future of expense tracking! Simply point your camera at any receipt 
                        and watch AI instantly extract and categorize all the transaction details.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Receipt Camera */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            📱 Camera Scanner
                        </h2>
                        <ReceiptCamera 
                            onReceiptProcessed={handleReceiptProcessed}
                            user={demoUser}
                        />
                    </div>

                    {/* Demo Info & Results */}
                    <div className="space-y-6">
                        {/* How It Works */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                🔬 How AI Receipt Scanning Works
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">1</div>
                                    <div>
                                        <div className="font-medium text-gray-900">📸 Capture Receipt</div>
                                        <div className="text-sm text-gray-600">Take a photo with your phone's camera</div>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">2</div>
                                    <div>
                                        <div className="font-medium text-gray-900">🤖 AI Analysis</div>
                                        <div className="text-sm text-gray-600">AI reads and extracts all text from the image</div>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">3</div>
                                    <div>
                                        <div className="font-medium text-gray-900">💰 Transaction Extraction</div>
                                        <div className="text-sm text-gray-600">Identifies merchant, amount, date, and items</div>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm">4</div>
                                    <div>
                                        <div className="font-medium text-gray-900">📊 Smart Categorization</div>
                                        <div className="text-sm text-gray-600">Automatically categorizes the expense</div>
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
                                    <span className="text-green-600">✅</span>
                                    <span>Real-time camera</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-green-600">✅</span>
                                    <span>AI text recognition</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-green-600">✅</span>
                                    <span>Automatic categorization</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-green-600">✅</span>
                                    <span>Receipt storage</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-green-600">✅</span>
                                    <span>Multi-format support</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-green-600">✅</span>
                                    <span>Tax-ready export</span>
                                </div>
                            </div>
                        </div>

                        {/* Supported Receipts */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                🧾 Supported Receipt Types
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <span>🛒 Grocery stores</span>
                                    <span className="text-green-600">✓</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>🍽️ Restaurants</span>
                                    <span className="text-green-600">✓</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>⛽ Gas stations</span>
                                    <span className="text-green-600">✓</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>🛍️ Retail stores</span>
                                    <span className="text-green-600">✓</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>🏥 Medical expenses</span>
                                    <span className="text-green-600">✓</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>🚗 Transportation</span>
                                    <span className="text-green-600">✓</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Processing Results */}
                {processedReceipt && (
                    <div className="mt-8">
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-gray-900">
                                    ✅ Receipt Processed Successfully!
                                </h3>
                                <button 
                                    onClick={resetDemo}
                                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    🔄 Scan Another Receipt
                                </button>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Receipt Image */}
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-3">📸 Scanned Receipt</h4>
                                    <img 
                                        src={processedReceipt.image} 
                                        alt="Processed receipt" 
                                        className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
                                    />
                                </div>

                                {/* Processing Summary */}
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-3">📊 Processing Summary</h4>
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Document ID:</span>
                                            <span className="font-medium">{processedReceipt.document.id}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Processing Time:</span>
                                            <span className="font-medium">{processedReceipt.document.processing_time || '2.3s'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Transactions Found:</span>
                                            <span className="font-medium">{processedReceipt.transactions.length}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">AI Confidence:</span>
                                            <span className="font-medium text-green-600">94%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Extracted Transactions */}
                            <div className="mt-6">
                                <h4 className="font-semibold text-gray-900 mb-3">💰 Extracted Transactions</h4>
                                <TransactionList 
                                    transactions={processedReceipt.transactions}
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
                            <h4 className="font-medium text-gray-900 mb-2">1. Test Camera Access</h4>
                            <p className="text-gray-600">Click "Open Camera" to test camera permissions and functionality</p>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">2. Simulate Receipt Scan</h4>
                            <p className="text-gray-600">Use any receipt or paper with text to simulate the scanning process</p>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">3. Review AI Results</h4>
                            <p className="text-gray-600">See how AI extracts and categorizes transaction details</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceiptCameraDemo; 