#!/usr/bin/env python3
"""
AI System Debugging Script for XspensesAI
Provides detailed debugging information about AI operations
"""

import os
import sys
import json
import requests
import time
import sqlite3
from datetime import datetime
from pathlib import Path

def print_header(title):
    """Print a formatted header"""
    print("\n" + "="*60)
    print(f"🔍 {title}")
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

def print_debug(message):
    """Print debug message"""
    print(f"🐛 {message}")

def check_database():
    """Check database contents and structure"""
    print_header("Database Debug Information")
    
    db_path = "data/xspensesai.db"
    
    if not os.path.exists(db_path):
        print_error(f"Database not found: {db_path}")
        return
    
    print_info(f"Database location: {db_path}")
    print_info(f"Database size: {os.path.getsize(db_path)} bytes")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get table information
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        print_info(f"Tables in database: {len(tables)}")
        for table in tables:
            table_name = table[0]
            print_debug(f"  - {table_name}")
            
            # Get row count for each table
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print_debug(f"    Rows: {count}")
            
            # Show sample data for key tables
            if table_name in ['transactions', 'categorization_rules', 'memory']:
                cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
                rows = cursor.fetchall()
                if rows:
                    print_debug(f"    Sample data:")
                    for row in rows:
                        print_debug(f"      {row}")
        
        conn.close()
        print_success("Database check completed")
        
    except Exception as e:
        print_error(f"Database error: {e}")

def check_api_endpoints():
    """Check all API endpoints"""
    print_header("API Endpoints Debug")
    
    base_url = "http://localhost:5000"
    endpoints = [
        "/api/health",
        "/api/categorize",
        "/api/documents/upload",
        "/api/documents/1/transactions"
    ]
    
    for endpoint in endpoints:
        url = base_url + endpoint
        print_debug(f"Testing: {endpoint}")
        
        try:
            if endpoint == "/api/categorize":
                # POST request with test data
                response = requests.post(
                    url,
                    json={"description": "TEST TRANSACTION", "amount": 10.00, "date": "2024-01-15"},
                    timeout=5
                )
            elif endpoint == "/api/documents/upload":
                # Skip file upload for now
                print_debug("  Skipping file upload test")
                continue
            else:
                # GET request
                response = requests.get(url, timeout=5)
            
            print_debug(f"  Status: {response.status_code}")
            if response.status_code == 200:
                print_success(f"  ✅ {endpoint} is working")
            else:
                print_error(f"  ❌ {endpoint} returned {response.status_code}")
                
        except Exception as e:
            print_error(f"  ❌ {endpoint} error: {e}")

def debug_categorization_process():
    """Debug the categorization process step by step"""
    print_header("Categorization Process Debug")
    
    test_transaction = {
        "description": "STARBUCKS COFFEE",
        "amount": 5.50,
        "date": "2024-01-15"
    }
    
    print_debug("Step 1: Sending categorization request")
    print_debug(f"  Transaction: {test_transaction}")
    
    try:
        start_time = time.time()
        response = requests.post(
            "http://localhost:5000/api/categorize",
            json=test_transaction,
            timeout=10
        )
        end_time = time.time()
        
        print_debug(f"  Request time: {end_time - start_time:.2f} seconds")
        print_debug(f"  Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print_success("✅ Categorization successful")
            print_debug(f"  Response: {json.dumps(result, indent=2)}")
            
            # Analyze the response
            category = result.get('category')
            confidence = result.get('confidence', 0)
            explanation = result.get('explanation', 'N/A')
            
            print_info(f"  Category: {category}")
            print_info(f"  Confidence: {confidence:.2f}")
            print_info(f"  Explanation: {explanation}")
            
        else:
            print_error(f"❌ Categorization failed: {response.status_code}")
            print_debug(f"  Response: {response.text}")
            
    except Exception as e:
        print_error(f"❌ Categorization error: {e}")

def debug_learning_process():
    """Debug the learning process"""
    print_header("Learning Process Debug")
    
    # Step 1: Initial categorization
    print_debug("Step 1: Initial categorization")
    result1 = requests.post(
        "http://localhost:5000/api/categorize",
        json={"description": "STARBUCKS COFFEE", "amount": 5.50, "date": "2024-01-15"},
        timeout=10
    ).json()
    
    print_debug(f"  Initial category: {result1.get('category')}")
    print_debug(f"  Initial confidence: {result1.get('confidence', 0):.2f}")
    
    # Step 2: Correct the categorization
    print_debug("Step 2: Correcting categorization")
    correction = {
        "transaction_id": 1,
        "original_category": result1.get('category'),
        "corrected_category": "Coffee",
        "description": "STARBUCKS COFFEE",
        "amount": 5.50
    }
    
    print_debug(f"  Correction: {correction}")
    
    response = requests.put(
        "http://localhost:5000/api/categorize/correct",
        json=correction,
        timeout=10
    )
    
    if response.status_code == 200:
        print_success("✅ Correction saved")
        
        # Step 3: Test learning
        print_debug("Step 3: Testing learning")
        time.sleep(2)
        
        result2 = requests.post(
            "http://localhost:5000/api/categorize",
            json={"description": "STARBUCKS COFFEE", "amount": 5.50, "date": "2024-01-15"},
            timeout=10
        ).json()
        
        print_debug(f"  New category: {result2.get('category')}")
        print_debug(f"  New confidence: {result2.get('confidence', 0):.2f}")
        print_debug(f"  New explanation: {result2.get('explanation', 'N/A')}")
        
        if result2.get('category') == 'Coffee':
            print_success("✅ Learning successful!")
        else:
            print_warning("⚠️ Learning may not have worked")
    else:
        print_error(f"❌ Correction failed: {response.status_code}")

def check_log_files():
    """Check log files for debugging information"""
    print_header("Log Files Debug")
    
    log_dir = Path("logs")
    if not log_dir.exists():
        print_error("Logs directory not found")
        return
    
    log_files = list(log_dir.glob("*.log"))
    
    if not log_files:
        print_warning("No log files found")
        return
    
    for log_file in log_files:
        print_info(f"Log file: {log_file.name}")
        print_info(f"Size: {log_file.stat().st_size} bytes")
        
        # Show last 10 lines
        try:
            with open(log_file, 'r') as f:
                lines = f.readlines()
                if lines:
                    print_debug("Last 10 lines:")
                    for line in lines[-10:]:
                        print_debug(f"  {line.strip()}")
                else:
                    print_debug("  Log file is empty")
        except Exception as e:
            print_error(f"Error reading log file: {e}")

def check_environment():
    """Check environment and configuration"""
    print_header("Environment Debug")
    
    # Check .env file
    env_file = Path(".env")
    if env_file.exists():
        print_success("✅ .env file exists")
        
        with open(env_file, 'r') as f:
            env_content = f.read()
            if "OPENAI_API_KEY" in env_content:
                print_success("✅ OpenAI API key configured")
            else:
                print_error("❌ OpenAI API key not found in .env")
    else:
        print_error("❌ .env file not found")
    
    # Check Python packages
    print_debug("Checking required packages:")
    required_packages = [
        'openai', 'flask', 'pandas', 'PyPDF2', 'pytesseract', 
        'PIL', 'requests', 'python-dotenv'
    ]
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print_success(f"  ✅ {package}")
        except ImportError:
            print_error(f"  ❌ {package} not found")

def monitor_real_time():
    """Monitor real-time API activity"""
    print_header("Real-time API Monitoring")
    print_info("Monitoring API calls for 30 seconds...")
    print_info("Press Ctrl+C to stop")
    
    try:
        start_time = time.time()
        while time.time() - start_time < 30:
            # Test health endpoint
            try:
                response = requests.get("http://localhost:5000/api/health", timeout=2)
                if response.status_code == 200:
                    print_debug(f"✅ Server healthy at {datetime.now().strftime('%H:%M:%S')}")
                else:
                    print_error(f"❌ Server error at {datetime.now().strftime('%H:%M:%S')}")
            except:
                print_error(f"❌ Server unreachable at {datetime.now().strftime('%H:%M:%S')}")
            
            time.sleep(5)
            
    except KeyboardInterrupt:
        print_info("Monitoring stopped by user")

def main():
    """Run all debugging functions"""
    print_header("XspensesAI System Debug")
    print("This script provides detailed debugging information about your AI system")
    
    # Check if server is running
    try:
        response = requests.get("http://localhost:5000/api/health", timeout=5)
        if response.status_code == 200:
            print_success("✅ Server is running")
        else:
            print_error("❌ Server is not responding correctly")
            return
    except:
        print_error("❌ Server is not running. Please start it with: python start.py")
        return
    
    # Run all debug functions
    check_environment()
    check_database()
    check_api_endpoints()
    debug_categorization_process()
    debug_learning_process()
    check_log_files()
    
    # Ask if user wants real-time monitoring
    print_header("Real-time Monitoring")
    response = input("Do you want to monitor real-time API activity? (y/n): ")
    if response.lower() == 'y':
        monitor_real_time()
    
    print_header("Debug Complete")
    print_success("All debugging information collected!")
    print_info("Check the output above for any issues or insights.")

if __name__ == "__main__":
    main() 