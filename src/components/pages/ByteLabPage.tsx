import React, { useState, useRef } from 'react';
import './ByteLabPage.css';

interface ProcessingItem {
  id: string;
  name: string;
  type: 'pdf' | 'receipt' | 'csv';
  transactions: number;
  time: string;
  accuracy: string;
  comment: string;
}

interface Achievement {
  id: string;
  icon: string;
  label: string;
  unlocked: boolean;
}

const ByteLabPage: React.FC = () => {
  const [isUploadActive, setIsUploadActive] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const achievements: Achievement[] = [
    { id: 'speed', icon: '⚡', label: 'Speed Demon', unlocked: true },
    { id: 'accuracy', icon: '🎯', label: 'Accuracy Pro', unlocked: true },
    { id: 'docs', icon: '📚', label: '1K Docs', unlocked: true },
    { id: 'tax', icon: '💎', label: 'Tax Master', unlocked: true },
    { id: 'streak', icon: '🔥', label: 'Hot Streak', unlocked: true },
    { id: 'king', icon: '👑', label: 'Doc King', unlocked: true },
  ];

  const recentProcessing: ProcessingItem[] = [
    {
      id: '1',
      name: 'Chase_Statement_Feb2024.pdf',
      type: 'pdf',
      transactions: 247,
      time: '2.1s',
      accuracy: '99.8%',
      comment: 'Found 12 tax deductions you missed! You\'re welcome! 🎉'
    },
    {
      id: '2',
      name: 'Starbucks_Receipts_Batch.zip',
      type: 'receipt',
      transactions: 23,
      time: '1.8s',
      accuracy: '100%',
      comment: 'All categorized as Business Meetings, as you taught me!'
    },
    {
      id: '3',
      name: 'Q4_Expenses.csv',
      type: 'csv',
      transactions: 892,
      time: '3.2s',
      accuracy: '99.7%',
      comment: 'This was a feast! Found patterns Tag will love!'
    }
  ];

  const patterns = [
    'Starbucks = Business',
    'Uber after 10pm = Personal',
    'Amazon = Check manually',
    'Whole Foods = Groceries'
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setIsUploadActive(true);
    
    const files = Array.from(e.dataTransfer.files);
    // Handle file upload logic here
    console.log('Files dropped:', files);
    
    // Simulate processing
    setTimeout(() => {
      setIsUploadActive(false);
    }, 3000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setIsUploadActive(true);
      // Handle file upload logic here
      console.log('Files selected:', files);
      
      // Simulate processing
      setTimeout(() => {
        setIsUploadActive(false);
      }, 3000);
    }
  };

  const handleQuickUpload = (type: string) => {
    fileInputRef.current?.click();
  };

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'pdf': return '📄';
      case 'receipt': return '🧾';
      case 'csv': return '📊';
      default: return '📄';
    }
  };

  return (
    <div className="byte-lab-page">
      <div className="page-container">
        {/* Main Workspace */}
        <div className="main-workspace">
          {/* Byte's Header */}
          <div 
            className="byte-header"
          >
            <div className="byte-intro">
              <div 
                className="byte-main-avatar"
              >
                📄
              </div>
              <div className="byte-greeting">
                <h1 className="page-title">Byte's Document Processing Lab</h1>
                <p className="page-subtitle">Welcome to my laboratory! I'm absolutely THRILLED to organize your documents!</p>
                <div className="byte-stats-row">
                  <div className="byte-stat">
                    <span>⚡ Speed:</span>
                    <span className="stat-value">2.3s avg</span>
                  </div>
                  <div className="byte-stat">
                    <span>🎯 Accuracy:</span>
                    <span className="stat-value">99.7%</span>
                  </div>
                  <div className="byte-stat">
                    <span>📊 Today:</span>
                    <span className="stat-value">47 docs</span>
                  </div>
                  <div className="byte-stat">
                    <span>🏆 Level:</span>
                    <span className="stat-value">8</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="workspace-content">
            {/* Left: Main Upload Area */}
            <div>
              {/* Upload Lab */}
              <div 
                className={`upload-lab ${dragOver ? 'drag-over' : ''} ${isUploadActive ? 'active' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.csv,.xlsx,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <div className="lab-equipment">
                  <div 
                    className="beaker-icon"
                  >
                    🧪
                  </div>
                  <div className="upload-message">
                    {isUploadActive ? 'Processing your documents...' : 'Drop Your Financial Documents Here!'}
                  </div>
                  <div className="upload-detail">
                    {isUploadActive 
                      ? 'Byte is analyzing with scientific precision...' 
                      : 'I\'ll analyze them with scientific precision and extract every valuable insight'
                    }
                  
                    {!isUploadActive && (
                      <div className="quick-upload-grid">
                        <div className="upload-option" onClick={(e) => { e.stopPropagation(); handleQuickUpload('scan'); }}>
                          <span>📸</span>
                          <span>Scan Receipt</span>
                        </div>
                        <div className="upload-option" onClick={(e) => { e.stopPropagation(); handleQuickUpload('bank'); }}>
                          <span>🏦</span>
                          <span>Bank Statement</span>
                        </div>
                        <div className="upload-option" onClick={(e) => { e.stopPropagation(); handleQuickUpload('batch'); }}>
                          <span>📁</span>
                          <span>Batch Upload</span>
                        </div>
                        <div className="upload-option" onClick={(e) => { e.stopPropagation(); handleQuickUpload('csv'); }}>
                          <span>📊</span>
                          <span>Import CSV</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Processing Feed */}
              <div 
                className="processing-feed"
              >
                <div className="feed-header">
                  <div className="feed-title">📚 Recent Experiments</div>
                  <span style={{ color: '#00ff88', fontSize: '0.875rem' }}>All successful!</span>
                </div>

                {recentProcessing.map((item, index) => (
                  <div 
                    key={item.id}
                    className="processing-item"
                  >
                    <div className="doc-icon">{getDocIcon(item.type)}</div>
                    <div className="doc-info">
                      <div className="doc-name">{item.name}</div>
                      <div className="doc-stats">{item.transactions} transactions • {item.time} • {item.accuracy} accuracy</div>
                      <div className="byte-comment">"{item.comment}"</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Panel */}
            <div className="right-panel">
              {/* Byte's Achievements */}
              <div 
                className="byte-card"
              >
                <div className="card-title">
                  <span>🏆</span>
                  <span>My Achievements</span>
                </div>
                <div className="achievement-grid">
                  {achievements.map((achievement) => (
                    <div 
                      key={achievement.id}
                      className={`achievement ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="achievement-icon">{achievement.icon}</div>
                      <div className="achievement-label">{achievement.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Patterns I've Learned */}
              <div 
                className="byte-card"
              >
                <div className="card-title">
                  <span>🧠</span>
                  <span>Patterns I've Learned</span>
                </div>
                <div className="pattern-list">
                  {patterns.map((pattern, index) => (
                    <div 
                      key={index}
                      className="pattern-item"
                    >
                      <span className="pattern-icon">✓</span>
                      <span className="pattern-text">{pattern}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Progress */}
              <div 
                className="byte-card"
              >
                <div className="card-title">
                  <span>📈</span>
                  <span>Today's Progress</span>
                </div>
                <div className="progress-indicator">
                  <div className="progress-label">Daily Goal: 100 documents</div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                    />
                  </div>
                </div>
                <div style={{ marginTop: '1rem', textAlign: 'center', color: '#00ff88', fontWeight: '600' }}>
                  73/100 - Almost there!
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Byte Chat */}
        <div 
          className="byte-chat"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <div 
            className="chat-bubble"
          >
            Ask me anything!
          </div>
          <span>💬</span>
        </div>
      </div>
    </div>
  );
};

export default ByteLabPage;
