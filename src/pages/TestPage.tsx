import React from 'react';

const TestPage = () => {
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#0f172a', 
      color: 'white', 
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#8b5cf6' }}>XspensesAI Test Page</h1>
      <p>If you can see this, the deployment is working!</p>
      <div style={{ 
        marginTop: '20px', 
        padding: '20px', 
        backgroundColor: '#1e293b', 
        borderRadius: '8px' 
      }}>
        <h2>Deployment Status:</h2>
        <ul>
          <li>✅ Build: Successful</li>
          <li>✅ Netlify: Deployed</li>
          <li>✅ GitHub: Synced</li>
          <li>✅ React: Working</li>
        </ul>
      </div>
    </div>
  );
};

export default TestPage;