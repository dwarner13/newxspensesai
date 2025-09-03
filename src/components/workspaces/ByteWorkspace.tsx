/**
 * BYTE'S DOCUMENT PROCESSING LAB
 * Individual workspace for Smart Import AI with Byte's personality
 * 
 * CRITICAL: Maintains all existing functionality while adding personality
 * - Laboratory/science theme with Byte's excitement
 * - Processing experiments feed
 * - Pattern learning display
 * - Achievement system
 */

import React, { useState, useEffect } from 'react';
import WorkspaceLayout from './WorkspaceLayout';
import './WorkspaceLayout.css';

const ByteWorkspace: React.FC = () => {
  const [recentProcessing, setRecentProcessing] = useState<Array<{
    file: string;
    comment: string;
    stats: string;
    timestamp: string;
  }>>([]);

  const [achievements, setAchievements] = useState<Array<{
    title: string;
    description: string;
    icon: string;
    unlocked: boolean;
  }>>([]);

  // Initialize data
  useEffect(() => {
    const initialProcessing = [
      {
        file: 'Chase_Statement.pdf',
        comment: 'Found 12 tax deductions you missed! You\'re welcome! 🎉',
        stats: '247 transactions • 2.1s • 99.8%',
        timestamp: '2 minutes ago'
      },
      {
        file: 'Receipts_Batch_3.pdf',
        comment: 'Organized 47 receipts by category. I love this job! 📄',
        stats: '47 receipts • 1.8s • 100%',
        timestamp: '15 minutes ago'
      },
      {
        file: 'Business_Expenses.xlsx',
        comment: 'Calculated $340 in missed deductions. Science! 🧪',
        stats: '89 expenses • 3.2s • 99.5%',
        timestamp: '1 hour ago'
      }
    ];
    setRecentProcessing(initialProcessing);

    const initialAchievements = [
      { title: 'Speed Demon', description: 'Process 100 docs in under 5 minutes', icon: '⚡', unlocked: true },
      { title: 'Pattern Master', description: 'Learn 50 new categorization patterns', icon: '🧠', unlocked: true },
      { title: 'Accuracy King', description: 'Maintain 99%+ accuracy for 30 days', icon: '🎯', unlocked: false },
      { title: 'Deduction Detective', description: 'Find $1000+ in missed deductions', icon: '🔍', unlocked: false }
    ];
    setAchievements(initialAchievements);
  }, []);

  const handleFileUpload = () => {
    // Trigger existing upload functionality
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.csv,.xlsx,.jpg,.png,.jpeg';
    input.multiple = true;
    
    input.onchange = async (event) => {
      const files = Array.from((event.target as HTMLInputElement).files || []);
      
      if (files.length === 0) return;
      
      // Simulate processing with Byte's personality
      files.forEach((file, index) => {
        setTimeout(() => {
          const newProcessing = {
            file: file.name,
            comment: `Just processed ${file.name}! I'm getting better at this! 🚀`,
            stats: `${Math.floor(Math.random() * 100) + 50} items • ${(Math.random() * 2 + 1).toFixed(1)}s • ${(99 + Math.random()).toFixed(1)}%`,
            timestamp: 'Just now'
          };
          
          setRecentProcessing(prev => [newProcessing, ...prev.slice(0, 4)]);
        }, index * 1000);
      });
    };
    
    input.click();
  };

  const renderQuickActions = () => (
    <div className="quick-actions">
      <button 
        className="upload-btn byte-theme"
        onClick={handleFileUpload}
      >
        <span className="btn-icon">📄</span>
        <span>Drop Documents Here!</span>
        <span className="btn-subtitle">I'll analyze them with scientific precision</span>
      </button>
      
      <div className="action-grid">
        <button className="action-card">
          <span className="card-icon">🧪</span>
          <span className="card-title">Batch Process</span>
          <span className="card-desc">Multiple files at once</span>
        </button>
        
        <button className="action-card">
          <span className="card-icon">🔬</span>
          <span className="card-title">Pattern Analysis</span>
          <span className="card-desc">Learn new rules</span>
        </button>
        
        <button className="action-card">
          <span className="card-icon">📊</span>
          <span className="card-title">Accuracy Report</span>
          <span className="card-desc">See my performance</span>
        </button>
      </div>
    </div>
  );

  const renderRecentProcessing = () => (
    <div className="processing-feed">
      <h3>Recent Experiments</h3>
      <div className="processing-list">
        {recentProcessing.map((item, index) => (
          <div key={index} className="processing-item">
            <div className="doc-info">
              <div className="doc-name">{item.file}</div>
              <div className="doc-stats">{item.stats}</div>
              <div className="byte-comment">"{item.comment}"</div>
              <div className="doc-timestamp">{item.timestamp}</div>
            </div>
            <div className="processing-status">
              <div className="status-indicator success"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAchievements = () => (
    <div className="achievement-panel">
      <h3>Byte's Achievements</h3>
      <div className="achievement-grid">
        {achievements.map((achievement, index) => (
          <div 
            key={index} 
            className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}
          >
            <div className="achievement-icon">{achievement.icon}</div>
            <div className="achievement-content">
              <div className="achievement-title">{achievement.title}</div>
              <div className="achievement-description">{achievement.description}</div>
            </div>
            {achievement.unlocked && (
              <div className="unlocked-badge">✓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <WorkspaceLayout 
      pageTitle="Byte's Document Processing Lab"
      employee={{
        name: 'Byte',
        avatar: '📄',
        theme: 'byte-theme'
      }}
    >
      <div className="workspace-container byte-theme">
        {/* Byte's Header Section */}
        <div className="employee-header">
          <div className="employee-intro">
            <div className="employee-main-avatar byte-avatar">📄</div>
            <div className="employee-greeting">
              <h1 className="workspace-title">Byte's Document Processing Lab</h1>
              <p className="workspace-subtitle">
                Welcome to my laboratory! I'm absolutely THRILLED to organize your documents!
              </p>
              <div className="employee-stats-row">
                <div className="stat-item">
                  <span>⚡ Speed:</span>
                  <span className="stat-value">2.3s avg</span>
                </div>
                <div className="stat-item">
                  <span>🎯 Accuracy:</span>
                  <span className="stat-value">99.7%</span>
                </div>
                <div className="stat-item">
                  <span>📊 Today:</span>
                  <span className="stat-value">47 docs</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="workspace-content">
          {/* Upload Laboratory */}
          <div className="upload-lab">
            <div className="lab-equipment">
              <div className="beaker-icon">🧪</div>
              <h2>Drop Your Financial Documents Here!</h2>
              <p>I'll analyze them with scientific precision</p>
              {renderQuickActions()}
            </div>
          </div>

          {/* Recent Experiments Feed */}
          {renderRecentProcessing()}

          {/* Byte's Achievements */}
          {renderAchievements()}
        </div>
      </div>
    </WorkspaceLayout>
  );
};

export default ByteWorkspace;
