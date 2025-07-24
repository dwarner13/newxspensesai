import React, { useState, useEffect } from 'react';

const LegalComplianceSystem = ({ 
    analysisType, 
    onConsentAccepted, 
    onDisclaimersGenerated,
    userLocation = 'US',
    showConsentForm = true 
}) => {
    const [disclaimers, setDisclaimers] = useState(null);
    const [consentRequirements, setConsentRequirements] = useState(null);
    const [userConsent, setUserConsent] = useState({});
    const [consentSubmitted, setConsentSubmitted] = useState(false);
    const [complianceCertificate, setComplianceCertificate] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('disclaimers');
    
    useEffect(() => {
        if (analysisType) {
            generateDisclaimers();
            if (showConsentForm) {
                generateConsentRequirements();
            }
        }
    }, [analysisType, showConsentForm]);

    const generateDisclaimers = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/generate-disclaimers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': generateSessionId(),
                    'X-Analysis-Type': analysisType
                },
                body: JSON.stringify({
                    analysis_type: analysisType
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate disclaimers');
            }

            const disclaimersData = await response.json();
            setDisclaimers(disclaimersData);
            
            if (onDisclaimersGenerated) {
                onDisclaimersGenerated(disclaimersData);
            }
        } catch (error) {
            console.error('Error generating disclaimers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateConsentRequirements = async () => {
        try {
            const response = await fetch('/api/generate-consent-requirements', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': generateSessionId(),
                    'X-User-Location': userLocation
                },
                body: JSON.stringify({
                    user_location: userLocation
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate consent requirements');
            }

            const consentData = await response.json();
            setConsentRequirements(consentData);
        } catch (error) {
            console.error('Error generating consent requirements:', error);
        }
    };

    const handleConsentChange = (field, value) => {
        setUserConsent(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const submitConsent = async () => {
        setIsLoading(true);
        try {
            const consentData = {
                ...userConsent,
                ip_address: 'user-provided',
                user_agent: navigator.userAgent,
                timestamp: new Date().toISOString()
            };

            const response = await fetch('/api/record-user-consent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': generateSessionId()
                },
                body: JSON.stringify({
                    consent_data: consentData
                })
            });

            if (!response.ok) {
                throw new Error('Failed to record user consent');
            }

            const certificate = await response.json();
            setComplianceCertificate(certificate);
            setConsentSubmitted(true);
            
            if (onConsentAccepted) {
                onConsentAccepted(certificate);
            }
        } catch (error) {
            console.error('Error submitting consent:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateSessionId = () => {
        return `legal_compliance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    const renderDisclaimers = () => (
        <div className="disclaimers-section">
            <h3 className="section-title">⚖️ Legal Disclaimers</h3>
            
            <div className="disclaimers-grid">
                <div className="disclaimer-card primary">
                    <div className="disclaimer-icon">💰</div>
                    <div className="disclaimer-content">
                        <h4 className="disclaimer-title">Financial Advice Disclaimer</h4>
                        <p className="disclaimer-text">
                            {disclaimers?.financial_advice || 'Educational analysis only - not professional financial advice'}
                        </p>
                    </div>
                </div>

                <div className="disclaimer-card primary">
                    <div className="disclaimer-icon">🔒</div>
                    <div className="disclaimer-content">
                        <h4 className="disclaimer-title">Data Privacy</h4>
                        <p className="disclaimer-text">
                            {disclaimers?.data_privacy || 'Zero data storage - all information permanently deleted'}
                        </p>
                    </div>
                </div>

                <div className="disclaimer-card primary">
                    <div className="disclaimer-icon">🤖</div>
                    <div className="disclaimer-content">
                        <h4 className="disclaimer-title">AI Limitations</h4>
                        <p className="disclaimer-text">
                            {disclaimers?.ai_limitations || 'AI insights are suggestions based on patterns - consult professionals for major decisions'}
                        </p>
                    </div>
                </div>

                <div className="disclaimer-card primary">
                    <div className="disclaimer-icon">⚠️</div>
                    <div className="disclaimer-content">
                        <h4 className="disclaimer-title">Liability</h4>
                        <p className="disclaimer-text">
                            {disclaimers?.liability || 'Users responsible for financial decisions - XspensesAI provides educational insights only'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Regulatory Disclaimers */}
            {disclaimers?.regulatory_compliance && (
                <div className="regulatory-disclaimers">
                    <h4 className="subsection-title">📋 Regulatory Compliance</h4>
                    <div className="regulatory-grid">
                        {Object.entries(disclaimers.regulatory_compliance).map(([key, value]) => (
                            <div key={key} className="regulatory-item">
                                <span className="regulatory-icon">✅</span>
                                <span className="regulatory-text">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI Transparency */}
            {disclaimers?.ai_transparency && (
                <div className="ai-transparency">
                    <h4 className="subsection-title">🤖 AI Transparency</h4>
                    <div className="transparency-grid">
                        {Object.entries(disclaimers.ai_transparency).map(([key, value]) => (
                            <div key={key} className="transparency-item">
                                <span className="transparency-icon">✅</span>
                                <span className="transparency-text">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderConsentForm = () => (
        <div className="consent-section">
            <h3 className="section-title">📝 User Consent</h3>
            
            {!consentSubmitted ? (
                <div className="consent-form">
                    <div className="consent-notice">
                        <div className="notice-icon">⚠️</div>
                        <div className="notice-content">
                            <h4>Important: Please read and acknowledge the following</h4>
                            <p>By providing consent, you acknowledge understanding of our privacy practices and legal disclaimers.</p>
                        </div>
                    </div>

                    <div className="consent-items">
                        {consentRequirements && Object.entries(consentRequirements).map(([key, value]) => {
                            if (key.startsWith('_') || key.includes('timestamp') || key.includes('session') || key.includes('version')) {
                                return null;
                            }
                            
                            return (
                                <div key={key} className="consent-item">
                                    <div className="consent-checkbox">
                                        <input
                                            type="checkbox"
                                            id={key}
                                            checked={userConsent[key] || false}
                                            onChange={(e) => handleConsentChange(key, e.target.checked)}
                                            className="consent-input"
                                        />
                                        <label htmlFor={key} className="consent-label">
                                            {value}
                                        </label>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="consent-actions">
                        <button
                            onClick={submitConsent}
                            disabled={isLoading || Object.keys(userConsent).length === 0}
                            className="consent-submit-button"
                        >
                            {isLoading ? (
                                <div className="loading-content">
                                    <div className="spinner"></div>
                                    <span>Processing Consent...</span>
                                </div>
                            ) : (
                                <>
                                    <span className="submit-icon">✅</span>
                                    <span>Accept and Continue</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="consent-confirmed">
                    <div className="confirmed-icon">✅</div>
                    <h4 className="confirmed-title">Consent Confirmed</h4>
                    <p className="confirmed-text">
                        Thank you for providing consent. You can now proceed with the AI analysis.
                    </p>
                </div>
            )}
        </div>
    );

    const renderComplianceCertificate = () => (
        <div className="certificate-section">
            <h3 className="section-title">🏆 Compliance Certificate</h3>
            
            {complianceCertificate && (
                <div className="certificate-card">
                    <div className="certificate-header">
                        <div className="certificate-icon">🏆</div>
                        <div className="certificate-title">
                            <h4>Legal Compliance Certificate</h4>
                            <p className="certificate-id">ID: {complianceCertificate.certificate_id}</p>
                        </div>
                    </div>

                    <div className="certificate-content">
                        <div className="certificate-status">
                            <span className="status-badge success">✅ Compliant</span>
                            <span className="status-text">All legal requirements met</span>
                        </div>

                        <div className="compliance-features">
                            <h5>Compliance Features:</h5>
                            <ul className="features-list">
                                {complianceCertificate.compliance_features?.map((feature, index) => (
                                    <li key={index} className="feature-item">
                                        <span className="feature-icon">✅</span>
                                        <span className="feature-text">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="regulatory-compliance">
                            <h5>Regulatory Compliance:</h5>
                            <ul className="regulatory-list">
                                {complianceCertificate.regulatory_compliance?.map((regulation, index) => (
                                    <li key={index} className="regulation-item">
                                        <span className="regulation-icon">📋</span>
                                        <span className="regulation-text">{regulation}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="certificate-footer">
                            <div className="validity">
                                <span className="validity-label">Valid until:</span>
                                <span className="validity-date">
                                    {new Date(complianceCertificate.certificate_valid_until).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="legal-compliance-system">
            {/* Header */}
            <div className="compliance-header">
                <h2 className="compliance-title">⚖️ Legal Compliance System</h2>
                <p className="compliance-description">
                    Ensuring legal compliance and user consent for AI financial analysis
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="compliance-tabs">
                <button 
                    className={`tab-button ${activeTab === 'disclaimers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('disclaimers')}
                >
                    ⚖️ Disclaimers
                </button>
                {showConsentForm && (
                    <button 
                        className={`tab-button ${activeTab === 'consent' ? 'active' : ''}`}
                        onClick={() => setActiveTab('consent')}
                    >
                        📝 Consent
                    </button>
                )}
                {consentSubmitted && (
                    <button 
                        className={`tab-button ${activeTab === 'certificate' ? 'active' : ''}`}
                        onClick={() => setActiveTab('certificate')}
                    >
                        🏆 Certificate
                    </button>
                )}
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'disclaimers' && renderDisclaimers()}
                {activeTab === 'consent' && showConsentForm && renderConsentForm()}
                {activeTab === 'certificate' && consentSubmitted && renderComplianceCertificate()}
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="loading-overlay">
                    <div className="loading-content">
                        <div className="loading-spinner"></div>
                        <div className="loading-text">Processing legal compliance...</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LegalComplianceSystem; 