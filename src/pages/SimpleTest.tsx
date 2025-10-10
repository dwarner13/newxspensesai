/**
 * Ultra Simple Test Page
 * =====================
 * Minimal page to test if React routing works
 */

import React from 'react';

export default function SimpleTest() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🎉 Simple Test Page Working!</h1>
      <p>If you can see this, the React app is running correctly.</p>
      
      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h2>Next Steps:</h2>
        <ol>
          <li>✅ React is working</li>
          <li>✅ Routing is working</li>
          <li>🎯 Test chat system</li>
        </ol>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <a href="/" style={{ color: '#0066cc', textDecoration: 'underline' }}>
          ← Back to Home
        </a>
      </div>
    </div>
  );
}
