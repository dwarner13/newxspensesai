# XspensesAI - Cross-Device Setup Guide

## 🚀 Saving Your Project for Other Computers

### Method 1: GitHub Repository (Recommended)

1. **Create a new GitHub repository**
   - Go to github.com and create a new repository named "xspensesai"
   - Don't initialize with README (we'll push existing code)

2. **Download your project files**
   - From Bolt.new, download all project files as a ZIP
   - Extract the ZIP to a folder on your computer

3. **Push to GitHub**
   ```bash
   cd xspensesai-project
   git init
   git add .
   git commit -m "Initial XspensesAI setup"
   git branch -M main
   git remote add origin https://github.com/yourusername/xspensesai.git
   git push -u origin main
   ```

4. **Access from any computer**
   - Clone the repository: `git clone https://github.com/yourusername/xspensesai.git`
   - Or import directly into Bolt.new using the GitHub URL

### Method 2: Bolt.new Project Sharing

1. **Share your project URL**
   - Copy the current Bolt.new project URL
   - This URL should work on any computer when logged into the same Bolt account

2. **Export project**
   - Use Bolt's export feature to download the project
   - Import on the new computer

### Method 3: Deploy and Develop

1. **Deploy to production** (already done with xspensesai.com)
2. **Use the live site** for daily use
3. **Develop locally** only when making changes

## 🔧 Environment Setup for New Computer

When setting up on a new computer, you'll need:

### Required Files:
- `.env` file with your Supabase credentials:
  ```
  VITE_SUPABASE_URL=your-supabase-url
  VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
  ```

### Installation Steps:
1. Install Node.js (v18 or higher)
2. Clone/download the project
3. Run `npm install`
4. Add your `.env` file
5. Run `npm run dev`

## 📱 Current Production Setup

Your XspensesAI is already configured for:
- **Domain**: xspensesai.com
- **Supabase**: Configured with proper URLs
- **Authentication**: Google OAuth ready
- **Database**: All tables and functions set up

## 🎯 Recommended Workflow

1. **Use the live site** (xspensesai.com) for daily operations
2. **Develop locally** only when adding features
3. **Deploy updates** through Netlify
4. **Keep code in GitHub** for version control

## 🔗 Important URLs

- **Live Site**: https://xspensesai.com
- **Supabase Dashboard**: [Your Supabase project URL]
- **Netlify Dashboard**: [Your Netlify deployment URL]
- **GitHub Repo**: [Your GitHub repository URL]

## 🆘 Troubleshooting

If you can't see your Bolt projects on another computer:

1. **Check your Bolt account email** - make sure it's the same
2. **Try the direct project URL** from your browser history
3. **Use GitHub import** as a backup method
4. **Contact Bolt support** if projects are missing

## 📋 Next Steps

1. Create a GitHub repository for your code
2. Document your Supabase credentials securely
3. Test the setup on your other computer
4. Consider using the deployed version for daily use