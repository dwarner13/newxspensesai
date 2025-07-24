#!/usr/bin/env python3
"""
Setup script for XspensesAI Flask Backend
Installs dependencies, creates directories, and initializes the database
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        print(f"Error output: {e.stderr}")
        return False

def create_directories():
    """Create necessary directories"""
    directories = [
        "data",
        "uploads", 
        "logs",
        "uploads/pdf",
        "uploads/csv",
        "uploads/images"
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"📁 Created directory: {directory}")

def setup_environment():
    """Set up environment file"""
    env_file = ".env"
    env_example = "env.example"
    
    if not os.path.exists(env_file):
        if os.path.exists(env_example):
            shutil.copy(env_example, env_file)
            print("📄 Created .env file from env.example")
            print("⚠️  Please edit .env file with your OpenAI API key and other settings")
        else:
            print("❌ env.example not found")
            return False
    else:
        print("📄 .env file already exists")
    
    return True

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        return False
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    return True

def install_dependencies():
    """Install Python dependencies"""
    if not run_command("pip install -r requirements.txt", "Installing Python dependencies"):
        return False
    
    # Check for specific critical dependencies
    critical_packages = [
        "flask",
        "openai", 
        "pandas",
        "PyPDF2",
        "pdfplumber"
    ]
    
    for package in critical_packages:
        try:
            __import__(package.replace("-", "_"))
            print(f"✅ {package} is available")
        except ImportError:
            print(f"❌ {package} is not available - please check installation")
            return False
    
    return True

def initialize_database():
    """Initialize the SQLite database"""
    try:
        from database import XspensesDatabase
        db = XspensesDatabase()
        print("✅ Database initialized successfully")
        return True
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        return False

def create_test_script():
    """Create a simple test script"""
    test_script = """#!/usr/bin/env python3
\"\"\"
Quick test script for XspensesAI Flask Backend
\"\"\"

import requests
import json
import os

def test_server():
    \"\"\"Test if the server is running\"\"\"
    try:
        response = requests.get('http://localhost:5000/api/health')
        if response.status_code == 200:
            print("✅ Server is running!")
            return True
        else:
            print(f"❌ Server responded with status: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running. Start it with: python api_server.py")
        return False

def test_openai_connection():
    \"\"\"Test OpenAI API connection\"\"\"
    try:
        from ai_categorizer import AICategorizer
        categorizer = AICategorizer()
        
        # Test with a simple transaction
        test_transaction = {
            "description": "Starbucks Coffee",
            "amount": 5.50,
            "date": "2024-01-15"
        }
        
        result = categorizer.categorize_transaction(test_transaction)
        print(f"✅ OpenAI connection successful! Test categorization: {result['category']}")
        return True
    except Exception as e:
        print(f"❌ OpenAI connection failed: {e}")
        print("Make sure your OPENAI_API_KEY is set in .env file")
        return False

if __name__ == "__main__":
    print("🧪 Testing XspensesAI Flask Backend...")
    print()
    
    # Test OpenAI connection
    test_openai_connection()
    print()
    
    # Test server (if running)
    test_server()
    print()
    print("🎉 Setup complete! You can now:")
    print("1. Start the server: python api_server.py")
    print("2. Upload documents via POST /api/documents/upload")
    print("3. View transactions via GET /api/documents/{id}/transactions")
    print("4. Categorize transactions via POST /api/categorize")
"""
    
    with open("test_backend.py", "w") as f:
        f.write(test_script)
    print("📄 Created test_backend.py")

def main():
    """Main setup function"""
    print("🚀 Setting up XspensesAI Flask Backend...")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Create directories
    print("\n📁 Creating directories...")
    create_directories()
    
    # Setup environment
    print("\n🔧 Setting up environment...")
    if not setup_environment():
        sys.exit(1)
    
    # Install dependencies
    print("\n📦 Installing dependencies...")
    if not install_dependencies():
        print("❌ Failed to install dependencies")
        sys.exit(1)
    
    # Initialize database
    print("\n🗄️  Initializing database...")
    if not initialize_database():
        print("❌ Failed to initialize database")
        sys.exit(1)
    
    # Create test script
    print("\n🧪 Creating test script...")
    create_test_script()
    
    print("\n" + "=" * 50)
    print("🎉 Setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Edit .env file with your OpenAI API key")
    print("2. Start the server: python api_server.py")
    print("3. Test the backend: python test_backend.py")
    print("\n📚 API Endpoints:")
    print("- POST /api/documents/upload - Upload bank statements")
    print("- GET /api/documents/{id} - Get document details")
    print("- GET /api/documents/{id}/transactions - Get transactions")
    print("- POST /api/categorize - Categorize single transaction")
    print("- POST /api/categorize/batch - Categorize multiple transactions")
    print("- POST /api/categorize/correct - Correct categorization")
    print("- GET /api/preferences - Get user preferences")
    print("- GET /api/analytics - Get learning analytics")
    print("\n🔗 The server will be available at: http://localhost:5000")

if __name__ == "__main__":
    main() 