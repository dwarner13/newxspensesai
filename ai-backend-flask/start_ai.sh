#!/bin/bash

echo ""
echo "========================================"
echo "    XspensesAI Backend Starter"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.8+ from https://python.org"
    exit 1
fi

echo "Python found! Checking setup..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo ""
    echo "========================================"
    echo "    SETUP REQUIRED"
    echo "========================================"
    echo ""
    echo "You need to create a .env file with your OpenAI API key"
    echo ""
    echo "1. Go to https://platform.openai.com/"
    echo "2. Get your API key (starts with sk-)"
    echo "3. Create a file named .env in this directory"
    echo "4. Add this line to the .env file:"
    echo "   OPENAI_API_KEY=sk-your-actual-api-key-here"
    echo ""
    
    # Create .env file with placeholder
    echo "OPENAI_API_KEY=sk-your-actual-api-key-here" > .env
    
    # Try to open with default editor
    if command -v nano &> /dev/null; then
        echo "Opening .env file with nano editor..."
        nano .env
    elif command -v vim &> /dev/null; then
        echo "Opening .env file with vim editor..."
        vim .env
    else
        echo "Please edit the .env file with your actual API key"
        echo "Press Enter when you're done..."
        read
    fi
fi

echo ""
echo "========================================"
echo "    Starting AI Backend"
echo "========================================"
echo ""

echo "Running setup..."
python3 setup.py

if [ $? -ne 0 ]; then
    echo "ERROR: Setup failed"
    exit 1
fi

echo ""
echo "Starting AI server..."
echo "The server will be available at: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python3 start.py 