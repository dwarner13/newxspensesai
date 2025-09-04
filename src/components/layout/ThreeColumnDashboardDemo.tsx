/**
 * THREE-COLUMN DASHBOARD DEMO
 * Demo component to showcase the new three-column layout
 */

import React from 'react';
import ThreeColumnDashboard from './ThreeColumnDashboard';

const ThreeColumnDashboardDemo: React.FC = () => {
  return (
    <ThreeColumnDashboard
      showDiscoveryTicker={true}
      showToolCards={true}
      showHeroCard={true}
    >
      {/* Additional custom content can go here */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.03)', 
        border: '1px solid rgba(255, 255, 255, 0.08)', 
        borderRadius: '12px', 
        padding: '2rem',
        marginTop: '2rem'
      }}>
        <h3 style={{ marginBottom: '1rem', color: '#fff' }}>
          🎉 Welcome to the New Three-Column Dashboard!
        </h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.6' }}>
          This is a demo of the new professional three-column layout. The left sidebar contains navigation, 
          the main content area shows your dashboard, and the right sidebar displays your AI team. 
          Try resizing your browser to see the responsive design in action!
        </p>
      </div>
    </ThreeColumnDashboard>
  );
};

export default ThreeColumnDashboardDemo;
