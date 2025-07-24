#!/usr/bin/env python3
"""
Check database contents to verify document processing
"""

from database import XspensesDatabase

def main():
    """Check database contents"""
    print("=== CHECKING DATABASE CONTENTS ===")
    
    try:
        db = XspensesDatabase()
        
        # Check documents
        print("\n--- Documents ---")
        documents = db.get_all_documents()
        print(f"Total documents: {len(documents)}")
        
        for doc in documents:
            print(f"ID: {doc['id']}")
            print(f"  Filename: {doc['filename']}")
            print(f"  Status: {doc['status']}")
            print(f"  Total transactions: {doc.get('total_transactions', 'N/A')}")
            print(f"  Created: {doc.get('created_at', 'N/A')}")
            print()
        
        # Check transactions for the latest document
        if documents:
            latest_doc = documents[0]  # Get the most recent document
            print(f"\n--- Transactions for Document {latest_doc['id']} ---")
            
            transactions = db.get_document_transactions(latest_doc['id'])
            print(f"Total transactions: {len(transactions)}")
            
            for i, trans in enumerate(transactions):  # Show all transactions
                print(f"Transaction {i+1}:")
                print(f"  Description: {trans.get('description', 'N/A')}")
                print(f"  Amount: {trans.get('amount', 'N/A')}")
                print(f"  Date: {trans.get('date', 'N/A')}")
                print(f"  AI Category: {trans.get('ai_category', 'N/A')}")
                print(f"  AI Confidence: {trans.get('ai_confidence', 'N/A')}")
                print()
        
    except Exception as e:
        print(f"Error checking database: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 