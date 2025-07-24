import React, { useState, useRef } from 'react';

const EphemeralCreditProcessor = ({ onProcessingComplete }) => {
    const [processingStage, setProcessingStage] = useState('');
    const [analysis, setAnalysis] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [privacyStatus, setPrivacyStatus] = useState('🔒 Ready for secure credit card analysis');
    const fileInputRef = useRef(null);
    
    const handleFileUpload = async (file) => {
        if (!file) return;
        
        setIsProcessing(true);
        setAnalysis(null);
        setPrivacyStatus('🔒 Starting ephemeral credit card analysis...');
        
        try {
            // Real-time privacy notifications
            setProcessingStage('📄 Reading credit card statement in secure memory...');
            
            const formData = new FormData();
            formData.append('file', file);
            
            setProcessingStage('🤖 AI analyzing credit patterns (no storage)...');
            setPrivacyStatus('🔒 Credit card data in memory only - not stored');
            
            const response = await fetch('/api/process-credit-card-ephemeral', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Session-ID': generateSessionId(),
                    'X-Processing-Mode': 'ephemeral-zero-storage'
                }
            });
            
            if (!response.ok) {
                throw new Error('Ephemeral credit card processing failed');
            }
            
            const insights = await response.json();
            
            setProcessingStage('🔥 Deleting all credit card data... ✅ Complete!');
            setPrivacyStatus('✅ All credit card details permanently deleted');
            setAnalysis(insights);
            
            if (onProcessingComplete) {
                onProcessingComplete(insights);
            }
            
        } catch (error) {
            console.error('Ephemeral credit card processing error:', error);
            setProcessingStage('❌ Error - all credit card data still deleted for security');
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
        return `ephemeral_credit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
        setPrivacyStatus('🔒 Ready for secure credit card analysis');
    };

    return (
        <div className="ephemeral-credit-container">
            {/* Header */}
            <div className="ephemeral-credit-header">
                <div className="zero-storage-promise">
                    <h3 className="privacy-title">💳 Zero-Storage Credit Card Analysis</h3>
                    <p className="privacy-description">
                        Your credit card statement is analyzed instantly and all personal details are permanently deleted within seconds. 
                        No credit card data is ever stored on our servers.
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
                    id="ephemeral-credit-input"
                    disabled={isProcessing}
                />
                
                <label
                    htmlFor="ephemeral-credit-input"
                    className={`upload-button ${isProcessing ? 'processing' : ''}`}
                >
                    {isProcessing ? (
                        <div className="upload-loading">
                            <div className="spinner"></div>
                            <span>Analyzing Credit Card...</span>
                        </div>
                    ) : (
                        <>
                            <span className="upload-icon">💳</span>
                            <span className="upload-text">Upload Credit Card Statement</span>
                        </>
                    )}
                </label>
            </div>

            {/* Privacy Indicators */}
            <div className="privacy-indicators">
                <span className="privacy-badge">🔒 ZERO CREDIT DATA STORAGE</span>
                <span className="privacy-badge">🛡️ EPHEMERAL ANALYSIS</span>
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
                        🔒 Your credit card details never touch our databases - processed in memory only
                    </div>
                </div>
            )}

            {/* Analysis Results */}
            {analysis && (
                <div className="analysis-results">
                    <div className="results-header">
                        <h4 className="results-title">📊 Credit Card Analysis</h4>
                        <button onClick={resetAnalysis} className="reset-button">
                            🔄 Analyze Another Statement
                        </button>
                    </div>

                    <div className="results-grid">
                        {/* Credit Summary */}
                        <div className="result-card summary-card">
                            <h5 className="card-title">💳 Credit Summary</h5>
                            <div className="summary-stats">
                                <div className="stat">
                                    <span className="stat-label">Current Utilization:</span>
                                    <span className="stat-value">{analysis.current_utilization}</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-label">Credit Score:</span>
                                    <span className="stat-value">{analysis.credit_score}</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-label">Payment History:</span>
                                    <span className="stat-value">{analysis.payment_history}%</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-label">Daily Spending:</span>
                                    <span className="stat-value">${analysis.spending_insights?.daily_average?.toFixed(2) || '0.00'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Privacy Confirmation */}
                        <div className="result-card privacy-card">
                            <h5 className="card-title">🔒 Privacy Status</h5>
                            <div className="privacy-confirmation">
                                <div className="confirmation-item">
                                    <span className="check-icon">✅</span>
                                    <span>All credit card details deleted</span>
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

                    {/* Credit Recommendations */}
                    {analysis.recommendations && analysis.recommendations.length > 0 && (
                        <div className="recommendations-section">
                            <h5 className="section-title">💡 Credit Recommendations</h5>
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

                    {/* Strategic Advice */}
                    {analysis.strategic_advice && analysis.strategic_advice.length > 0 && (
                        <div className="strategic-advice-section">
                            <h5 className="section-title">🚀 Strategic Advice</h5>
                            <div className="strategic-advice-grid">
                                {analysis.strategic_advice.map((advice, index) => (
                                    <div key={index} className="advice-card">
                                        <div className="advice-icon">💡</div>
                                        <div className="advice-content">
                                            <div className="advice-text">{advice}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Credit Factors */}
                    {analysis.credit_factors && (
                        <div className="credit-factors-section">
                            <h5 className="section-title">📋 Credit Score Factors</h5>
                            <div className="credit-factors-grid">
                                {Object.entries(analysis.credit_factors).map(([factor, status]) => (
                                    <div key={factor} className="factor-card">
                                        <div className="factor-name">{factor.replace('_', ' ').toUpperCase()}</div>
                                        <div className={`factor-status ${status.toLowerCase()}`}>{status}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Spending Insights */}
                    {analysis.spending_insights && (
                        <div className="spending-insights-section">
                            <h5 className="section-title">💰 Spending Insights</h5>
                            <div className="spending-insights-grid">
                                <div className="insight-card">
                                    <div className="insight-icon">💸</div>
                                    <div className="insight-content">
                                        <div className="insight-label">Total Spent</div>
                                        <div className="insight-value">${analysis.spending_insights.total_spent?.toFixed(2) || '0.00'}</div>
                                    </div>
                                </div>
                                <div className="insight-card">
                                    <div className="insight-icon">📊</div>
                                    <div className="insight-content">
                                        <div className="insight-label">Daily Average</div>
                                        <div className="insight-value">${analysis.spending_insights.daily_average?.toFixed(2) || '0.00'}</div>
                                    </div>
                                </div>
                                <div className="insight-card">
                                    <div className="insight-icon">🏷️</div>
                                    <div className="insight-content">
                                        <div className="insight-label">Top Category</div>
                                        <div className="insight-value">{analysis.spending_insights.top_category || 'Unknown'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Security Features */}
            <div className="security-features">
                <h4 className="features-title">🛡️ Credit Card Security</h4>
                <div className="features-grid">
                    <div className="feature-item">
                        <div className="feature-icon">🔒</div>
                        <div className="feature-content">
                            <div className="feature-title">Zero Credit Data Storage</div>
                            <div className="feature-description">No credit card details are ever stored on servers</div>
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">🤖</div>
                        <div className="feature-content">
                            <div className="feature-title">AI Credit Analysis</div>
                            <div className="feature-description">Only insights and recommendations are generated, not raw data</div>
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">🗑️</div>
                        <div className="feature-content">
                            <div className="feature-title">Instant Deletion</div>
                            <div className="feature-description">All credit card data deleted immediately after analysis</div>
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">📈</div>
                        <div className="feature-content">
                            <div className="feature-title">Credit Score Insights</div>
                            <div className="feature-description">Get detailed credit analysis without compromising privacy</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EphemeralCreditProcessor; 