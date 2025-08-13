# XspensesAI Component Templates

## Dashboard Layout Template
```jsx
<div className="dashboard-container">
  <nav className="sidebar">
    {/* Sidebar content */}
  </nav>
  
  <main className="main-content">
    <header className="header">
      <h2>Page Title</h2>
      <p className="header-subtitle">Page description</p>
    </header>
    
    <div className="dashboard-grid">
      {/* Main content */}
    </div>
  </main>
</div>
```

## Card Component Template
```jsx
<div className="chart-container">
  <h3 className="chart-title">Card Title</h3>
  <div className="card-content">
    {/* Card content */}
  </div>
</div>
```

## Stats Card Template
```jsx
<div className="stat-card">
  <div className="stat-header">
    <div className="stat-title">Metric Name</div>
    <div className="stat-icon">🎯</div>
  </div>
  <div className="stat-value">$1,234</div>
  <div className="stat-change positive">+12%</div>
</div>
```

## Navigation Item Template
```jsx
<div className="nav-item">
  <div className="nav-icon">🎯</div>
  <div className="nav-text">Section Name</div>
  <div className="nav-description">Section description</div>
</div>
```

## Required CSS Classes

- `.dashboard-container` - Main layout wrapper
- `.sidebar` - Left navigation
- `.main-content` - Main content area
- `.chart-container` - Card wrapper
- `.stat-card` - Statistics card
- `.nav-item` - Navigation item
- `.header` - Page header 