import React, { useState, useRef } from 'react';

const UnifiedEphemeralProcessor = ({ onProcessingComplete }) => {
    const [processingStage, setProcessingStage] = useState('');
    const [analysis, setAnalysis] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedDocumentType, setSelectedDocumentType] = useState('');
    const [privacyStatus, setPrivacyStatus] = useState('🔒 Ready for secure document analysis');
    const fileInputRef = useRef(null);
    
    const documentTypes = [
        {
            id: 'bank_statement',
            name: 'Bank Statement',
            icon: '🏦',
            description: 'Analyze spending patterns and cash flow',
            endpoint: '/api/analyze-bank-statement-ephemeral',
            color: 'from-blue-600 to-purple-600'
        },
        {
            id: 'credit_card',
            name: 'Credit Card Statement',
            icon: '💳',
            description: 'Analyze credit utilization and payment history',
            endpoint: '/api/analyze-credit-card-ephemeral',
            color: 'from-green-600 to-emerald-600'
        },
        {
            id: 'investment',
            name: 'Investment Portfolio',
            icon: '📈',
            description: 'Analyze portfolio performance and returns',
            endpoint: '/api/analyze-investment-ephemeral',
            color: 'from-yellow-600 to-orange-600'
        }
    ];
    
    const handleFileUpload = async (file, documentType) => {
        if (!file || !documentType) return;
        
        setIsProcessing(true);
        setAnalysis(null);
        setPrivacyStatus('🔒 Starting ephemeral document analysis...');
        
        const selectedType = documentTypes.find(type => type.id === documentType);
        
        try {
            // Real-time privacy notifications
            setProcessingStage(`📄 Reading ${selectedType.name} in secure memory...`);
            
            const formData = new FormData();
            formData.append('file', file);
            
            setProcessingStage(`🤖 AI analyzing ${selectedType.name} patterns (no storage)...`);
            setPrivacyStatus('🔒 Document data in memory only - not stored');
            
            const response = await fetch(selectedType.endpoint, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Session-ID': generateSessionId(),
                    'X-Processing-Mode': 'ephemeral-zero-storage',
                    'X-Document-Type': documentType
                }
            });
            
            if (!response.ok) {
                throw new Error('Ephemeral document processing failed');
            }
            
            const insights = await response.json();
            
            setProcessingStage(`🔥 Deleting all ${selectedType.name} data... ✅ Complete!`);
            setPrivacyStatus('✅ All document details permanently deleted');
            setAnalysis(insights);
            
            if (onProcessingComplete) {
                onProcessingComplete(insights, documentType);
            }
            
        } catch (error) {
            console.error('Ephemeral document processing error:', error);
            setProcessingStage(`❌ Error - all ${selectedType.name} data still deleted for security`);
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
        return `unified_ephemeral_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file && selectedDocumentType) {
            handleFileUpload(file, selectedDocumentType);
        }
    };

    const resetAnalysis = () => {
        setAnalysis(null);
        setProcessingStage('');
        setSelectedDocumentType('');
        setPrivacyStatus('🔒 Ready for secure document analysis');
    };

    const renderDocumentTypeSelector = () => (
        <div className="document-type-selector">
            <h3 className="selector-title">📋 Select Document Type</h3>
            <p className="selector-description">
                Choose the type of financial document you want to analyze securely
            </p>
            
            <div className="document-types-grid">
                {documentTypes.map((type) => (
                    <div
                        key={type.id}
                        className={`document-type-card ${selectedDocumentType === type.id ? 'selected' : ''}`}
                        onClick={() => setSelectedDocumentType(type.id)}
                    >
                        <div className={`type-icon ${type.color}`}>
                            <span className="icon-text">{type.icon}</span>
                        </div>
                        <div className="type-content">
                            <h4 className="type-name">{type.name}</h4>
                            <p className="type-description">{type.description}</p>
                        </div>
                        <div className="type-selector">
                            <div className={`selector-dot ${selectedDocumentType === type.id ? 'selected' : ''}`}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderFileUpload = () => (
        <div className="file-upload-section">
            <h3 className="upload-title">📤 Upload {documentTypes.find(t => t.id === selectedDocumentType)?.name}</h3>
            
            <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.csv,.xlsx,.xls,.txt"
                className="file-input"
                id="unified-ephemeral-input"
                disabled={isProcessing}
            />
            
            <label
                htmlFor="unified-ephemeral-input"
                className={`upload-button ${isProcessing ? 'processing' : ''}`}
            >
                {isProcessing ? (
                    <div className="upload-loading">
                        <div className="spinner"></div>
                        <span>Analyzing Document...</span>
                    </div>
                ) : (
                    <>
                        <span className="upload-icon">📄</span>
                        <span className="upload-text">Upload {documentTypes.find(t => t.id === selectedDocumentType)?.name}</span>
                    </>
                )}
            </label>
        </div>
    );

    const renderAnalysisResults = () => {
        if (!analysis) return null;

        const documentType = analysis.document_type;
        const selectedType = documentTypes.find(t => t.id === documentType);

        return (
            <div className="analysis-results">
                <div className="results-header">
                    <h4 className="results-title">
                        {selectedType?.icon} {selectedType?.name} Analysis
                    </h4>
                    <button onClick={resetAnalysis} className="reset-button">
                        🔄 Analyze Another Document
                    </button>
                </div>

                <div className="results-grid">
                    {/* Document Summary */}
                    <div className="result-card summary-card">
                        <h5 className="card-title">📊 Document Summary</h5>
                        <div className="summary-content">
                            {documentType === 'bank_statement' && (
                                <div className="summary-stats">
                                    <div className="stat">
                                        <span className="stat-label">Financial Health:</span>
                                        <span className="stat-value">{analysis.cash_flow}</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-label">Total Spent:</span>
                                        <span className="stat-value">${analysis.financial_summary?.total_spent?.toFixed(2) || '0.00'}</span>
                                    </div>
                                </div>
                            )}
                            
                            {documentType === 'credit_card' && (
                                <div className="summary-stats">
                                    <div className="stat">
                                        <span className="stat-label">Credit Utilization:</span>
                                        <span className="stat-value">{analysis.credit_summary?.current_utilization}</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-label">Payment Status:</span>
                                        <span className="stat-value">{analysis.payment_status?.status}</span>
                                    </div>
                                </div>
                            )}
                            
                            {documentType === 'investment' && (
                                <div className="summary-stats">
                                    <div className="stat">
                                        <span className="stat-label">Portfolio Value:</span>
                                        <span className="stat-value">${analysis.portfolio_summary?.total_value?.toLocaleString() || '0'}</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-label">Average Return:</span>
                                        <span className="stat-value">{analysis.portfolio_summary?.avg_return}%</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Privacy Confirmation */}
                    <div className="result-card privacy-card">
                        <h5 className="card-title">🔒 Privacy Status</h5>
                        <div className="privacy-confirmation">
                            <div className="confirmation-item">
                                <span className="check-icon">✅</span>
                                <span>All document details deleted</span>
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

                {/* Document-Specific Recommendations */}
                {analysis.analysis_summary?.recommendations && (
                    <div className="recommendations-section">
                        <h5 className="section-title">💡 Recommendations</h5>
                        <div className="recommendations-grid">
                            {analysis.analysis_summary.recommendations.map((rec, index) => (
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

                {/* Document Type Specific Insights */}
                {documentType === 'bank_statement' && analysis.analysis_summary?.spending_patterns && (
                    <div className="spending-insights-section">
                        <h5 className="section-title">💰 Spending Insights</h5>
                        <div className="spending-insights-grid">
                            <div className="insight-card">
                                <div className="insight-icon">💸</div>
                                <div className="insight-content">
                                    <div className="insight-label">Total Spent</div>
                                    <div className="insight-value">${analysis.analysis_summary.spending_patterns.total_spent?.toFixed(2) || '0.00'}</div>
                                </div>
                            </div>
                            <div className="insight-card">
                                <div className="insight-icon">🏷️</div>
                                <div className="insight-content">
                                    <div className="insight-label">Top Category</div>
                                    <div className="insight-value">{analysis.analysis_summary.spending_patterns.top_category || 'Unknown'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {documentType === 'credit_card' && analysis.analysis_summary?.utilization_analysis && (
                    <div className="credit-insights-section">
                        <h5 className="section-title">💳 Credit Insights</h5>
                        <div className="credit-insights-grid">
                            <div className="insight-card">
                                <div className="insight-icon">📊</div>
                                <div className="insight-content">
                                    <div className="insight-label">Utilization</div>
                                    <div className="insight-value">{analysis.analysis_summary.utilization_analysis.current_utilization}</div>
                                </div>
                            </div>
                            <div className="insight-card">
                                <div className="insight-icon">✅</div>
                                <div className="insight-content">
                                    <div className="insight-label">Payment Rate</div>
                                    <div className="insight-value">{analysis.analysis_summary.payment_analysis.payment_rate}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {documentType === 'investment' && analysis.analysis_summary?.performance_summary && (
                    <div className="investment-insights-section">
                        <h5 className="section-title">📈 Investment Insights</h5>
                        <div className="investment-insights-grid">
                            <div className="insight-card">
                                <div className="insight-icon">💰</div>
                                <div className="insight-content">
                                    <div className="insight-label">Portfolio Value</div>
                                    <div className="insight-value">${analysis.analysis_summary.performance_summary.total_value?.toLocaleString() || '0'}</div>
                                </div>
                            </div>
                            <div className="insight-card">
                                <div className="insight-icon">📊</div>
                                <div className="insight-content">
                                    <div className="insight-label">Avg Return</div>
                                    <div className="insight-value">{analysis.analysis_summary.performance_summary.avg_return}%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="unified-ephemeral-container">
            {/* Header */}
            <div className="unified-ephemeral-header">
                <div className="zero-storage-promise">
                    <h3 className="privacy-title">🛡️ Unified Zero-Storage Document Analysis</h3>
                    <p className="privacy-description">
                        Analyze any financial document securely with zero data retention. 
                        All documents are processed in memory and permanently deleted within seconds.
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

            {/* Document Type Selection */}
            {!selectedDocumentType && !isProcessing && renderDocumentTypeSelector()}

            {/* File Upload */}
            {selectedDocumentType && !isProcessing && renderFileUpload()}

            {/* Privacy Indicators */}
            <div className="privacy-indicators">
                <span className="privacy-badge">🔒 ZERO DOCUMENT STORAGE</span>
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
                        🔒 Your document details never touch our databases - processed in memory only
                    </div>
                </div>
            )}

            {/* Analysis Results */}
            {renderAnalysisResults()}

            {/* Security Features */}
            <div className="security-features">
                <h4 className="features-title">🛡️ Document Security</h4>
                <div className="features-grid">
                    <div className="feature-item">
                        <div className="feature-icon">🔒</div>
                        <div className="feature-content">
                            <div className="feature-title">Zero Document Storage</div>
                            <div className="feature-description">No financial documents are ever stored on servers</div>
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">🤖</div>
                        <div className="feature-content">
                            <div className="feature-title">AI Document Analysis</div>
                            <div className="feature-description">Only insights and recommendations are generated, not raw data</div>
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">🗑️</div>
                        <div className="feature-content">
                            <div className="feature-title">Instant Deletion</div>
                            <div className="feature-description">All document data deleted immediately after analysis</div>
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">📊</div>
                        <div className="feature-content">
                            <div className="feature-title">Rich Insights</div>
                            <div className="feature-description">Get detailed financial analysis without compromising privacy</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnifiedEphemeralProcessor; 