/**
 * CRYSTAL'S PREDICTION PARLOR
 * Individual workspace for Spending Predictions with Crystal's mystical personality
 * 
 * CRITICAL: Maintains all existing functionality while adding personality
 * - Mystical/fortune teller theme with Crystal's wisdom
 * - Crystal ball interface for predictions
 * - Forecast timeline visualization
 * - Prediction accuracy tracking
 */

import React, { useState, useEffect } from 'react';
import WorkspaceLayout from './WorkspaceLayout';
import './WorkspaceLayout.css';

const CrystalWorkspace: React.FC = () => {
  const [predictions, setPredictions] = useState<Array<{
    type: string;
    prediction: string;
    confidence: number;
    timeframe: string;
    icon: string;
  }>>([]);

  const [forecastTimeline, setForecastTimeline] = useState<Array<{
    date: string;
    prediction: string;
    amount: string;
    confidence: number;
    trend: 'up' | 'down' | 'stable';
  }>>([]);

  const [crystalBallState, setCrystalBallState] = useState<'idle' | 'reading' | 'revealing'>('idle');

  // Initialize data
  useEffect(() => {
    const initialPredictions = [
      {
        type: 'Spending Spike',
        prediction: 'Tuesday spending will be 23% higher than usual',
        confidence: 87,
        timeframe: 'Next Tuesday',
        icon: '📈'
      },
      {
        type: 'Budget Alert',
        prediction: 'You\'ll exceed dining budget by $45 this month',
        confidence: 92,
        timeframe: 'This month',
        icon: '⚠️'
      },
      {
        type: 'Savings Opportunity',
        prediction: 'You could save $127 by reducing coffee purchases',
        confidence: 78,
        timeframe: 'Next 30 days',
        icon: '💰'
      }
    ];
    setPredictions(initialPredictions);

    const initialTimeline = [
      { date: 'Today', prediction: 'Normal spending day', amount: '$45', confidence: 95, trend: 'stable' },
      { date: 'Tomorrow', prediction: 'Slight increase expected', amount: '$52', confidence: 88, trend: 'up' },
      { date: 'Tuesday', prediction: 'Spending spike predicted', amount: '$78', confidence: 87, trend: 'up' },
      { date: 'Wednesday', prediction: 'Return to normal', amount: '$43', confidence: 82, trend: 'down' },
      { date: 'Thursday', prediction: 'Steady spending', amount: '$47', confidence: 85, trend: 'stable' }
    ];
    setForecastTimeline(initialTimeline);
  }, []);

  const handleCrystalBallReading = () => {
    setCrystalBallState('reading');
    
    setTimeout(() => {
      setCrystalBallState('revealing');
      
      // Add new prediction
      const newPrediction = {
        type: 'New Insight',
        prediction: 'I see a great opportunity for savings in your future!',
        confidence: Math.floor(Math.random() * 20) + 80,
        timeframe: 'Next week',
        icon: '🔮'
      };
      
      setPredictions(prev => [newPrediction, ...prev.slice(0, 4)]);
      
      setTimeout(() => {
        setCrystalBallState('idle');
      }, 3000);
    }, 2000);
  };

  const renderCrystalBallInterface = () => (
    <div className="crystal-ball-interface">
      <div className="crystal-ball-container">
        <div 
          className={`crystal-ball ${crystalBallState}`}
          onClick={handleCrystalBallReading}
        >
          <div className="crystal-ball-inner">
            {crystalBallState === 'idle' && (
              <div className="crystal-message">
                <span className="crystal-icon">🔮</span>
                <span>Click to see the future...</span>
              </div>
            )}
            {crystalBallState === 'reading' && (
              <div className="crystal-message">
                <span className="crystal-icon spinning">🔮</span>
                <span>Reading the patterns...</span>
              </div>
            )}
            {crystalBallState === 'revealing' && (
              <div className="crystal-message">
                <span className="crystal-icon">✨</span>
                <span>I see... I see...</span>
              </div>
            )}
          </div>
        </div>
        <div className="crystal-ball-stand"></div>
      </div>
      
      <div className="crystal-controls">
        <button 
          className="crystal-btn"
          onClick={handleCrystalBallReading}
          disabled={crystalBallState !== 'idle'}
        >
          <span className="btn-icon">🔮</span>
          <span>Consult the Crystal</span>
        </button>
      </div>
    </div>
  );

  const renderPredictions = () => (
    <div className="predictions-panel">
      <h3>Crystal's Visions</h3>
      <div className="predictions-list">
        {predictions.map((prediction, index) => (
          <div key={index} className="prediction-item">
            <div className="prediction-header">
              <span className="prediction-icon">{prediction.icon}</span>
              <span className="prediction-type">{prediction.type}</span>
              <span className="prediction-timeframe">{prediction.timeframe}</span>
            </div>
            <div className="prediction-content">
              <p>{prediction.prediction}</p>
            </div>
            <div className="prediction-confidence">
              <span>Confidence: {prediction.confidence}%</span>
              <div className="confidence-bar">
                <div 
                  className="confidence-fill"
                  style={{ width: `${prediction.confidence}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderForecastTimeline = () => (
    <div className="forecast-timeline">
      <h3>7-Day Forecast</h3>
      <div className="timeline-container">
        {forecastTimeline.map((day, index) => (
          <div key={index} className="timeline-item">
            <div className="timeline-date">{day.date}</div>
            <div className="timeline-content">
              <div className="timeline-prediction">{day.prediction}</div>
              <div className="timeline-amount">{day.amount}</div>
            </div>
            <div className={`timeline-trend ${day.trend}`}>
              {day.trend === 'up' && '📈'}
              {day.trend === 'down' && '📉'}
              {day.trend === 'stable' && '➡️'}
            </div>
            <div className="timeline-confidence">
              {day.confidence}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <WorkspaceLayout 
      pageTitle="Crystal's Prediction Parlor"
      employee={{
        name: 'Crystal',
        avatar: '🔮',
        theme: 'crystal-theme'
      }}
    >
      <div className="workspace-container crystal-theme">
        {/* Crystal's Header Section */}
        <div className="employee-header">
          <div className="employee-intro">
            <div className="employee-main-avatar crystal-avatar">🔮</div>
            <div className="employee-greeting">
              <h1 className="workspace-title">Crystal's Prediction Parlor</h1>
              <p className="workspace-subtitle">
                The future of your finances is written in the patterns of the past...
              </p>
              <div className="employee-stats-row">
                <div className="stat-item">
                  <span>🔮 Predictions:</span>
                  <span className="stat-value">23 active</span>
                </div>
                <div className="stat-item">
                  <span>🎯 Accuracy:</span>
                  <span className="stat-value">89.3%</span>
                </div>
                <div className="stat-item">
                  <span>⏰ Horizon:</span>
                  <span className="stat-value">30 days</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="workspace-content">
          {/* Crystal Ball Interface */}
          {renderCrystalBallInterface()}

          {/* Predictions Panel */}
          {renderPredictions()}

          {/* Forecast Timeline */}
          {renderForecastTimeline()}
        </div>
      </div>
    </WorkspaceLayout>
  );
};

export default CrystalWorkspace;
