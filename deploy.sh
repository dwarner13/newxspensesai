#!/bin/bash

# 🚀 Prime Agent Kernel Deployment Script
# This script helps you deploy your bot to Netlify

echo "🚀 Prime Agent Kernel Deployment Script"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit: Prime Agent Kernel"
fi

# Check if we have a remote origin
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "🔗 Please add a GitHub remote repository:"
    echo "   git remote add origin https://github.com/your-username/your-repo.git"
    echo "   git push -u origin main"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Check if we have environment variables
if [ ! -f ".env.production" ]; then
    echo "⚠️  Warning: No .env.production file found"
    echo "Please create one with your environment variables:"
    echo ""
    echo "Required variables:"
    echo "  VITE_SUPABASE_URL=your_supabase_url"
    echo "  VITE_SUPABASE_ANON_KEY=your_supabase_anon_key"
    echo "  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
    echo "  OPENAI_API_KEY=your_openai_api_key"
    echo "  ENCRYPTION_MASTER_KEY=your_32_char_key"
    echo ""
    read -p "Do you want to continue without environment variables? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build the project
echo "🔨 Building the project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

echo "✅ Build successful!"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git add .
git commit -m "Deploy: $(date)"
git push origin main

if [ $? -ne 0 ]; then
    echo "❌ Push failed. Please check your Git configuration."
    exit 1
fi

echo "✅ Code pushed to GitHub!"

# Provide next steps
echo ""
echo "🎉 Deployment initiated!"
echo ""
echo "Next steps:"
echo "1. Go to https://netlify.com"
echo "2. Click 'New site from Git'"
echo "3. Connect your GitHub repository"
echo "4. Configure build settings:"
echo "   - Build command: npm run build"
echo "   - Publish directory: dist"
echo "   - Functions directory: netlify/functions"
echo "5. Add environment variables in Site Settings"
echo "6. Deploy!"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT_GUIDE.md"
echo ""
echo "🔗 Your bot will be available at: https://your-site-name.netlify.app"
