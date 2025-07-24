import React, { useState, useEffect } from 'react';

const PrivacyStatusIndicator = ({ 
    isProcessing = false, 
    isComplete = false,
    processingTime = 3000,
    showCountdown = true,
    variant = 'default',
    className = ''
}) => {
    const [countdown, setCountdown] = useState(3);
    const [showDeletionMessage, setShowDeletionMessage] = useState(false);
    const [deletionProgress, setDeletionProgress] = useState(0);

    useEffect(() => {
        let countdownInterval;
        let deletionInterval;

        if (isProcessing && showCountdown) {
            countdownInterval = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        setShowDeletionMessage(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        if (showDeletionMessage) {
            deletionInterval = setInterval(() => {
                setDeletionProgress(prev => {
                    if (prev >= 100) {
                        return 100;
                    }
                    return prev + 10;
                });
            }, 100);
        }

        return () => {
            if (countdownInterval) clearInterval(countdownInterval);
            if (deletionInterval) clearInterval(deletionInterval);
        };
    }, [isProcessing, showCountdown, showDeletionMessage]);

    useEffect(() => {
        if (isComplete) {
            setShowDeletionMessage(false);
            setDeletionProgress(100);
        }
    }, [isComplete]);

    const getVariantStyles = () => {
        switch (variant) {
            case 'compact':
                return 'privacy-status-compact';
            case 'detailed':
                return 'privacy-status-detailed';
            case 'minimal':
                return 'privacy-status-minimal';
            default:
                return 'privacy-status-default';
        }
    };

    const renderProcessingStatus = () => (
        <div className="processing-status">
            <div className="processing-header">
                <div className="processing-icon-wrapper">
                    <div className="processing-spinner"></div>
                    <span className="processing-icon">🔄</span>
                </div>
                <div className="processing-text">
                    <h4 className="processing-title">Processing in Secure Memory</h4>
                    <p className="processing-description">
                        Your data is being analyzed in isolated, temporary memory
                    </p>
                </div>
            </div>
            
            {showCountdown && countdown > 0 && (
                <div className="countdown-section">
                    <div className="countdown-bar">
                        <div 
                            className="countdown-progress"
                            style={{ width: `${((3 - countdown) / 3) * 100}%` }}
                        ></div>
                    </div>
                    <div className="countdown-text">
                        Data deletion in <span className="countdown-number">{countdown}</span>...
                    </div>
                </div>
            )}
            
            {showDeletionMessage && (
                <div className="deletion-section">
                    <div className="deletion-bar">
                        <div 
                            className="deletion-progress"
                            style={{ width: `${deletionProgress}%` }}
                        ></div>
                    </div>
                    <div className="deletion-text">
                        <span className="deletion-icon">🗑️</span>
                        Permanently deleting all data... {deletionProgress}%
                    </div>
                </div>
            )}
            
            <div className="security-features">
                <div className="security-item">
                    <span className="security-icon">🔒</span>
                    <span className="security-text">Memory-only processing</span>
                </div>
                <div className="security-item">
                    <span className="security-icon">🛡️</span>
                    <span className="security-text">No server storage</span>
                </div>
                <div className="security-item">
                    <span className="security-icon">⚡</span>
                    <span className="security-text">Instant deletion</span>
                </div>
            </div>
        </div>
    );

    const renderCompleteStatus = () => (
        <div className="complete-status">
            <div className="complete-header">
                <div className="complete-icon-wrapper">
                    <span className="complete-icon">✅</span>
                </div>
                <div className="complete-text">
                    <h4 className="complete-title">Analysis Complete</h4>
                    <p className="complete-description">
                        All data has been permanently deleted from memory
                    </p>
                </div>
            </div>
            
            <div className="completion-details">
                <div className="completion-item">
                    <span className="completion-icon">🗑️</span>
                    <span className="completion-text">Data permanently erased</span>
                </div>
                <div className="completion-item">
                    <span className="completion-icon">🔒</span>
                    <span className="completion-text">Memory cleared</span>
                </div>
                <div className="completion-item">
                    <span className="completion-icon">✅</span>
                    <span className="completion-text">Privacy maintained</span>
                </div>
            </div>
            
            <div className="privacy-guarantee">
                <div className="guarantee-icon">🛡️</div>
                <div className="guarantee-content">
                    <h5 className="guarantee-title">Privacy Guarantee</h5>
                    <p className="guarantee-text">
                        Your financial data was never stored on our servers. 
                        Analysis completed in secure, temporary memory only.
                    </p>
                </div>
            </div>
        </div>
    );

    const renderIdleStatus = () => (
        <div className="idle-status">
            <div className="idle-header">
                <div className="idle-icon-wrapper">
                    <span className="idle-icon">🔒</span>
                </div>
                <div className="idle-text">
                    <h4 className="idle-title">Ready for Secure Analysis</h4>
                    <p className="idle-description">
                        Upload your documents for privacy-first AI analysis
                    </p>
                </div>
            </div>
            
            <div className="privacy-features">
                <div className="privacy-feature">
                    <span className="feature-icon">⚡</span>
                    <span className="feature-text">Zero data storage</span>
                </div>
                <div className="privacy-feature">
                    <span className="feature-icon">🛡️</span>
                    <span className="feature-text">Memory-only processing</span>
                </div>
                <div className="privacy-feature">
                    <span className="feature-icon">🗑️</span>
                    <span className="feature-text">Instant deletion</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className={`privacy-status-indicator ${getVariantStyles()} ${className}`}>
            {isProcessing && renderProcessingStatus()}
            {isComplete && renderCompleteStatus()}
            {!isProcessing && !isComplete && renderIdleStatus()}
        </div>
    );
};

export default PrivacyStatusIndicator; 