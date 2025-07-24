#!/usr/bin/env python3
"""
Debug script to test document upload and processing pipeline
"""

import requests
import os
import time
import json

def test_backend_health():
    """Test if backend is running"""
    print("=== TESTING BACKEND HEALTH ===")
    try:
        response = requests.get('http://localhost:5000/api/health', timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Backend health check failed: {e}")
        return False

def test_file_upload():
    """Test file upload endpoint"""
    print("\n=== TESTING FILE UPLOAD ===")
    
    # Create a simple test CSV file
    test_csv_content = """Date,Description,Amount
2024-01-15,STARBUCKS COFFEE,5.50
2024-01-16,AMAZON.COM,25.99
2024-01-17,UBER RIDE,12.75
2024-01-18,GROCERY STORE,45.20
"""
    
    test_file_path = "test_statement.csv"
    with open(test_file_path, 'w') as f:
        f.write(test_csv_content)
    
    print(f"Created test file: {test_file_path}")
    
    try:
        # Upload the file
        with open(test_file_path, 'rb') as f:
            files = {'file': (test_file_path, f, 'text/csv')}
            
            print("Sending upload request...")
            response = requests.post(
                'http://localhost:5000/api/documents/upload',
                files=files,
                timeout=60  # 60 second timeout for processing
            )
        
        print(f"Upload Status Code: {response.status_code}")
        print(f"Upload Response: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"Document ID: {result.get('document_id')}")
            print(f"Status: {result.get('status')}")
            print(f"Total Transactions: {result.get('total_transactions')}")
            print(f"Categorized Transactions: {result.get('categorized_transactions')}")
        
        return response.status_code == 200
        
    except Exception as e:
        print(f"Upload test failed: {e}")
        return False
    finally:
        # Clean up test file
        if os.path.exists(test_file_path):
            os.remove(test_file_path)

def check_logs():
    """Check log files for errors"""
    print("\n=== CHECKING LOG FILES ===")
    
    log_files = [
        'logs/api_server.log',
        'logs/document_reader.log', 
        'logs/ai_categorizer.log'
    ]
    
    for log_file in log_files:
        if os.path.exists(log_file):
            print(f"\n--- {log_file} ---")
            try:
                with open(log_file, 'r') as f:
                    lines = f.readlines()
                    # Show last 20 lines
                    for line in lines[-20:]:
                        print(line.strip())
            except Exception as e:
                print(f"Error reading log file: {e}")
        else:
            print(f"Log file not found: {log_file}")

def main():
    """Main debug function"""
    print("=== XSPENSESAI DOCUMENT PROCESSING DEBUG ===")
    
    # Test 1: Backend health
    if not test_backend_health():
        print("❌ Backend is not running or not responding")
        print("Please start the backend server with: python start.py")
        return
    
    print("✅ Backend is running")
    
    # Test 2: File upload
    if test_file_upload():
        print("✅ File upload and processing successful")
    else:
        print("❌ File upload or processing failed")
    
    # Test 3: Check logs
    check_logs()
    
    print("\n=== DEBUG COMPLETE ===")

if __name__ == "__main__":
    main() 