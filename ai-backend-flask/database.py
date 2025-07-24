"""
SQLite Database for XspensesAI - Stores user preferences and learning data
"""

import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
import os
from loguru import logger


class XspensesDatabase:
    def __init__(self, db_path: str = "./data/xspensesai.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize database tables"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Create documents table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS documents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT NOT NULL,
                    original_filename TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    file_size INTEGER NOT NULL,
                    file_type TEXT NOT NULL,
                    status TEXT DEFAULT 'uploaded',
                    total_transactions INTEGER DEFAULT 0,
                    extraction_confidence REAL DEFAULT 0.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create transactions table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    document_id INTEGER,
                    transaction_date TEXT NOT NULL,
                    description TEXT NOT NULL,
                    amount REAL NOT NULL,
                    ai_category TEXT,
                    ai_confidence REAL DEFAULT 0.0,
                    user_category TEXT,
                    is_corrected BOOLEAN DEFAULT FALSE,
                    corrected_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (document_id) REFERENCES documents (id)
                )
            ''')
            
            # Create user preferences table (learning system)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_preferences (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    merchant_pattern TEXT NOT NULL,
                    original_category TEXT,
                    preferred_category TEXT NOT NULL,
                    confidence_score REAL DEFAULT 0.0,
                    correction_count INTEGER DEFAULT 1,
                    learning_weight REAL DEFAULT 1.0,
                    context_data TEXT,  -- JSON string
                    last_corrected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create categories table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    description TEXT,
                    color TEXT,
                    icon TEXT,
                    is_system BOOLEAN DEFAULT TRUE,
                    usage_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.commit()
            logger.info("Database initialized successfully")
    
    def save_document(self, filename: str, original_filename: str, file_path: str, 
                     file_size: int, file_type: str) -> int:
        """Save document record and return document ID"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO documents (filename, original_filename, file_path, file_size, file_type)
                VALUES (?, ?, ?, ?, ?)
            ''', (filename, original_filename, file_path, file_size, file_type))
            conn.commit()
            return cursor.lastrowid
    
    def update_document_status(self, document_id: int, status: str, 
                             total_transactions: int = 0, extraction_confidence: float = 0.0):
        """Update document processing status"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE documents 
                SET status = ?, total_transactions = ?, extraction_confidence = ?
                WHERE id = ?
            ''', (status, total_transactions, extraction_confidence, document_id))
            conn.commit()
    
    def save_transactions(self, document_id: int, transactions: List[Dict[str, Any]]):
        """Save extracted transactions"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            for transaction in transactions:
                cursor.execute('''
                    INSERT INTO transactions (document_id, transaction_date, description, amount)
                    VALUES (?, ?, ?, ?)
                ''', (
                    document_id,
                    transaction.get('transaction_date'),
                    transaction.get('description', ''),
                    transaction.get('amount', 0)
                ))
            conn.commit()
    
    def get_document_transactions(self, document_id: int) -> List[Dict[str, Any]]:
        """Get all transactions for a document"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, transaction_date, description, amount, ai_category, ai_confidence, 
                       user_category, is_corrected, corrected_at, created_at
                FROM transactions 
                WHERE document_id = ?
                ORDER BY transaction_date DESC
            ''', (document_id,))
            
            rows = cursor.fetchall()
            transactions = []
            
            for row in rows:
                transactions.append({
                    'id': row[0],
                    'date': row[1],
                    'description': row[2],
                    'amount': row[3],
                    'ai_category': row[4],
                    'ai_confidence': row[5],
                    'user_category': row[6],
                    'is_corrected': bool(row[7]),
                    'corrected_at': row[8],
                    'created_at': row[9]
                })
            
            return transactions
    
    def get_all_documents(self) -> List[Dict[str, Any]]:
        """Get all documents from the database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, filename, original_filename, file_path, file_size, file_type,
                       status, total_transactions, extraction_confidence, created_at
                FROM documents 
                ORDER BY created_at DESC
            ''')
            
            rows = cursor.fetchall()
            documents = []
            
            for row in rows:
                documents.append({
                    'id': row[0],
                    'filename': row[1],
                    'original_filename': row[2],
                    'file_path': row[3],
                    'file_size': row[4],
                    'file_type': row[5],
                    'status': row[6],
                    'total_transactions': row[7],
                    'extraction_confidence': row[8],
                    'created_at': row[9]
                })
            
            return documents
    
    def save_user_preference(self, merchant_pattern: str, original_category: str, 
                           preferred_category: str, confidence_score: float = 0.0,
                           context_data: Dict[str, Any] = None):
        """Save user preference for learning"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Check if preference already exists
            cursor.execute('''
                SELECT id, correction_count, learning_weight FROM user_preferences 
                WHERE merchant_pattern = ?
            ''', (merchant_pattern,))
            
            existing = cursor.fetchone()
            
            if existing:
                # Update existing preference
                preference_id, correction_count, learning_weight = existing
                new_count = correction_count + 1
                new_weight = min(learning_weight * 1.1, 2.0)  # Cap at 2.0
                
                cursor.execute('''
                    UPDATE user_preferences 
                    SET preferred_category = ?, correction_count = ?, learning_weight = ?,
                        last_corrected_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (preferred_category, new_count, new_weight, preference_id))
            else:
                # Create new preference
                cursor.execute('''
                    INSERT INTO user_preferences 
                    (merchant_pattern, original_category, preferred_category, confidence_score, context_data)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    merchant_pattern,
                    original_category,
                    preferred_category,
                    confidence_score,
                    json.dumps(context_data) if context_data else None
                ))
            
            conn.commit()
    
    def get_user_preferences(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get user preferences for AI context"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM user_preferences 
                ORDER BY learning_weight DESC, last_corrected_at DESC
                LIMIT ?
            ''', (limit,))
            
            preferences = []
            for row in cursor.fetchall():
                preferences.append({
                    'merchant_pattern': row['merchant_pattern'],
                    'preferred_category': row['preferred_category'],
                    'correction_count': row['correction_count'],
                    'learning_weight': row['learning_weight'],
                    'context_data': json.loads(row['context_data']) if row['context_data'] else None
                })
            
            return preferences
    
    def update_transaction_category(self, transaction_id: int, ai_category: str, 
                                  ai_confidence: float, user_category: str = None):
        """Update transaction with AI categorization"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE transactions 
                SET ai_category = ?, ai_confidence = ?, user_category = ?
                WHERE id = ?
            ''', (ai_category, ai_confidence, user_category, transaction_id))
            conn.commit()
    
    def correct_transaction_category(self, transaction_id: int, corrected_category: str):
        """Mark transaction as corrected and learn from it"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Get transaction details
            cursor.execute('''
                SELECT description, ai_category FROM transactions WHERE id = ?
            ''', (transaction_id,))
            
            transaction = cursor.fetchone()
            if transaction:
                description, ai_category = transaction
                
                # Update transaction
                cursor.execute('''
                    UPDATE transactions 
                    SET user_category = ?, is_corrected = TRUE, corrected_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (corrected_category, transaction_id))
                
                # Save user preference for learning
                merchant_pattern = self._extract_merchant_pattern(description)
                self.save_user_preference(merchant_pattern, ai_category, corrected_category)
                
                conn.commit()
    
    def _extract_merchant_pattern(self, description: str) -> str:
        """Extract merchant pattern from transaction description"""
        if not description:
            return ""
        
        # Clean and extract first few words
        words = description.strip().upper().split()[:3]
        pattern = ' '.join(words)
        
        # Remove common prefixes
        pattern = pattern.replace('POS ', '').replace('PURCHASE ', '').replace('PAYMENT ', '')
        
        return pattern.strip()
    
    def get_learning_analytics(self) -> Dict[str, Any]:
        """Get learning system analytics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Total corrections
            cursor.execute('SELECT COUNT(*) FROM user_preferences')
            total_corrections = cursor.fetchone()[0]
            
            # Most corrected merchants
            cursor.execute('''
                SELECT merchant_pattern, correction_count 
                FROM user_preferences 
                ORDER BY correction_count DESC 
                LIMIT 5
            ''')
            most_corrected = [{'merchant': row[0], 'corrections': row[1]} 
                             for row in cursor.fetchall()]
            
            # Average learning weight
            cursor.execute('SELECT AVG(learning_weight) FROM user_preferences')
            avg_weight = cursor.fetchone()[0] or 0
            
            return {
                'total_corrections': total_corrections,
                'most_corrected_merchants': most_corrected,
                'average_learning_weight': round(avg_weight, 2)
            }
    
    def get_document_stats(self) -> Dict[str, Any]:
        """Get document processing statistics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Total documents
            cursor.execute('SELECT COUNT(*) FROM documents')
            total_documents = cursor.fetchone()[0]
            
            # Total transactions
            cursor.execute('SELECT COUNT(*) FROM transactions')
            total_transactions = cursor.fetchone()[0]
            
            # Average extraction confidence
            cursor.execute('SELECT AVG(extraction_confidence) FROM documents WHERE extraction_confidence > 0')
            avg_confidence = cursor.fetchone()[0] or 0
            
            return {
                'total_documents': total_documents,
                'total_transactions': total_transactions,
                'average_extraction_confidence': round(avg_confidence, 2)
            } 