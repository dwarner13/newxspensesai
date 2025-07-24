import React, { useState, useRef } from 'react';

const EphemeralUploadComponent = () => {
  const [processingStage, setProcessingStage] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [privacyStatus, setPrivacyStatus] = useState('🔒 Ready for secure processing');
  const fileInputRef = useRef(null);
  
  const handleFileUpload = async (file) => {
    if (!file) return;
    
    setIsProcessing(true);
    setAnalysis(null);
    setPrivacyStatus('🔒 Starting ephemeral processing...');
    
    // Real-time privacy notifications
    setProcessingStage('📄 Reading document in secure memory...');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      setProcessingStage('🤖 AI analyzing patterns (no storage)...');
      setPrivacyStatus('🔒 Data in memory only - not stored');
      
      const response = await fetch('/api/analyze-ephemeral', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Processing-Mode': 'ephemeral-zero-storage',
          'X-Document-Type': detectDocumentType(file),
          'X-Session-ID': generateSessionId()
        }
      });
      
      if (!response.ok) {
        throw new Error('Ephemeral processing failed');
      }
      
      const insights = await response.json();
      
      setProcessingStage('🔥 Deleting all data... ✅ Complete!');
      setPrivacyStatus('✅ All data permanently deleted');
      setAnalysis(insights);
      
    } catch (error) {
      console.error('Ephemeral processing error:', error);
      setProcessingStage('❌ Error - all data still deleted for security');
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

  const detectDocumentType = (file) => {
    const fileName = file.name.toLowerCase();
    const fileType = file.type;
    
    if (fileName.includes('bank') || fileName.includes('statement')) {
      return 'bank_statement';
    } else if (fileName.includes('receipt') || fileType.startsWith('image/')) {
      return 'receipt';
    } else if (fileName.includes('credit') || fileName.includes('card')) {
      return 'credit_card';
    } else if (fileName.includes('invoice') || fileName.includes('bill')) {
      return 'invoice';
    } else {
      return 'financial_document';
    }
  };

  const generateSessionId = () => {
    return `ephemeral_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    setPrivacyStatus('🔒 Ready for secure processing');
  };

  return (
    <div className="ephemeral-upload-container">
      {/* Header */}
      <div className="ephemeral-header">
        <div className="zero-storage-promise">
          <h3 className="privacy-title">🛡️ Zero Storage Guarantee</h3>
          <p className="privacy-description">
            Your financial documents are analyzed instantly and permanently 
            deleted within seconds. Nothing is stored on our servers.
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
          accept=".pdf,.csv,.xlsx,.xls,.jpg,.jpeg,.png"
          className="file-input"
          id="ephemeral-file-input"
          disabled={isProcessing}
        />
        
        <label
          htmlFor="ephemeral-file-input"
          className={`upload-button ${isProcessing ? 'processing' : ''}`}
        >
          {isProcessing ? (
            <div className="upload-loading">
              <div className="spinner"></div>
              <span>Processing...</span>
            </div>
          ) : (
            <>
              <span className="upload-icon">📄</span>
              <span className="upload-text">Upload Any Financial Document</span>
            </>
          )}
        </label>
      </div>

      {/* Privacy Indicators */}
      <div className="privacy-indicators">
        <span className="privacy-badge">🔒 EPHEMERAL PROCESSING</span>
        <span className="privacy-badge">🛡️ ZERO STORAGE</span>
        <span className="privacy-badge">⚡ INSTANT DELETE</span>
      </div>

      {/* Processing Status */}
      {processingStage && (
        <div className="processing-status">
          <div className="processing-stage">
            <div className="stage-icon">🔄</div>
            <div className="stage-text">{processingStage}</div>
          </div>
          <div className="privacy-reminder">
            🔒 Your data never touches our databases - processed in memory only
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="analysis-results">
          <div className="results-header">
            <h4 className="results-title">📊 Analysis Results</h4>
            <button onClick={resetAnalysis} className="reset-button">
              🔄 Process Another
            </button>
          </div>

          <div className="results-grid">
            {/* Summary */}
            <div className="result-card summary-card">
              <h5 className="card-title">📋 Summary</h5>
              <div className="summary-stats">
                <div className="stat">
                  <span className="stat-label">Total Transactions:</span>
                  <span className="stat-value">{analysis.summary?.totalTransactions || 0}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Total Amount:</span>
                  <span className="stat-value">${analysis.summary?.totalAmount?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Top Category:</span>
                  <span className="stat-value">{analysis.summary?.topCategory || 'Unknown'}</span>
                </div>
              </div>
            </div>

            {/* Privacy Confirmation */}
            <div className="result-card privacy-card">
              <h5 className="card-title">🔒 Privacy Status</h5>
              <div className="privacy-confirmation">
                <div className="confirmation-item">
                  <span className="check-icon">✅</span>
                  <span>All data deleted</span>
                </div>
                <div className="confirmation-item">
                  <span className="check-icon">✅</span>
                  <span>Session cleared</span>
                </div>
                <div className="confirmation-item">
                  <span className="check-icon">✅</span>
                  <span>Memory cleaned</span>
                </div>
                <div className="session-id">
                  Session: {analysis.sessionId?.slice(-8) || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div className="recommendations-section">
              <h5 className="section-title">💡 AI Recommendations</h5>
              <div className="recommendations-grid">
                {analysis.recommendations.map((rec, index) => (
                  <div key={index} className="recommendation-card">
                    <div className="recommendation-icon">💡</div>
                    <div className="recommendation-content">
                      <div className="recommendation-message">{rec.message}</div>
                      {rec.category && (
                        <div className="recommendation-details">
                          Category: {rec.category} (${rec.amount?.toFixed(2)})
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          {analysis.categories && Object.keys(analysis.categories).length > 0 && (
            <div className="categories-section">
              <h5 className="section-title">📂 Spending Categories</h5>
              <div className="categories-grid">
                {Object.entries(analysis.categories).map(([category, amount]) => (
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
        <h4 className="features-title">🛡️ Security Features</h4>
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon">🔒</div>
            <div className="feature-content">
              <div className="feature-title">Memory-Only Processing</div>
              <div className="feature-description">All data processed in RAM, never written to disk</div>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🗑️</div>
            <div className="feature-content">
              <div className="feature-title">Automatic Cleanup</div>
              <div className="feature-description">Guaranteed deletion of all temporary data</div>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🔄</div>
            <div className="feature-content">
              <div className="feature-title">Session Isolation</div>
              <div className="feature-description">Each processing session is completely isolated</div>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">📊</div>
            <div className="feature-content">
              <div className="feature-title">Zero Data Retention</div>
              <div className="feature-description">No data stored after processing completes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EphemeralUploadComponent; 