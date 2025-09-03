/**
 * TAG'S CATEGORIZATION WORKSHOP
 * Individual workspace for AI Categorization with Tag's teaching personality
 * 
 * CRITICAL: Maintains all existing functionality while adding personality
 * - Teaching/learning theme with Tag's enthusiasm
 * - Interactive category tree visualization
 * - Pattern learning interface
 * - Teaching achievements
 */

import React, { useState, useEffect } from 'react';
import WorkspaceLayout from './WorkspaceLayout';
import './WorkspaceLayout.css';

const TagWorkspace: React.FC = () => {
  const [patternsLearned, setPatternsLearned] = useState<Array<{
    pattern: string;
    category: string;
    confidence: number;
    examples: number;
  }>>([]);

  const [categoryTree, setCategoryTree] = useState<Array<{
    category: string;
    subcategories: string[];
    count: number;
    color: string;
  }>>([]);

  const [teachingStats, setTeachingStats] = useState({
    patternsLearned: 47,
    accuracy: 94.2,
    categories: 23
  });

  // Initialize data
  useEffect(() => {
    const initialPatterns = [
      { pattern: 'Uber = Transport', category: 'Transportation', confidence: 98, examples: 23 },
      { pattern: 'Starbucks = Food & Dining', category: 'Food & Dining', confidence: 95, examples: 15 },
      { pattern: 'Amazon = Shopping', category: 'Shopping', confidence: 92, examples: 31 },
      { pattern: 'Netflix = Entertainment', category: 'Entertainment', confidence: 89, examples: 8 }
    ];
    setPatternsLearned(initialPatterns);

    const initialCategoryTree = [
      { category: 'Food & Dining', subcategories: ['Restaurants', 'Groceries', 'Coffee'], count: 45, color: '#ff6b6b' },
      { category: 'Transportation', subcategories: ['Gas', 'Rideshare', 'Public Transit'], count: 32, color: '#4ecdc4' },
      { category: 'Shopping', subcategories: ['Online', 'Retail', 'Clothing'], count: 28, color: '#45b7d1' },
      { category: 'Entertainment', subcategories: ['Streaming', 'Movies', 'Games'], count: 19, color: '#96ceb4' }
    ];
    setCategoryTree(initialCategoryTree);
  }, []);

  const handleTeachPattern = () => {
    // Simulate teaching a new pattern
    const newPattern = {
      pattern: 'New Pattern',
      category: 'New Category',
      confidence: Math.floor(Math.random() * 20) + 80,
      examples: Math.floor(Math.random() * 10) + 1
    };
    
    setPatternsLearned(prev => [newPattern, ...prev.slice(0, 9)]);
    setTeachingStats(prev => ({
      ...prev,
      patternsLearned: prev.patternsLearned + 1
    }));
  };

  const renderCategoryTree = () => (
    <div className="category-tree-visual">
      <h3>Category Tree</h3>
      <div className="tree-container">
        {categoryTree.map((category, index) => (
          <div key={index} className="category-branch">
            <div 
              className="category-node"
              style={{ backgroundColor: category.color }}
            >
              <div className="category-name">{category.category}</div>
              <div className="category-count">{category.count}</div>
            </div>
            <div className="subcategory-list">
              {category.subcategories.map((sub, subIndex) => (
                <div key={subIndex} className="subcategory-item">
                  {sub}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPatternsLearned = () => (
    <div className="patterns-learned">
      <h3>Patterns I've Learned</h3>
      <div className="patterns-list">
        {patternsLearned.map((pattern, index) => (
          <div key={index} className="pattern-item">
            <div className="pattern-content">
              <div className="pattern-rule">
                <span className="pattern-text">{pattern.pattern}</span>
                <span className="pattern-arrow">→</span>
                <span className="pattern-category">{pattern.category}</span>
              </div>
              <div className="pattern-stats">
                <span className="confidence">Confidence: {pattern.confidence}%</span>
                <span className="examples">Examples: {pattern.examples}</span>
              </div>
            </div>
            <div className="pattern-confidence-bar">
              <div 
                className="confidence-fill"
                style={{ width: `${pattern.confidence}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTeachingInterface = () => (
    <div className="teaching-interface">
      <h3>Teach Me Something New!</h3>
      <div className="teaching-form">
        <div className="form-group">
          <label>Transaction Pattern</label>
          <input type="text" placeholder="e.g., 'Uber' or 'Starbucks'" />
        </div>
        <div className="form-group">
          <label>Should be categorized as</label>
          <select>
            <option>Food & Dining</option>
            <option>Transportation</option>
            <option>Shopping</option>
            <option>Entertainment</option>
          </select>
        </div>
        <button className="teach-btn" onClick={handleTeachPattern}>
          <span className="btn-icon">🎓</span>
          Teach Me This Pattern!
        </button>
      </div>
    </div>
  );

  return (
    <WorkspaceLayout 
      pageTitle="Tag's Categorization Workshop"
      employee={{
        name: 'Tag',
        avatar: '🏷️',
        theme: 'tag-theme'
      }}
    >
      <div className="workspace-container tag-theme">
        {/* Tag's Header Section */}
        <div className="employee-header">
          <div className="employee-intro">
            <div className="employee-main-avatar tag-avatar">🏷️</div>
            <div className="employee-greeting">
              <h1 className="workspace-title">Tag's Categorization Workshop</h1>
              <p className="workspace-subtitle">
                Teaching me makes us both smarter! I love learning new patterns!
              </p>
              <div className="employee-stats-row">
                <div className="stat-item">
                  <span>🧠 Patterns:</span>
                  <span className="stat-value">{teachingStats.patternsLearned}</span>
                </div>
                <div className="stat-item">
                  <span>🎯 Accuracy:</span>
                  <span className="stat-value">{teachingStats.accuracy}%</span>
                </div>
                <div className="stat-item">
                  <span>📂 Categories:</span>
                  <span className="stat-value">{teachingStats.categories}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="workspace-content">
          {/* Teaching Interface */}
          {renderTeachingInterface()}

          {/* Category Tree Visualization */}
          {renderCategoryTree()}

          {/* Patterns Learned */}
          {renderPatternsLearned()}
        </div>
      </div>
    </WorkspaceLayout>
  );
};

export default TagWorkspace;
