@echo off
echo.
echo ========================================
echo    XspensesAI Backend Starter
echo ========================================
echo.

echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo Python found! Checking setup...

if not exist ".env" (
    echo.
    echo ========================================
    echo    SETUP REQUIRED
    echo ========================================
    echo.
    echo You need to create a .env file with your OpenAI API key
    echo.
    echo 1. Go to https://platform.openai.com/
    echo 2. Get your API key (starts with sk-)
    echo 3. Create a file named .env in this directory
    echo 4. Add this line to the .env file:
    echo    OPENAI_API_KEY=sk-your-actual-api-key-here
    echo.
    echo Press any key to open notepad to create the .env file...
    pause >nul
    
    echo OPENAI_API_KEY=sk-your-actual-api-key-here > .env
    notepad .env
    
    echo.
    echo Please edit the .env file with your actual API key, then save and close it.
    echo Press any key when you're done...
    pause >nul
)

echo.
echo ========================================
echo    Starting AI Backend
echo ========================================
echo.

echo Running setup...
python setup.py

if errorlevel 1 (
    echo ERROR: Setup failed
    pause
    exit /b 1
)

echo.
echo Starting AI server...
echo The server will be available at: http://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo.

python start.py

pause 