import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Settings, ChevronDown, ChevronRight } from 'lucide-react';
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
      id: 'cheerleaders',
      title: 'FINANCIAL CHEERLEADERS',
      isCollapsed: false,
      employees: [
        { id: 'spark', name: 'Spark', emoji: '⚡', status: 'online', activity: 'Energetic & Motivational', category: 'cheerleaders' },
        { id: 'wisdom', name: 'Wisdom', emoji: '🧠', status: 'online', activity: 'Wise & Analytical', category: 'cheerleaders' },
        { id: 'serenity', name: 'Serenity', emoji: '🌙', status: 'away', activity: 'Empathetic & Supportive', category: 'cheerleaders' },
        { id: 'fortune', name: 'Fortune', emoji: '💰', status: 'online', activity: 'Direct & Honest', category: 'cheerleaders' },
        { id: 'nova', name: 'Nova', emoji: '🌱', status: 'online', activity: 'Creative & Innovative', category: 'cheerleaders' },
        { id: 'harmony', name: 'Harmony', emoji: '🧘', status: 'away', activity: 'Mindful & Balanced', category: 'cheerleaders' }
      ]
    },
    {
      id: 'roasters',
      title: 'REALITY CHECKERS',
      isCollapsed: false,
      employees: [
        { id: 'roast-master', name: 'Roast Master', emoji: '🔥', status: 'online', activity: 'Brutally Honest', category: 'roasters' },
        { id: 'savage-sally', name: 'Savage Sally', emoji: '💅', status: 'online', activity: 'Sassy & Direct', category: 'roasters' },
        { id: 'truth-bomber', name: 'Truth Bomber', emoji: '💣', status: 'away', activity: 'Explosive & Direct', category: 'roasters' },
        { id: 'reality-checker', name: 'Reality Checker', emoji: '🔍', status: 'online', activity: 'Analytical & Critical', category: 'roasters' },
        { id: 'savage-sam', name: 'Savage Sam', emoji: '😈', status: 'online', activity: 'Devilishly Honest', category: 'roasters' },
        { id: 'roast-queen', name: 'Roast Queen', emoji: '👑', status: 'away', activity: 'Regally Savage', category: 'roasters' }
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
    { id: 2, timestamp: '5 min ago', activity: 'Spark celebrated your savings goal' },
    { id: 3, timestamp: '12 min ago', activity: 'Crystal detected spending pattern' },
    { id: 4, timestamp: '18 min ago', activity: 'Roast Master gave reality check' },
    { id: 5, timestamp: '25 min ago', activity: 'Ledger found tax deduction' }
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

  return (
    <div className="ai-team-sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-title">Your AI Team</div>
        <div className="sidebar-controls">
          <button className="control-btn">
            <Search size={16} />
          </button>
          <button className="control-btn">
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Recent History */}
      <div className="history-section">
        <div className="section-label">
          <span className="section-name">Recent History</span>
          <span className="section-count">{recentHistory.length}</span>
        </div>
        
        <div className="history-list">
          {recentHistory.map((item) => (
            <motion.div
              key={item.id}
              className="history-item"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="history-timestamp">{item.timestamp}</div>
              <div className="history-activity">{item.activity}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* AI Team Sections */}
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
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AITeamSidebar;
