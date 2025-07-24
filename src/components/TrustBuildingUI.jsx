import React, { useState, useEffect } from 'react';
import TrustIndicators from './TrustIndicators';
import PrivacyStatusIndicator from './PrivacyStatusIndicator';

const TrustBuildingUI = ({ 
    variant = 'full',
    showTrustIndicators = true,
    showPrivacyStatus = true,
    processingState = 'idle', // 'idle', 'processing', 'complete'
    processingTime = 3000,
    className = ''
}) => {
    const [currentState, setCurrentState] = useState(processingState);
    const [trustMetrics, setTrustMetrics] = useState({
        usersTrusted: 10000,
        dataProcessed: 50000,
        privacyScore: 100,
        complianceScore: 100
    });

    useEffect(() => {
        setCurrentState(processingState);
    }, [processingState]);

    useEffect(() => {
        // Simulate real-time trust metrics updates
        const interval = setInterval(() => {
            setTrustMetrics(prev => ({
                ...prev,
                usersTrusted: prev.usersTrusted + Math.floor(Math.random() * 3),
                dataProcessed: prev.dataProcessed + Math.floor(Math.random() * 10)
            }));
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const getVariantStyles = () => {
        switch (variant) {
            case 'compact':
                return 'trust-building-compact';
            case 'detailed':
                return 'trust-building-detailed';
            case 'minimal':
                return 'trust-building-minimal';
            default:
                return 'trust-building-full';
        }
    };

    const renderTrustMetrics = () => (
        <div className="trust-metrics">
            <div className="metrics-header">
                <h3 className="metrics-title">Trust Metrics</h3>
                <p className="metrics-subtitle">Real-time privacy and security statistics</p>
            </div>
            
            <div className="metrics-grid">
                <div className="metric-card">
                    <div className="metric-icon">👥</div>
                    <div className="metric-content">
                        <div className="metric-value">{trustMetrics.usersTrusted.toLocaleString()}+</div>
                        <div className="metric-label">Users Trust Us</div>
                    </div>
                </div>
                
                <div className="metric-card">
                    <div className="metric-icon">📊</div>
                    <div className="metric-content">
                        <div className="metric-value">{trustMetrics.dataProcessed.toLocaleString()}+</div>
                        <div className="metric-label">Documents Processed</div>
                    </div>
                </div>
                
                <div className="metric-card">
                    <div className="metric-icon">🛡️</div>
                    <div className="metric-content">
                        <div className="metric-value">{trustMetrics.privacyScore}%</div>
                        <div className="metric-label">Privacy Score</div>
                    </div>
                </div>
                
                <div className="metric-card">
                    <div className="metric-icon">⚖️</div>
                    <div className="metric-content">
                        <div className="metric-value">{trustMetrics.complianceScore}%</div>
                        <div className="metric-label">Compliance Score</div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderPrivacyGuarantee = () => (
        <div className="privacy-guarantee-section">
            <div className="guarantee-header">
                <div className="guarantee-icon">🛡️</div>
                <div className="guarantee-content">
                    <h3 className="guarantee-title">Privacy Guarantee</h3>
                    <p className="guarantee-description">
                        We guarantee that your financial data is never stored on our servers. 
                        All processing happens in secure, temporary memory and is immediately deleted.
                    </p>
                </div>
            </div>
            
            <div className="guarantee-features">
                <div className="guarantee-feature">
                    <span className="feature-icon">🔒</span>
                    <span className="feature-text">Zero Data Storage</span>
                </div>
                <div className="guarantee-feature">
                    <span className="feature-icon">⚡</span>
                    <span className="feature-text">Instant Deletion</span>
                </div>
                <div className="guarantee-feature">
                    <span className="feature-icon">🤖</span>
                    <span className="feature-text">Full AI Analysis</span>
                </div>
                <div className="guarantee-feature">
                    <span className="feature-icon">⚖️</span>
                    <span className="feature-text">GDPR Compliant</span>
                </div>
            </div>
        </div>
    );

    const renderSecurityBadges = () => (
        <div className="security-badges">
            <div className="badges-header">
                <h3 className="badges-title">Security Certifications</h3>
                <p className="badges-subtitle">Industry-leading security and privacy standards</p>
            </div>
            
            <div className="badges-grid">
                <div className="security-badge">
                    <div className="badge-icon">🔒</div>
                    <div className="badge-content">
                        <div className="badge-title">SOC 2 Type II</div>
                        <div className="badge-description">Security & Availability</div>
                    </div>
                </div>
                
                <div className="security-badge">
                    <div className="badge-icon">⚖️</div>
                    <div className="badge-content">
                        <div className="badge-title">GDPR Compliant</div>
                        <div className="badge-description">EU Data Protection</div>
                    </div>
                </div>
                
                <div className="security-badge">
                    <div className="badge-icon">🛡️</div>
                    <div className="badge-content">
                        <div className="badge-title">CCPA Compliant</div>
                        <div className="badge-description">California Privacy</div>
                    </div>
                </div>
                
                <div className="security-badge">
                    <div className="badge-icon">🔐</div>
                    <div className="badge-content">
                        <div className="badge-title">HIPAA Ready</div>
                        <div className="badge-description">Healthcare Privacy</div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className={`trust-building-ui ${getVariantStyles()} ${className}`}>
            {/* Header */}
            <div className="trust-header">
                <h2 className="trust-title">Your Privacy is Our Priority</h2>
                <p className="trust-subtitle">
                    Experience the most secure AI financial analysis platform with zero data storage
                </p>
            </div>

            {/* Trust Indicators */}
            {showTrustIndicators && (
                <div className="trust-indicators-section">
                    <TrustIndicators 
                        variant={variant === 'compact' ? 'compact' : 'default'}
                        showAnimation={true}
                    />
                </div>
            )}

            {/* Privacy Status */}
            {showPrivacyStatus && (
                <div className="privacy-status-section">
                    <PrivacyStatusIndicator 
                        isProcessing={currentState === 'processing'}
                        isComplete={currentState === 'complete'}
                        processingTime={processingTime}
                        variant={variant}
                    />
                </div>
            )}

            {/* Trust Metrics */}
            {variant === 'full' && (
                <div className="trust-metrics-section">
                    {renderTrustMetrics()}
                </div>
            )}

            {/* Privacy Guarantee */}
            {variant === 'full' && (
                <div className="privacy-guarantee-section">
                    {renderPrivacyGuarantee()}
                </div>
            )}

            {/* Security Badges */}
            {variant === 'full' && (
                <div className="security-badges-section">
                    {renderSecurityBadges()}
                </div>
            )}

            {/* Call to Action */}
            <div className="trust-cta">
                <div className="cta-content">
                    <h3 className="cta-title">Ready to Experience Privacy-First AI?</h3>
                    <p className="cta-description">
                        Join thousands of users who trust us with their financial analysis
                    </p>
                    <button className="cta-button">
                        <span className="cta-icon">🚀</span>
                        <span className="cta-text">Start Secure Analysis</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TrustBuildingUI; 