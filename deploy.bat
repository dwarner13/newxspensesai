@echo off
REM 🚀 Prime Agent Kernel Deployment Script for Windows
REM This script helps you deploy your bot to Netlify

echo 🚀 Prime Agent Kernel Deployment Script
echo ========================================

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the project root directory
    pause
    exit /b 1
)

REM Check if git is initialized
if not exist ".git" (
    echo 📦 Initializing Git repository...
    git init
    git add .
    git commit -m "Initial commit: Prime Agent Kernel"
)

REM Check if we have environment variables
if not exist ".env.production" (
    echo ⚠️  Warning: No .env.production file found
    echo Please create one with your environment variables:
    echo.
    echo Required variables:
    echo   VITE_SUPABASE_URL=your_supabase_url
    echo   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    echo   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
    echo   OPENAI_API_KEY=your_openai_api_key
    echo   ENCRYPTION_MASTER_KEY=your_32_char_key
    echo.
    set /p continue="Do you want to continue without environment variables? (y/N): "
    if /i not "%continue%"=="y" (
        pause
        exit /b 1
    )
)

REM Build the project
echo 🔨 Building the project...
npm run build

if %errorlevel% neq 0 (
    echo ❌ Build failed. Please fix the errors and try again.
    pause
    exit /b 1
)

echo ✅ Build successful!

REM Push to GitHub
echo 📤 Pushing to GitHub...
git add .
git commit -m "Deploy: %date% %time%"
git push origin main

if %errorlevel% neq 0 (
    echo ❌ Push failed. Please check your Git configuration.
    pause
    exit /b 1
)

echo ✅ Code pushed to GitHub!

REM Provide next steps
echo.
echo 🎉 Deployment initiated!
echo.
echo Next steps:
echo 1. Go to https://netlify.com
echo 2. Click 'New site from Git'
echo 3. Connect your GitHub repository
echo 4. Configure build settings:
echo    - Build command: npm run build
echo    - Publish directory: dist
echo    - Functions directory: netlify/functions
echo 5. Add environment variables in Site Settings
echo 6. Deploy!
echo.
echo 📖 For detailed instructions, see DEPLOYMENT_GUIDE.md
echo.
echo 🔗 Your bot will be available at: https://your-site-name.netlify.app
echo.
pause
