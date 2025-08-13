# XspensesAI Design System - PROTECTED

## 🛡️ IMPORTANT: DO NOT MODIFY THIS DESIGN SYSTEM

This design system is **PROTECTED** and should not be modified without proper approval. All changes must go through the design review process.

## 📋 Table of Contents

1. [Core Theme Variables](#core-theme-variables)
2. [Layout Components](#layout-components)
3. [Card Components](#card-components)
4. [Typography](#typography)
5. [Buttons](#buttons)
6. [Grid System](#grid-system)
7. [Status Indicators](#status-indicators)
8. [Utility Classes](#utility-classes)
9. [Usage Guidelines](#usage-guidelines)

## 🎨 Core Theme Variables

### Background Colors
```css
--xspenses-bg-primary: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%);
--xspenses-bg-card: rgba(30, 27, 75, 0.6);
--xspenses-bg-sidebar: rgba(30, 27, 75, 0.95);
```

### Text Colors
```css
--xspenses-text-primary: #ffffff;      /* Main text */
--xspenses-text-secondary: #e2e8f0;    /* Secondary text */
--xspenses-text-muted: #a78bfa;        /* Muted/accent text */
```

### Layout Dimensions
```css
--xspenses-sidebar-width: 280px;
--xspenses-border-radius: 16px;
--xspenses-card-padding: 24px;
--xspenses-grid-gap: 24px;
```

### Effects
```css
--xspenses-border: 1px solid rgba(255, 255, 255, 0.1);
--xspenses-backdrop-blur: blur(20px);
--xspenses-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
--xspenses-gradient: linear-gradient(45deg, #8b5cf6, #06b6d4);
```

## 🏗️ Layout Components

### Dashboard Container
```html
<div class="xspenses-dashboard-container">
  <!-- Your dashboard content -->
</div>
```

### Sidebar
```html
<div class="xspenses-sidebar">
  <!-- Sidebar content -->
</div>
```

### Main Content
```html
<div class="xspenses-main-content">
  <!-- Main content area -->
</div>
```

## 🃏 Card Components

### Basic Card
```html
<div class="xspenses-card">
  <h2 class="xspenses-title">Card Title</h2>
  <p class="xspenses-text">Card content goes here</p>
</div>
```

## 📝 Typography

### Title
```html
<h1 class="xspenses-title">Main Title</h1>
```

### Subtitle
```html
<h2 class="xspenses-subtitle">Subtitle Text</h2>
```

### Body Text
```html
<p class="xspenses-text">Regular body text content</p>
```

## 🔘 Buttons

### Primary Button
```html
<button class="xspenses-button">Click Me</button>
```

## 📐 Grid System

### 2-Column Grid
```html
<div class="xspenses-grid xspenses-grid-2">
  <div>Column 1</div>
  <div>Column 2</div>
</div>
```

### 3-Column Grid
```html
<div class="xspenses-grid xspenses-grid-3">
  <div>Column 1</div>
  <div>Column 2</div>
  <div>Column 3</div>
</div>
```

### 4-Column Grid
```html
<div class="xspenses-grid xspenses-grid-4">
  <div>Column 1</div>
  <div>Column 2</div>
  <div>Column 3</div>
  <div>Column 4</div>
</div>
```

## 🟢 Status Indicators

### Online Status
```html
<span class="xspenses-status-online">
  <span class="xspenses-status-dot online"></span>
  Online
</span>
```

### Offline Status
```html
<span class="xspenses-status-offline">
  <span class="xspenses-status-dot offline"></span>
  Offline
</span>
```

## 🛠️ Utility Classes

### Display
```html
<div class="xspenses-hidden">Hidden content</div>
<div class="xspenses-visible">Visible content</div>
```

### Text Alignment
```html
<p class="xspenses-text-center">Centered text</p>
<p class="xspenses-text-left">Left aligned text</p>
<p class="xspenses-text-right">Right aligned text</p>
```

### Spacing
```html
<!-- Margin Top -->
<div class="xspenses-mt-0">No top margin</div>
<div class="xspenses-mt-4">1rem top margin</div>

<!-- Margin Bottom -->
<div class="xspenses-mb-0">No bottom margin</div>
<div class="xspenses-mb-4">1rem bottom margin</div>

<!-- Padding -->
<div class="xspenses-p-0">No padding</div>
<div class="xspenses-p-4">1rem padding</div>
```

## 📱 Responsive Design

The design system automatically handles responsive behavior:

- **Desktop**: Full sidebar and multi-column grids
- **Mobile**: Collapsible sidebar and single-column grids
- **Breakpoint**: 768px

## 🚫 Usage Guidelines

### ✅ DO:
- Use the provided CSS classes and variables
- Follow the established patterns
- Test on both desktop and mobile
- Maintain consistency across components

### ❌ DON'T:
- Modify the design system CSS directly
- Create custom colors that don't match the theme
- Override the protected styles with `!important`
- Use hardcoded values instead of CSS variables

## 🔧 Implementation Example

```html
<div class="xspenses-dashboard-container">
  <!-- Sidebar -->
  <div class="xspenses-sidebar">
    <div class="xspenses-card">
      <h2 class="xspenses-title">Navigation</h2>
      <p class="xspenses-text">Sidebar content</p>
    </div>
  </div>
  
  <!-- Main Content -->
  <div class="xspenses-main-content">
    <h1 class="xspenses-title">Dashboard</h1>
    
    <div class="xspenses-grid xspenses-grid-2">
      <div class="xspenses-card">
        <h3 class="xspenses-subtitle">Card 1</h3>
        <p class="xspenses-text">Content here</p>
        <button class="xspenses-button">Action</button>
      </div>
      
      <div class="xspenses-card">
        <h3 class="xspenses-subtitle">Card 2</h3>
        <p class="xspenses-text">More content</p>
      </div>
    </div>
  </div>
</div>
```

## 📞 Support

If you need to make changes to the design system:
1. Create a design system change request
2. Get approval from the design team
3. Update this documentation
4. Test thoroughly before deployment

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Maintainer**: XspensesAI Design Team 