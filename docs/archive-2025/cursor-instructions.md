# Cursor Development Instructions for XspensesAI

## CRITICAL RULES - NEVER BREAK THESE:

### 1. Color Scheme (NON-NEGOTIABLE)
- **Background**: ALWAYS use `linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)`
- **Cards**: ALWAYS use `rgba(30, 27, 75, 0.6)` background
- **Text**: ALWAYS use white/light colors (`#ffffff`, `#e2e8f0`, `#a78bfa`)
- **NEVER**: Use white backgrounds, dark text, or light themes

### 2. Layout Structure (REQUIRED)
- **Sidebar**: Always 280px width on left
- **Main Content**: Flexible width on right
- **Dashboard Grid**: Use `2fr 1fr` for main layout
- **Cards**: Always use `chart-container` class

### 3. Design System Files
- **ALWAYS reference**: `design-system.md` for colors and spacing
- **ALWAYS use**: CSS variables from `css-variables.css`
- **ALWAYS follow**: Component templates in `component-templates.md`

### 4. When Making Changes
- **BEFORE coding**: Check design-system.md for correct values
- **DURING coding**: Use CSS variables instead of hardcoded values
- **AFTER coding**: Verify colors match the design system

### 5. Dashboard Components
- **Upload Center**: Large card on left (2fr width)
- **System Status**: Small card on right (1fr width)
- **AI Theater**: Below System Status, same width
- **Sidebar**: All navigation items with icons and descriptions

### 6. CSS Class Requirements
```css
/* REQUIRED for all cards */
.chart-container {
  background: rgba(30, 27, 75, 0.6) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  color: #ffffff;
}
```

### 7. If Something Breaks
- Check if CSS variables are imported
- Verify card backgrounds are using correct `rgba(30, 27, 75, 0.6)`
- Ensure no white backgrounds were accidentally added
- Confirm text colors are white/light
- Reference this file and `design-system.md`

## NEVER CHANGE WITHOUT PERMISSION:
- Purple gradient background
- Dark card backgrounds
- White text colors
- Sidebar width (280px)
- Border radius (16px)
- Main layout grid structure

## 🔧 **How to Use These Files:**

### **In Cursor Prompts, Reference These:**
"Following the design system in design-system.md, update the dashboard to..."
"Using the CSS variables from css-variables.css, fix the card backgrounds..."
"According to cursor-instructions.md, ensure all cards use the correct background..."

### **Import CSS Variables:**
```html
<link rel="stylesheet" href="css-variables.css">
```

### **Reference in Components:**
```jsx
// Good - follows design system
<div className="chart-container">
  <h3 className="chart-title">Upload Center</h3>
</div>

// Bad - ignores design system
<div style={{background: 'white'}}>
  <h3 style={{color: 'black'}}>Upload Center</h3>
</div>
``` 