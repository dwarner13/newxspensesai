import React, { useState, useEffect } from 'react';
import TrustIndicators from './TrustIndicators';
import PrivacyStatusIndicator from './PrivacyStatusIndicator';
import TrustBuildingUI from './TrustBuildingUI';

const TrustBuildingDemo = () => {
    const [processingState, setProcessingState] = useState('idle');
    const [selectedVariant, setSelectedVariant] = useState('full');
    const [showComponents, setShowComponents] = useState({
        trustIndicators: true,
        privacyStatus: true,
        fullUI: true
    });

    const handleStartProcessing = () => {
        setProcessingState('processing');
        
        // Simulate processing time
        setTimeout(() => {
            setProcessingState('complete');
        }, 5000);
    };

    const handleReset = () => {
        setProcessingState('idle');
    };

    const variants = [
        { value: 'full', label: 'Full Experience', description: 'Complete trust-building interface' },
        { value: 'compact', label: 'Compact', description: 'Condensed version for smaller spaces' },
        { value: 'detailed', label: 'Detailed', description: 'Enhanced with additional metrics' },
        { value: 'minimal', label: 'Minimal', description: 'Simple and clean design' }
    ];

    const componentOptions = [
        { key: 'trustIndicators', label: 'Trust Indicators', description: 'Show privacy and security features' },
        { key: 'privacyStatus', label: 'Privacy Status', description: 'Real-time processing status' },
        { key: 'fullUI', label: 'Full Trust UI', description: 'Complete trust-building interface' }
    ];

    return (
        <div className="trust-building-demo">
            {/* Header */}
            <div className="demo-header">
                <h1 className="demo-title">🛡️ Trust Building UI Demo</h1>
                <p className="demo-description">
                    Experience our privacy-first trust indicators and real-time status updates
                </p>
            </div>

            {/* Controls */}
            <div className="demo-controls">
                <div className="control-section">
                    <h3 className="control-title">Processing State</h3>
                    <div className="control-buttons">
                        <button 
                            className={`control-button ${processingState === 'idle' ? 'active' : ''}`}
                            onClick={() => setProcessingState('idle')}
                        >
                            🟢 Idle
                        </button>
                        <button 
                            className={`control-button ${processingState === 'processing' ? 'active' : ''}`}
                            onClick={handleStartProcessing}
                        >
                            🔄 Processing
                        </button>
                        <button 
                            className={`control-button ${processingState === 'complete' ? 'active' : ''}`}
                            onClick={() => setProcessingState('complete')}
                        >
                            ✅ Complete
                        </button>
                    </div>
                </div>

                <div className="control-section">
                    <h3 className="control-title">UI Variant</h3>
                    <div className="variant-selector">
                        {variants.map((variant) => (
                            <button
                                key={variant.value}
                                className={`variant-button ${selectedVariant === variant.value ? 'active' : ''}`}
                                onClick={() => setSelectedVariant(variant.value)}
                            >
                                <div className="variant-label">{variant.label}</div>
                                <div className="variant-description">{variant.description}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="control-section">
                    <h3 className="control-title">Show Components</h3>
                    <div className="component-toggles">
                        {componentOptions.map((option) => (
                            <label key={option.key} className="component-toggle">
                                <input
                                    type="checkbox"
                                    checked={showComponents[option.key]}
                                    onChange={(e) => setShowComponents(prev => ({
                                        ...prev,
                                        [option.key]: e.target.checked
                                    }))}
                                    className="toggle-input"
                                />
                                <div className="toggle-content">
                                    <div className="toggle-label">{option.label}</div>
                                    <div className="toggle-description">{option.description}</div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Demo Content */}
            <div className="demo-content">
                {/* Trust Indicators Demo */}
                {showComponents.trustIndicators && (
                    <div className="demo-section">
                        <h2 className="section-title">🔒 Trust Indicators</h2>
                        <p className="section-description">
                            Showcase privacy and security features with animated trust badges
                        </p>
                        <TrustIndicators 
                            variant={selectedVariant === 'compact' ? 'compact' : 'default'}
                            showAnimation={true}
                        />
                    </div>
                )}

                {/* Privacy Status Demo */}
                {showComponents.privacyStatus && (
                    <div className="demo-section">
                        <h2 className="section-title">🔄 Privacy Status Indicator</h2>
                        <p className="section-description">
                            Real-time processing status with countdown and deletion progress
                        </p>
                        <PrivacyStatusIndicator 
                            isProcessing={processingState === 'processing'}
                            isComplete={processingState === 'complete'}
                            processingTime={5000}
                            variant={selectedVariant}
                        />
                    </div>
                )}

                {/* Full Trust UI Demo */}
                {showComponents.fullUI && (
                    <div className="demo-section">
                        <h2 className="section-title">🛡️ Complete Trust Building UI</h2>
                        <p className="section-description">
                            Comprehensive trust interface with metrics, guarantees, and certifications
                        </p>
                        <TrustBuildingUI 
                            variant={selectedVariant}
                            showTrustIndicators={false}
                            showPrivacyStatus={false}
                            processingState={processingState}
                            processingTime={5000}
                        />
                    </div>
                )}
            </div>

            {/* Interactive Demo */}
            <div className="interactive-demo">
                <h2 className="section-title">🎮 Interactive Demo</h2>
                <p className="section-description">
                    Test the complete user experience with simulated processing
                </p>
                
                <div className="demo-simulation">
                    <div className="simulation-controls">
                        <button 
                            className="simulation-button primary"
                            onClick={handleStartProcessing}
                            disabled={processingState === 'processing'}
                        >
                            🚀 Start Processing Simulation
                        </button>
                        <button 
                            className="simulation-button secondary"
                            onClick={handleReset}
                        >
                            🔄 Reset Demo
                        </button>
                    </div>
                    
                    <div className="simulation-status">
                        <div className="status-indicator">
                            <span className="status-label">Current State:</span>
                            <span className={`status-value ${processingState}`}>
                                {processingState === 'idle' && '🟢 Ready'}
                                {processingState === 'processing' && '🔄 Processing...'}
                                {processingState === 'complete' && '✅ Complete'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Code Examples */}
            <div className="code-examples">
                <h2 className="section-title">💻 Code Examples</h2>
                
                <div className="code-section">
                    <h3 className="code-title">Basic Trust Indicators</h3>
                    <pre className="code-block">
{`import TrustIndicators from './components/TrustIndicators';

<TrustIndicators 
    variant="default"
    showAnimation={true}
/>`}
                    </pre>
                </div>

                <div className="code-section">
                    <h3 className="code-title">Privacy Status with Processing</h3>
                    <pre className="code-block">
{`import PrivacyStatusIndicator from './components/PrivacyStatusIndicator';

<PrivacyStatusIndicator 
    isProcessing={true}
    isComplete={false}
    processingTime={3000}
    showCountdown={true}
/>`}
                    </pre>
                </div>

                <div className="code-section">
                    <h3 className="code-title">Complete Trust Building UI</h3>
                    <pre className="code-block">
{`import TrustBuildingUI from './components/TrustBuildingUI';

<TrustBuildingUI 
    variant="full"
    showTrustIndicators={true}
    showPrivacyStatus={true}
    processingState="processing"
    processingTime={5000}
/>`}
                    </pre>
                </div>
            </div>

            {/* Features Overview */}
            <div className="features-overview">
                <h2 className="section-title">✨ Features Overview</h2>
                
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">🛡️</div>
                        <h3 className="feature-title">Privacy-First Design</h3>
                        <p className="feature-description">
                            All components emphasize zero data storage and instant deletion
                        </p>
                    </div>
                    
                    <div className="feature-card">
                        <div className="feature-icon">⚡</div>
                        <h3 className="feature-title">Real-Time Updates</h3>
                        <p className="feature-description">
                            Live processing status with countdown and progress indicators
                        </p>
                    </div>
                    
                    <div className="feature-card">
                        <div className="feature-icon">🎨</div>
                        <h3 className="feature-title">Multiple Variants</h3>
                        <p className="feature-description">
                            Compact, detailed, and minimal versions for different use cases
                        </p>
                    </div>
                    
                    <div className="feature-card">
                        <div className="feature-icon">🔧</div>
                        <h3 className="feature-title">Easy Integration</h3>
                        <p className="feature-description">
                            Simple props-based configuration and responsive design
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrustBuildingDemo; 