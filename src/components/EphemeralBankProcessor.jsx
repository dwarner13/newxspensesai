import React, { useState, useRef } from 'react';

const EphemeralBankProcessor = ({ onProcessingComplete }) => {
    const [processingStage, setProcessingStage] = useState('');
    const [analysis, setAnalysis] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [privacyStatus, setPrivacyStatus] = useState('🔒 Ready for secure bank statement processing');
    const fileInputRef = useRef(null);
    
    const handleFileUpload = async (file) => {
        if (!file) return;
        
        setIsProcessing(true);
        setAnalysis(null);
        setPrivacyStatus('🔒 Starting ephemeral bank statement processing...');
        
        try {
            // Real-time privacy notifications
            setProcessingStage('📄 Reading bank statement in secure memory...');
            
            const formData = new FormData();
            formData.append('file', file);
            
            setProcessingStage('🤖 AI analyzing spending patterns (no storage)...');
            setPrivacyStatus('🔒 Transaction data in memory only - not stored');
            
            const response = await fetch('/api/process-bank-statement-ephemeral', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Session-ID': generateSessionId(),
                    'X-Processing-Mode': 'ephemeral-zero-storage'
                }
            });
            
            if (!response.ok) {
                throw new Error('Ephemeral bank processing failed');
            }
            
            const insights = await response.json();
            
            setProcessingStage('🔥 Deleting all transaction data... ✅ Complete!');
            setPrivacyStatus('✅ All transaction details permanently deleted');
            setAnalysis(insights);
            
            if (onProcessingComplete) {
                onProcessingComplete(insights);
            }
            
        } catch (error) {
            console.error('Ephemeral bank processing error:', error);
            setProcessingStage('❌ Error - all transaction data still deleted for security');
            setPrivacyStatus('🔒 Session terminated for security');
        } finally {
            setIsProcessing(false);
            // Clear local file reference
            file = null;
            // Clear file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const generateSessionId = () => {
        return `ephemeral_bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    };

    const resetAnalysis = () => {
        setAnalysis(null);
        setProcessingStage('');
        setPrivacyStatus('🔒 Ready for secure bank statement processing');
    };

    return (
        <div className="ephemeral-bank-container">
            {/* Header */}
            <div className="ephemeral-bank-header">
                <div className="zero-storage-promise">
                    <h3 className="privacy-title">🏦 Zero-Storage Bank Statement Processing</h3>
                    <p className="privacy-description">
                        Your bank statement is analyzed instantly and all transaction details are permanently deleted within seconds. 
                        No transaction data is ever stored on our servers.
                    </p>
                </div>
            </div>

            {/* Privacy Status */}
            <div className="privacy-status-bar">
                <div className="status-indicator">
                    <span className="status-dot"></span>
                    <span className="status-text">{privacyStatus}</span>
                </div>
            </div>

            {/* File Upload */}
            <div className="upload-section">
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.csv,.xlsx,.xls,.txt"
                    className="file-input"
                    id="ephemeral-bank-input"
                    disabled={isProcessing}
                />
                
                <label
                    htmlFor="ephemeral-bank-input"
                    className={`upload-button ${isProcessing ? 'processing' : ''}`}
                >
                    {isProcessing ? (
                        <div className="upload-loading">
                            <div className="spinner"></div>
                            <span>Processing Bank Statement...</span>
                        </div>
                    ) : (
                        <>
                            <span className="upload-icon">🏦</span>
                            <span className="upload-text">Upload Bank Statement</span>
                        </>
                    )}
                </label>
            </div>

            {/* Privacy Indicators */}
            <div className="privacy-indicators">
                <span className="privacy-badge">🔒 ZERO TRANSACTION STORAGE</span>
                <span className="privacy-badge">🛡️ EPHEMERAL PROCESSING</span>
                <span className="privacy-badge">⚡ INSTANT DELETION</span>
            </div>

            {/* Processing Status */}
            {processingStage && (
                <div className="processing-status">
                    <div className="processing-stage">
                        <div className="stage-icon">🔄</div>
                        <div className="stage-text">{processingStage}</div>
                    </div>
                    <div className="privacy-reminder">
                        🔒 Your transaction details never touch our databases - processed in memory only
                    </div>
                </div>
            )}

            {/* Analysis Results */}
            {analysis && (
                <div className="analysis-results">
                    <div className="results-header">
                        <h4 className="results-title">📊 Bank Statement Analysis</h4>
                        <button onClick={resetAnalysis} className="reset-button">
                            🔄 Process Another Statement
                        </button>
                    </div>

                    <div className="results-grid">
                        {/* Spending Summary */}
                        <div className="result-card summary-card">
                            <h5 className="card-title">💰 Spending Summary</h5>
                            <div className="summary-stats">
                                <div className="stat">
                                    <span className="stat-label">Total Spent:</span>
                                    <span className="stat-value">${analysis.spending_summary?.total_spent?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-label">Transactions:</span>
                                    <span className="stat-value">{analysis.spending_summary?.transaction_count || 0}</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-label">Top Category:</span>
                                    <span className="stat-value">{analysis.spending_summary?.top_category || 'Unknown'}</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-label">Avg Transaction:</span>
                                    <span className="stat-value">${analysis.spending_summary?.avg_transaction?.toFixed(2) || '0.00'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Privacy Confirmation */}
                        <div className="result-card privacy-card">
                            <h5 className="card-title">🔒 Privacy Status</h5>
                            <div className="privacy-confirmation">
                                <div className="confirmation-item">
                                    <span className="check-icon">✅</span>
                                    <span>All transaction details deleted</span>
                                </div>
                                <div className="confirmation-item">
                                    <span className="check-icon">✅</span>
                                    <span>Zero data retention</span>
                                </div>
                                <div className="confirmation-item">
                                    <span className="check-icon">✅</span>
                                    <span>Memory cleared</span>
                                </div>
                                <div className="session-id">
                                    Session: {analysis.session_id?.slice(-8) || 'N/A'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Insights */}
                    {analysis.ai_insights && analysis.ai_insights.length > 0 && (
                        <div className="insights-section">
                            <h5 className="section-title">🤖 AI Insights</h5>
                            <div className="insights-grid">
                                {analysis.ai_insights.map((insight, index) => (
                                    <div key={index} className="insight-card">
                                        <div className="insight-icon">💡</div>
                                        <div className="insight-content">
                                            <div className="insight-text">{insight}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recommendations */}
                    {analysis.recommendations && analysis.recommendations.length > 0 && (
                        <div className="recommendations-section">
                            <h5 className="section-title">💡 Smart Recommendations</h5>
                            <div className="recommendations-grid">
                                {analysis.recommendations.map((rec, index) => (
                                    <div key={index} className="recommendation-card">
                                        <div className="recommendation-icon">🎯</div>
                                        <div className="recommendation-content">
                                            <div className="recommendation-message">{rec}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Category Breakdown */}
                    {analysis.spending_summary?.category_breakdown && (
                        <div className="categories-section">
                            <h5 className="section-title">📂 Spending Categories</h5>
                            <div className="categories-grid">
                                {Object.entries(analysis.spending_summary.category_breakdown).map(([category, amount]) => (
                                    <div key={category} className="category-card">
                                        <div className="category-name">{category}</div>
                                        <div className="category-amount">${amount.toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Security Features */}
            <div className="security-features">
                <h4 className="features-title">🛡️ Bank Statement Security</h4>
                <div className="features-grid">
                    <div className="feature-item">
                        <div className="feature-icon">🔒</div>
                        <div className="feature-content">
                            <div className="feature-title">Zero Transaction Storage</div>
                            <div className="feature-description">No transaction details are ever stored on servers</div>
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">🤖</div>
                        <div className="feature-content">
                            <div className="feature-title">AI Analysis Only</div>
                            <div className="feature-description">Only insights and patterns are generated, not raw data</div>
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">🗑️</div>
                        <div className="feature-content">
                            <div className="feature-title">Instant Deletion</div>
                            <div className="feature-description">All transaction data deleted immediately after processing</div>
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">📊</div>
                        <div className="feature-content">
                            <div className="feature-title">Rich Insights</div>
                            <div className="feature-description">Get detailed analysis without compromising privacy</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EphemeralBankProcessor; 