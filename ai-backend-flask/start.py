#!/usr/bin/env python3
"""
Start script for XspensesAI Flask Backend
"""

import os
import sys
from dotenv import load_dotenv
from api_server import XspensesAPIServer
from loguru import logger

def main():
    """Start the Flask API server"""
    
    # Load environment variables
    load_dotenv()
    
    # Check if OpenAI API key is set (but allow placeholder for debugging)
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ Error: OPENAI_API_KEY not found in environment variables")
        print("Please set your OpenAI API key in the .env file")
        print("For debugging, you can use: OPENAI_API_KEY=sk-test-placeholder-key-for-debugging")
        sys.exit(1)
    elif api_key == 'sk-test-placeholder-key-for-debugging':
        print("⚠️  Warning: Using placeholder OpenAI API key - AI categorization will use fallback method")
    
    # Get configuration from environment
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    try:
        # Create and start server
        server = XspensesAPIServer()
        
        print("🚀 Starting XspensesAI Flask Backend...")
        print(f"📍 Server will be available at: http://{host}:{port}")
        print(f"🔧 Debug mode: {'Enabled' if debug else 'Disabled'}")
        print("📚 API Documentation: http://localhost:5000/api/health")
        print("\nPress Ctrl+C to stop the server")
        print("-" * 50)
        
        # Start the server
        server.run(host=host, port=port, debug=debug)
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 