# Favicon Setup Instructions

## Current Status
The favicon files are currently placeholders. To make XspensesAI pop when shared, you need to create actual image files.

## Required Files

### 1. Favicon Files
- `public/favicon.ico` - Multi-size ICO file (16x16, 32x32, 48x48)
- `public/favicon-16x16.png` - 16x16 PNG favicon
- `public/favicon-32x32.png` - 32x32 PNG favicon
- `public/apple-touch-icon.png` - 180x180 PNG for iOS devices

### 2. Social Sharing Image
- `public/social-share.png` - 1200x630 PNG for social media sharing

## How to Create These Files

### Option 1: Use Online Tools
1. Go to [Favicon.io](https://favicon.io/) or [RealFaviconGenerator](https://realfavicongenerator.net/)
2. Upload the logo from `public/assets/xspensesai-logo.svg`
3. Download the generated favicon package
4. Replace the placeholder files in `/public`

### Option 2: Use Design Software
1. Open the SVG logo in Figma, Sketch, or Adobe Illustrator
2. Export at the required sizes
3. For the social sharing image, create a 1200x630 design with:
   - XspensesAI logo
   - Tagline: "Master your expenses with AI"
   - Background: Gradient using brand colors (#0284c7, #0369a1)

### Option 3: Use Command Line (Advanced)
```bash
# Install ImageMagick
npm install -g sharp

# Convert SVG to PNG at different sizes
# (You'll need to write a script using sharp or similar)
```

## Brand Colors
- Primary: #0284c7 (Cyan)
- Secondary: #0369a1 (Darker Cyan)
- Background: #0f172a (Dark Slate)

## Testing
After creating the files:
1. Clear browser cache
2. Test on different devices
3. Use [Open Graph Debugger](https://developers.facebook.com/tools/debug/) to test social sharing
4. Test on iOS Messages app

## Current Logo
The logo is available at: `public/assets/xspensesai-logo.svg`
- Blue circle with white X
- Clean, modern design
- Perfect for favicon and social sharing
