import React, { useState, useRef } from 'react';

const AIInsightGenerator = ({ analyzedData, documentType, onInsightsGenerated }) => {
    const [insights, setInsights] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStage, setGenerationStage] = useState('');
    const [activeTab, setActiveTab] = useState('summary');
    const audioRef = useRef(null);
    
    const generateInsights = async () => {
        if (!analyzedData) return;
        
        setIsGenerating(true);
        setInsights(null);
        setGenerationStage('🧠 Analyzing financial patterns...');
        
        try {
            setGenerationStage('📊 Calculating efficiency metrics...');
            
            const response = await fetch('/api/generate-insights', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': generateSessionId(),
                    'X-Processing-Mode': 'pattern-based-only'
                },
                body: JSON.stringify({
                    analyzed_data: analyzedData,
                    document_type: documentType
                })
            });
            
            if (!response.ok) {
                throw new Error('Insight generation failed');
            }
            
            setGenerationStage('🎧 Creating personalized content...');
            const generatedInsights = await response.json();
            
            setGenerationStage('✅ Insights generated successfully!');
            setInsights(generatedInsights);
            
            if (onInsightsGenerated) {
                onInsightsGenerated(generatedInsights);
            }
            
        } catch (error) {
            console.error('Insight generation error:', error);
            setGenerationStage('❌ Error generating insights');
        } finally {
            setIsGenerating(false);
        }
    };

    const generateSessionId = () => {
        return `ai_insights_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    const playPodcastAudio = () => {
        if (audioRef.current) {
            audioRef.current.play();
        }
    };

    const pausePodcastAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
    };

    const renderExecutiveSummary = () => (
        <div className="insight-section">
            <h3 className="section-title">📊 Executive Summary</h3>
            <div className="summary-grid">
                {insights?.summary?.key_findings?.map((finding, index) => (
                    <div key={index} className="finding-card">
                        <div className="finding-icon">🎯</div>
                        <div className="finding-text">{finding}</div>
                    </div>
                ))}
            </div>
            
            <div className="critical-insights">
                <h4 className="subsection-title">🔍 Critical Insights</h4>
                <ul className="insights-list">
                    {insights?.summary?.critical_insights?.map((insight, index) => (
                        <li key={index} className="insight-item">{insight}</li>
                    ))}
                </ul>
            </div>
        </div>
    );

    const renderActionableAdvice = () => (
        <div className="insight-section">
            <h3 className="section-title">💡 Actionable Advice</h3>
            <div className="advice-grid">
                {insights?.actionable_advice?.map((advice, index) => (
                    <div key={index} className={`advice-card priority-${advice.priority.toLowerCase()}`}>
                        <div className="advice-header">
                            <span className="advice-category">{advice.category}</span>
                            <span className={`priority-badge ${advice.priority.toLowerCase()}`}>
                                {advice.priority}
                            </span>
                        </div>
                        <div className="advice-content">
                            <h4 className="advice-action">{advice.action}</h4>
                            <div className="advice-details">
                                <div className="advice-impact">
                                    <span className="impact-label">Impact:</span>
                                    <span className="impact-value">{advice.impact}</span>
                                </div>
                                <div className="advice-timeline">
                                    <span className="timeline-label">Timeline:</span>
                                    <span className="timeline-value">{advice.timeline}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderPodcastContent = () => (
        <div className="insight-section">
            <h3 className="section-title">🎧 Personalized Podcast</h3>
            <div className="podcast-container">
                <div className="podcast-player">
                    <div className="player-controls">
                        <button 
                            onClick={playPodcastAudio}
                            className="play-button"
                            disabled={!insights?.podcast_script}
                        >
                            ▶️ Play Analysis
                        </button>
                        <button 
                            onClick={pausePodcastAudio}
                            className="pause-button"
                            disabled={!insights?.podcast_script}
                        >
                            ⏸️ Pause
                        </button>
                    </div>
                    <audio 
                        ref={audioRef}
                        src={insights?.podcast_audio_url || ''}
                        className="audio-element"
                    />
                </div>
                
                <div className="podcast-script">
                    <h4 className="script-title">📝 Podcast Script</h4>
                    <div className="script-content">
                        {insights?.podcast_script?.split('\n').map((line, index) => (
                            <p key={index} className="script-line">
                                {line.trim()}
                            </p>
                        ))}
                    </div>
                </div>
                
                <div className="podcast-features">
                    <div className="feature-item">
                        <span className="feature-icon">🎵</span>
                        <span className="feature-text">Background Music</span>
                    </div>
                    <div className="feature-item">
                        <span className="feature-icon">🎙️</span>
                        <span className="feature-text">Professional Narration</span>
                    </div>
                    <div className="feature-item">
                        <span className="feature-icon">📊</span>
                        <span className="feature-text">Data Visualization</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderPrivacyGuarantee = () => (
        <div className="privacy-guarantee">
            <div className="guarantee-header">
                <span className="guarantee-icon">🔒</span>
                <h3 className="guarantee-title">Privacy Guarantee</h3>
            </div>
            <div className="guarantee-content">
                <p className="guarantee-text">
                    {insights?.privacy_guarantee || "✅ Analysis based on patterns only - no personal data retained"}
                </p>
                <div className="guarantee-features">
                    <div className="feature">
                        <span className="feature-check">✅</span>
                        <span>Pattern-based analysis only</span>
                    </div>
                    <div className="feature">
                        <span className="feature-check">✅</span>
                        <span>No personal data stored</span>
                    </div>
                    <div className="feature">
                        <span className="feature-check">✅</span>
                        <span>Zero data retention</span>
                    </div>
                    <div className="feature">
                        <span className="feature-check">✅</span>
                        <span>Privacy-first design</span>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="ai-insight-generator">
            {/* Header */}
            <div className="generator-header">
                <h2 className="generator-title">🧠 AI Insight Generator</h2>
                <p className="generator-description">
                    Generate personalized financial insights and podcast content based on your data patterns
                </p>
            </div>

            {/* Generate Button */}
            {!insights && (
                <div className="generate-section">
                    <button 
                        onClick={generateInsights}
                        disabled={isGenerating || !analyzedData}
                        className={`generate-button ${isGenerating ? 'generating' : ''}`}
                    >
                        {isGenerating ? (
                            <div className="generating-content">
                                <div className="spinner"></div>
                                <span>Generating Insights...</span>
                            </div>
                        ) : (
                            <>
                                <span className="generate-icon">🚀</span>
                                <span>Generate AI Insights</span>
                            </>
                        )}
                    </button>
                    
                    {generationStage && (
                        <div className="generation-status">
                            <div className="status-text">{generationStage}</div>
                        </div>
                    )}
                </div>
            )}

            {/* Insights Display */}
            {insights && (
                <div className="insights-display">
                    {/* Tab Navigation */}
                    <div className="tab-navigation">
                        <button 
                            className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
                            onClick={() => setActiveTab('summary')}
                        >
                            📊 Summary
                        </button>
                        <button 
                            className={`tab-button ${activeTab === 'advice' ? 'active' : ''}`}
                            onClick={() => setActiveTab('advice')}
                        >
                            💡 Advice
                        </button>
                        <button 
                            className={`tab-button ${activeTab === 'podcast' ? 'active' : ''}`}
                            onClick={() => setActiveTab('podcast')}
                        >
                            🎧 Podcast
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="tab-content">
                        {activeTab === 'summary' && renderExecutiveSummary()}
                        {activeTab === 'advice' && renderActionableAdvice()}
                        {activeTab === 'podcast' && renderPodcastContent()}
                    </div>

                    {/* Privacy Guarantee */}
                    {renderPrivacyGuarantee()}

                    {/* Regenerate Button */}
                    <div className="regenerate-section">
                        <button 
                            onClick={generateInsights}
                            className="regenerate-button"
                        >
                            🔄 Regenerate Insights
                        </button>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isGenerating && (
                <div className="loading-overlay">
                    <div className="loading-content">
                        <div className="loading-spinner"></div>
                        <div className="loading-text">Generating personalized insights...</div>
                        <div className="loading-stage">{generationStage}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIInsightGenerator; 