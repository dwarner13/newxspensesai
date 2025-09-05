import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import './AITeamSidebar.css';

interface AIEmployee {
  id: string;
  name: string;
  emoji: string;
  status: 'online' | 'away' | 'offline';
  activity: string;
  category: string;
}

interface CollapsibleSection {
  id: string;
  title: string;
  employees: AIEmployee[];
  isCollapsed: boolean;
}

const AITeamSidebar: React.FC = () => {
  const [sections, setSections] = useState<CollapsibleSection[]>([
    {
      id: 'executive',
      title: 'EXECUTIVE',
      isCollapsed: false,
      employees: [
        { id: 'prime', name: 'Prime', emoji: '👑', status: 'online', activity: 'Orchestrating your empire', category: 'executive' }
      ]
    },
    {
      id: 'core',
      title: 'CORE AI EMPLOYEES',
      isCollapsed: false,
      employees: [
        { id: 'finley', name: 'Finley', emoji: '💼', status: 'online', activity: 'Personal Finance AI', category: 'core' },
        { id: 'byte', name: 'Byte', emoji: '📄', status: 'online', activity: 'Smart Import AI', category: 'core' },
        { id: 'goalie', name: 'Goalie', emoji: '🥅', status: 'online', activity: 'AI Goal Concierge', category: 'core' },
        { id: 'crystal', name: 'Crystal', emoji: '🔮', status: 'away', activity: 'Spending Predictions', category: 'core' },
        { id: 'tag', name: 'Tag', emoji: '🏷️', status: 'online', activity: 'AI Categorization', category: 'core' },
        { id: 'liberty', name: 'Liberty', emoji: '🗽', status: 'online', activity: 'AI Financial Freedom', category: 'core' },
        { id: 'chime', name: 'Chime', emoji: '🔔', status: 'online', activity: 'Bill Reminder System', category: 'core' },
        { id: 'blitz', name: 'Blitz', emoji: '⚡', status: 'online', activity: 'Debt Payoff Planner', category: 'core' },
        { id: 'dj-zen', name: 'DJ Zen', emoji: '🎧', status: 'away', activity: 'Audio Entertainment', category: 'core' },
        { id: 'roundtable', name: 'The Roundtable', emoji: '🎙️', status: 'online', activity: 'Personal Podcast', category: 'core' },
        { id: 'ledger', name: 'Ledger', emoji: '📊', status: 'online', activity: 'Tax Assistant', category: 'core' },
        { id: 'intelia', name: 'Intelia', emoji: '🧠', status: 'online', activity: 'Business Intelligence', category: 'core' },
        { id: 'automa', name: 'Automa', emoji: '⚙️', status: 'away', activity: 'Smart Automation', category: 'core' },
        { id: 'dash', name: 'Dash', emoji: '📈', status: 'online', activity: 'Analytics', category: 'core' },
        { id: 'custodian', name: 'Custodian', emoji: '🔐', status: 'online', activity: 'Settings', category: 'core' },
        { id: 'wave', name: 'Wave', emoji: '🌊', status: 'away', activity: 'Spotify Integration', category: 'core' },
        { id: 'harmony-studio', name: 'Harmony', emoji: '🎵', status: 'online', activity: 'Financial Wellness Studio', category: 'core' }
      ]
    }
  ]);

  const [recentHistory] = useState([
    { id: 1, timestamp: '2 min ago', activity: 'Byte processed 3 documents' },
    { id: 2, timestamp: '5 min ago', activity: 'Crystal detected spending pattern' },
    { id: 3, timestamp: '12 min ago', activity: 'Ledger found tax deduction' },
    { id: 4, timestamp: '18 min ago', activity: 'Tag categorized transactions' },
    { id: 5, timestamp: '25 min ago', activity: 'Finley analyzed spending trends' }
  ]);

  const toggleSection = (sectionId: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, isCollapsed: !section.isCollapsed }
        : section
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#00ff88';
      case 'away': return '#ffaa00';
      case 'offline': return 'rgba(255, 255, 255, 0.3)';
      default: return 'rgba(255, 255, 255, 0.3)';
    }
  };

  const handleEmployeeAction = (employeeId: string, status: string) => {
    if (status === 'online') {
      // Employee is already following/active
      console.log(`Unfollowing ${employeeId}`);
      // Here you would implement the unfollow logic
    } else {
      // Employee needs to be hired
      console.log(`Hiring ${employeeId}`);
      // Here you would implement the hire logic
      // This could open a modal, redirect to a service page, etc.
    }
  };

  return (
    <div className="ai-team-sidebar">

      {/* Recent Activity - Now at the top and always visible */}
      <div className="recent-activity-section">
        <div className="section-label">
          <span className="section-name">Live Activity</span>
          <span className="section-count">{recentHistory.length}</span>
        </div>
        
        <div className="activity-list">
          {recentHistory.map((item) => (
            <motion.div
              key={item.id}
              className="activity-item"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="activity-timestamp">{item.timestamp}</div>
              <div className="activity-text">{item.activity}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* AI Team Sections - Compact with separate scroll */}
      <div className="team-sections-container">
        <div className="team-sections">
          {sections.map((section) => (
            <div key={section.id} className="team-section">
              <motion.button
                className="section-header"
                onClick={() => toggleSection(section.id)}
                whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="section-title">
                  {section.title}
                  <span className="section-count">{section.employees.length}</span>
                </div>
                <motion.div
                  animate={{ rotate: section.isCollapsed ? 0 : 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight size={16} />
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {!section.isCollapsed && (
                  <motion.div
                    className="section-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    {section.employees.map((employee) => (
                      <motion.div
                        key={employee.id}
                        className="employee-item"
                        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="employee-avatar">
                          {employee.emoji}
                          <div 
                            className="status-dot"
                            style={{ backgroundColor: getStatusColor(employee.status) }}
                          />
                        </div>
                        <div className="employee-info">
                          <div className="employee-name">{employee.name}</div>
                          <div className="employee-activity">{employee.activity}</div>
                        </div>
                        <div className="employee-actions">
                          <button 
                            className={`action-btn ${employee.status === 'online' ? 'following' : 'hire'}`}
                            onClick={() => handleEmployeeAction(employee.id, employee.status)}
                          >
                            {employee.status === 'online' ? 'Following' : 'Hire'}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AITeamSidebar;
