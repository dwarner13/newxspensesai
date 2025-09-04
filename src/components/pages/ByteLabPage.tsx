import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
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
          <motion.div 
            className="byte-header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="byte-intro">
              <motion.div 
                className="byte-main-avatar"
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [-5, 5, -5]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                📄
              </motion.div>
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
          </motion.div>

          {/* Content Grid */}
          <div className="workspace-content">
            {/* Left: Main Upload Area */}
            <div>
              {/* Upload Lab */}
              <motion.div 
                className={`upload-lab ${dragOver ? 'drag-over' : ''} ${isUploadActive ? 'active' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
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
                  <motion.div 
                    className="beaker-icon"
                    animate={{ y: [0, -15, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    🧪
                  </motion.div>
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
              </motion.div>

              {/* Recent Processing Feed */}
              <motion.div 
                className="processing-feed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="feed-header">
                  <div className="feed-title">📚 Recent Experiments</div>
                  <span style={{ color: '#00ff88', fontSize: '0.875rem' }}>All successful!</span>
                </div>

                {recentProcessing.map((item, index) => (
                  <motion.div 
                    key={item.id}
                    className="processing-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                  >
                    <div className="doc-icon">{getDocIcon(item.type)}</div>
                    <div className="doc-info">
                      <div className="doc-name">{item.name}</div>
                      <div className="doc-stats">{item.transactions} transactions • {item.time} • {item.accuracy} accuracy</div>
                      <div className="byte-comment">"{item.comment}"</div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Right Panel */}
            <div className="right-panel">
              {/* Byte's Achievements */}
              <motion.div 
                className="byte-card"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="card-title">
                  <span>🏆</span>
                  <span>My Achievements</span>
                </div>
                <div className="achievement-grid">
                  {achievements.map((achievement) => (
                    <motion.div 
                      key={achievement.id}
                      className={`achievement ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="achievement-icon">{achievement.icon}</div>
                      <div className="achievement-label">{achievement.label}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Patterns I've Learned */}
              <motion.div 
                className="byte-card"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="card-title">
                  <span>🧠</span>
                  <span>Patterns I've Learned</span>
                </div>
                <div className="pattern-list">
                  {patterns.map((pattern, index) => (
                    <motion.div 
                      key={index}
                      className="pattern-item"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                    >
                      <span className="pattern-icon">✓</span>
                      <span className="pattern-text">{pattern}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Daily Progress */}
              <motion.div 
                className="byte-card"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className="card-title">
                  <span>📈</span>
                  <span>Today's Progress</span>
                </div>
                <div className="progress-indicator">
                  <div className="progress-label">Daily Goal: 100 documents</div>
                  <div className="progress-bar">
                    <motion.div 
                      className="progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: '73%' }}
                      transition={{ duration: 1, delay: 0.8 }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '1rem', textAlign: 'center', color: '#00ff88', fontWeight: '600' }}>
                  73/100 - Almost there!
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Floating Byte Chat */}
        <motion.div 
          className="byte-chat"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <motion.div 
            className="chat-bubble"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            Ask me anything!
          </motion.div>
          <span>💬</span>
        </motion.div>
      </div>
    </div>
  );
};

export default ByteLabPage;
