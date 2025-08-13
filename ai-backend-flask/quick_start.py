#!/usr/bin/env python3
"""
Quick Start Script for XspensesAI
Automates the entire setup and testing process
"""

import os
import sys
import subprocess
import time
import requests
from pathlib import Path

def print_header(title):
    """Print a formatted header"""
    print("\n" + "="*60)
    print(f"🚀 {title}")
    print("="*60)

def print_success(message):
    """Print success message"""
    print(f"✅ {message}")

def print_error(message):
    """Print error message"""
    print(f"❌ {message}")

def print_info(message):
    """Print info message"""
    print(f"ℹ️  {message}")

def print_warning(message):
    """Print warning message"""
    print(f"⚠️  {message}")

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print_success(f"{description} completed")
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"{description} failed: {e}")
        print_error(f"Error output: {e.stderr}")
        return False

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print_error("Python 3.8 or higher is required")
        return False
    print_success(f"Python {sys.version_info.major}.{sys.version_info.minor} detected")
    return True

def setup_environment():
    """Set up the environment"""
    print_header("Setting Up Environment")
    
    # Check Python version
    if not check_python_version():
        return False
    
    # Run setup script
    if not run_command("python setup.py", "Running setup script"):
        return False
    
    # Check if .env file exists and has API key
    env_file = Path(".env")
    if not env_file.exists():
        print_error(".env file not found. Please create it with your OpenAI API key.")
        print_info("Example .env file:")
        print("OPENAI_API_KEY=sk-your-actual-api-key-here")
        return False
    
    with open(env_file, 'r') as f:
        env_content = f.read()
        if "OPENAI_API_KEY" not in env_content or "sk-" not in env_content:
            print_error("OpenAI API key not properly configured in .env file")
            print_info("Please add your OpenAI API key to the .env file")
            return False
    
    print_success("Environment setup complete")
    return True

def start_server():
    """Start the Flask server"""
    print_header("Starting AI Server")
    
    print_info("Starting Flask server in background...")
    
    # Start server in background
    try:
        process = subprocess.Popen(
            ["python", "start.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait a moment for server to start
        time.sleep(3)
        
        # Check if server is running
        try:
            response = requests.get("http://localhost:5000/api/health", timeout=5)
            if response.status_code == 200:
                print_success("Server started successfully!")
                return process
            else:
                print_error("Server started but not responding correctly")
                return None
        except:
            print_error("Server failed to start")
            return None
            
    except Exception as e:
        print_error(f"Error starting server: {e}")
        return None

def test_ai_system():
    """Test the AI system"""
    print_header("Testing AI System")
    
    # Wait for server to be ready
    print_info("Waiting for server to be ready...")
    time.sleep(2)
    
    # Test health endpoint
    try:
        response = requests.get("http://localhost:5000/api/health", timeout=5)
        if response.status_code == 200:
            print_success("Server is healthy")
        else:
            print_error("Server health check failed")
            return False
    except:
        print_error("Cannot connect to server")
        return False
    
    # Test AI categorization
    print_info("Testing AI categorization...")
    test_transaction = {
        "description": "STARBUCKS COFFEE",
        "amount": 5.50,
        "date": "2024-01-15"
    }
    
    try:
        response = requests.post(
            "http://localhost:5000/api/categorize",
            json=test_transaction,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print_success(f"AI categorized: {result.get('category')}")
            print_info(f"Confidence: {result.get('confidence', 0):.2f}")
            return True
        else:
            print_error("AI categorization failed")
            return False
            
    except Exception as e:
        print_error(f"Error testing AI: {e}")
        return False

def run_demo():
    """Run a quick demo"""
    print_header("Running AI Demo")
    
    print_info("This demo will show the AI learning system in action...")
    
    # Test 1: Initial categorization
    print("\n1️⃣ Initial categorization:")
    result1 = requests.post(
        "http://localhost:5000/api/categorize",
        json={"description": "STARBUCKS COFFEE", "amount": 5.50, "date": "2024-01-15"},
        timeout=10
    ).json()
    
    print_info(f"   Starbucks → {result1.get('category')} (confidence: {result1.get('confidence', 0):.2f})")
    
    # Test 2: Teach the AI
    print("\n2️⃣ Teaching the AI your preference:")
    correction = {
        "transaction_id": 1,
        "original_category": result1.get('category'),
        "corrected_category": "Coffee",
        "description": "STARBUCKS COFFEE",
        "amount": 5.50
    }
    
    response = requests.put(
        "http://localhost:5000/api/categorize/correct",
        json=correction,
        timeout=10
    )
    
    if response.status_code == 200:
        print_success("   Preference saved!")
        
        # Test 3: Show learning
        print("\n3️⃣ Testing if AI learned:")
        time.sleep(2)
        
        result2 = requests.post(
            "http://localhost:5000/api/categorize",
            json={"description": "STARBUCKS COFFEE", "amount": 5.50, "date": "2024-01-15"},
            timeout=10
        ).json()
        
        print_info(f"   Starbucks → {result2.get('category')} (confidence: {result2.get('confidence', 0):.2f})")
        
        if result2.get('category') == 'Coffee':
            print_success("   🎉 AI learned your preference!")
        else:
            print_warning("   AI may need more time to learn")
    
    # Test 4: Show other categorizations
    print("\n4️⃣ Other AI categorizations:")
    test_cases = [
        ("SHELL GAS STATION", 35.50),
        ("AMAZON PURCHASE - BOOKS", 45.99),
        ("NETFLIX SUBSCRIPTION", 15.99)
    ]
    
    for desc, amount in test_cases:
        result = requests.post(
            "http://localhost:5000/api/categorize",
            json={"description": desc, "amount": amount, "date": "2024-01-15"},
            timeout=10
        ).json()
        
        print_info(f"   {desc} → {result.get('category')} (confidence: {result.get('confidence', 0):.2f})")

def show_next_steps():
    """Show next steps for the user"""
    print_header("Next Steps")
    
    print_success("Your AI backend is now running and working!")
    print_info("Here's what you can do next:")
    
    print("\n📊 Test with real data:")
    print("   python test_ai_complete.py")
    print("   python test_learning_system.py")
    
    print("\n🔍 Debug and monitor:")
    print("   python debug_ai_system.py")
    
    print("\n📁 Upload your own files:")
    print("   curl -X POST http://localhost:5000/api/documents/upload -F 'file=@your_bank_statement.csv'")
    
    print("\n🌐 Access the API:")
    print("   Health check: http://localhost:5000/api/health")
    print("   Categorize: POST http://localhost:5000/api/categorize")
    
    print("\n📚 Sample data available:")
    print("   data/sample_bank_statement.csv")
    
    print("\n🛑 To stop the server:")
    print("   Press Ctrl+C in the terminal where the server is running")

def main():
    """Main quick start function"""
    print_header("XspensesAI Quick Start")
    print("This script will set up and test your AI backend automatically")
    
    # Step 1: Setup environment
    if not setup_environment():
        print_error("Environment setup failed. Please check the errors above.")
        return
    
    # Step 2: Start server
    server_process = start_server()
    if not server_process:
        print_error("Failed to start server. Please check the errors above.")
        return
    
    # Step 3: Test AI system
    if not test_ai_system():
        print_error("AI system test failed. Please check the errors above.")
        return
    
    # Step 4: Run demo
    run_demo()
    
    # Step 5: Show next steps
    show_next_steps()
    
    print_header("Quick Start Complete!")
    print_success("🎉 Your AI backend is ready to use!")
    print_info("The server is running in the background.")
    print_info("You can now upload real bank statements and see the AI in action!")
    
    # Keep the script running to maintain the server process
    try:
        print_info("\nServer is running. Press Ctrl+C to stop...")
        server_process.wait()
    except KeyboardInterrupt:
        print_info("\nStopping server...")
        server_process.terminate()
        print_success("Server stopped")

if __name__ == "__main__":
    main() 