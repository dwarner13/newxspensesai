/**
 * ORCHESTRATION RESULTS DISPLAY
 * Shows the results from the Financial Narrative Orchestration System
 */

import React from 'react';
import { OrchestrationResult } from '../../orchestrator';

interface OrchestrationResultsProps {
  result: OrchestrationResult;
  onClose: () => void;
}

const OrchestrationResults: React.FC<OrchestrationResultsProps> = ({ result, onClose }) => {
  return (
    <div className="orchestration-results-overlay">
      <div className="orchestration-results-container">
        
        {/* Executive Summary */}
        <div className="executive-summary-section">
          <div className="prime-avatar-large">👑</div>
          <h1 className="executive-title">{result.executiveSummary.greeting}</h1>
          <p className="prime-message">{result.executiveSummary.primeMessage}</p>
          
          {/* Key Metrics */}
          <div className="key-metrics-grid">
            {Object.entries(result.executiveSummary.keyMetrics).map(([key, value]) => (
              <div key={key} className="metric-card">
                <span className="metric-label">{key}</span>
                <span className="metric-value">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Team Highlights */}
        <div className="ai-team-highlights">
          <h2>AI Team Performance</h2>
          <div className="highlights-list">
            {result.executiveSummary.aiTeamHighlights.map((highlight, index) => (
              <div key={index} className="highlight-item">
                <span className="highlight-icon">🤖</span>
                <span className="highlight-text">{highlight}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Narrative Preview */}
        <div className="narrative-preview">
          <h2>Your Financial Story</h2>
          <div className="narrative-content">
            {result.narrative.substring(0, 500)}...
          </div>
          <button className="read-full-story-btn">
            Read Full Story ({result.narrative.split(' ').length} words)
          </button>
        </div>

        {/* Podcasts Preview */}
        <div className="podcasts-preview">
          <h2>Personalized Podcasts</h2>
          <div className="podcasts-grid">
            {result.podcasts.slice(0, 3).map((podcast, index) => (
              <div key={index} className="podcast-card">
                <div className="podcast-host">{podcast.host}</div>
                <div className="podcast-title">{podcast.title}</div>
                <div className="podcast-duration">{podcast.duration}</div>
                <div className="podcast-focus">{podcast.focus}</div>
              </div>
            ))}
          </div>
          <button className="listen-all-podcasts-btn">
            Listen to All {result.podcasts.length} Podcasts
          </button>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="action-btn primary" onClick={onClose}>
            View Transactions
          </button>
          <button className="action-btn secondary">
            Read Full Story
          </button>
          <button className="action-btn secondary">
            Listen to Podcasts
          </button>
        </div>

        {/* Processing Stats */}
        <div className="processing-stats">
          <div className="stat-item">
            <span className="stat-label">Processing Time:</span>
            <span className="stat-value">{(result.processingTime / 1000).toFixed(1)}s</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Generated:</span>
            <span className="stat-value">{new Date(result.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrchestrationResults;
