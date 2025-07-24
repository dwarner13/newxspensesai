"""
Flask REST API Server for XspensesAI
"""

import os
import uuid
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from loguru import logger
import json
from dotenv import load_dotenv
import asyncio
import logging

# Configure detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/api_server.log'),
        logging.StreamHandler()
    ]
)

# Load environment variables
load_dotenv()

from document_reader import DocumentReader
from ai_categorizer import AICategorizer
from learning_system import LearningSystem
from database import XspensesDatabase
from ai_chat import AIChatService
from ephemeral_processor import ephemeral_processor
from ephemeral_bank_processor import ephemeral_bank_processor
from ephemeral_credit_processor import ephemeral_credit_processor
from ephemeral_middleware import ephemeral_middleware
from unified_ephemeral_processor import unified_ephemeral_processor
from ai_insight_generator import ai_insight_generator
from legal_compliance_system import legal_compliance_system


class XspensesAPIServer:
    def __init__(self):
        self.app = Flask(__name__)
        self.setup_config()
        self.setup_cors()
        self.setup_routes()
        
        # Initialize components
        logger.info("Initializing XspensesAI API Server components...")
        self.db = XspensesDatabase()
        logger.info("Database initialized")
        self.document_reader = DocumentReader()
        logger.info("Document reader initialized")
        self.ai_categorizer = AICategorizer()
        logger.info("AI categorizer initialized")
        self.learning_system = LearningSystem(self.db)
        logger.info("Learning system initialized")
        self.ai_chat = AIChatService()
        logger.info("AI chat service initialized")
        
        logger.info("XspensesAI API Server initialized successfully")
    
    def setup_config(self):
        """Setup Flask configuration"""
        self.app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', './uploads')
        self.app.config['MAX_FILE_SIZE'] = int(os.getenv('MAX_FILE_SIZE', 10485760))  # 10MB
        self.app.config['ALLOWED_EXTENSIONS'] = {'pdf', 'csv', 'xlsx', 'xls', 'jpg', 'jpeg', 'png'}
        
        # Create upload directory
        os.makedirs(self.app.config['UPLOAD_FOLDER'], exist_ok=True)
        logger.info(f"Upload folder configured: {self.app.config['UPLOAD_FOLDER']}")
    
    def setup_cors(self):
        """Setup CORS for frontend integration"""
        allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
        CORS(self.app, origins=allowed_origins, supports_credentials=True)
        logger.info(f"CORS configured for origins: {allowed_origins}")
    
    def setup_routes(self):
        """Setup API routes"""
        
        @self.app.route('/api/health', methods=['GET'])
        def health_check():
            """Health check endpoint"""
            logger.info("Health check requested")
            return jsonify({
                'status': 'healthy',
                'service': 'XspensesAI Flask Backend',
                'timestamp': datetime.now().isoformat(),
                'version': '1.0.0'
            })
        
        @self.app.route('/api/documents/upload', methods=['POST'])
        def upload_document():
            """Upload and process a document"""
            logger.info("=== DOCUMENT UPLOAD REQUEST RECEIVED ===")
            
            try:
                # Check if file is present
                if 'file' not in request.files:
                    logger.error("No file provided in request")
                    return jsonify({'error': 'No file provided'}), 400
                
                file = request.files['file']
                logger.info(f"File received: {file.filename}")
                
                if file.filename == '':
                    logger.error("No file selected")
                    return jsonify({'error': 'No file selected'}), 400
                
                # Check file size
                file.seek(0, 2)  # Seek to end
                file_size = file.tell()
                file.seek(0)  # Reset to beginning
                logger.info(f"File size: {file_size} bytes")
                
                if file_size > self.app.config['MAX_FILE_SIZE']:
                    logger.error(f"File too large: {file_size} > {self.app.config['MAX_FILE_SIZE']}")
                    return jsonify({'error': 'File too large'}), 400
                
                # Check file extension
                if not self.allowed_file(file.filename):
                    logger.error(f"Unsupported file type: {file.filename}")
                    return jsonify({'error': 'Unsupported file type'}), 400
                
                logger.info(f"File validation passed: {file.filename}")
                
                # Save file
                filename = secure_filename(file.filename)
                unique_filename = f"{uuid.uuid4()}_{filename}"
                file_path = os.path.join(self.app.config['UPLOAD_FOLDER'], unique_filename)
                
                logger.info(f"Saving file to: {file_path}")
                file.save(file_path)
                logger.info("File saved successfully")
                
                # Save to database
                logger.info("Saving document to database...")
                document_id = self.db.save_document(
                    filename=unique_filename,
                    original_filename=filename,
                    file_path=file_path,
                    file_size=file_size,
                    file_type=self.get_file_extension(filename)
                )
                logger.info(f"Document saved to database with ID: {document_id}")
                
                # Update status to processing
                logger.info("Updating document status to 'processing'...")
                self.db.update_document_status(document_id, 'processing')
                
                # Process document
                logger.info("=== STARTING DOCUMENT PROCESSING ===")
                try:
                    logger.info("Calling document reader...")
                    result = self.document_reader.read_document(file_path)
                    logger.info(f"Document reader completed. Transactions found: {result['total_transactions']}")
                    
                    # Save transactions
                    logger.info("Saving transactions to database...")
                    self.db.save_transactions(document_id, result['transactions'])
                    logger.info(f"Saved {len(result['transactions'])} transactions")
                    
                    # Update document status
                    logger.info("Updating document status to 'completed'...")
                    self.db.update_document_status(
                        document_id=document_id,
                        status='completed',
                        total_transactions=result['total_transactions'],
                        extraction_confidence=result['extraction_confidence']
                    )
                    
                    # Categorize transactions
                    logger.info("=== STARTING TRANSACTION CATEGORIZATION ===")
                    transactions = self.db.get_document_transactions(document_id)
                    logger.info(f"Retrieved {len(transactions)} transactions for categorization")
                    
                    user_preferences = self.learning_system.get_user_preferences()
                    logger.info(f"Retrieved user preferences: {len(user_preferences) if user_preferences else 0} items")
                    
                    categorized_count = 0
                    for i, transaction in enumerate(transactions):
                        logger.info(f"Categorizing transaction {i+1}/{len(transactions)}: {transaction.get('description', 'Unknown')}")
                        
                        try:
                            # Get AI categorization
                            logger.info("Getting AI categorization...")
                            categorization = self.ai_categorizer.categorize_transaction(
                                transaction, user_preferences
                            )
                            logger.info(f"AI categorization result: {categorization.get('category', 'Unknown')} (confidence: {categorization.get('confidence', 0)})")
                            
                            # Apply learning system prediction
                            logger.info("Applying learning system...")
                            final_category, final_confidence = self.learning_system.predict_category(
                                transaction, 
                                categorization['category'], 
                                categorization['confidence']
                            )
                            logger.info(f"Final categorization: {final_category} (confidence: {final_confidence})")
                            
                            # Update transaction with categorization
                            logger.info("Updating transaction in database...")
                            self.db.update_transaction_category(
                                transaction_id=transaction['id'],
                                ai_category=final_category,
                                ai_confidence=final_confidence
                            )
                            categorized_count += 1
                            logger.info(f"Transaction {i+1} categorized successfully")
                            
                        except Exception as e:
                            logger.error(f"Error categorizing transaction {i+1}: {e}")
                            continue
                    
                    logger.info(f"=== CATEGORIZATION COMPLETE: {categorized_count}/{len(transactions)} transactions processed ===")
                    
                    response_data = {
                        'document_id': document_id,
                        'filename': filename,
                        'status': 'completed',
                        'total_transactions': result['total_transactions'],
                        'extraction_confidence': result['extraction_confidence'],
                        'categorized_transactions': categorized_count,
                        'message': 'Document processed successfully'
                    }
                    
                    logger.info(f"=== DOCUMENT PROCESSING COMPLETE ===")
                    logger.info(f"Response: {response_data}")
                    
                    return jsonify(response_data)
                    
                except Exception as e:
                    logger.error(f"=== DOCUMENT PROCESSING FAILED ===")
                    logger.error(f"Error processing document: {e}")
                    logger.error(f"Exception type: {type(e).__name__}")
                    import traceback
                    logger.error(f"Traceback: {traceback.format_exc()}")
                    
                    self.db.update_document_status(document_id, 'failed')
                    return jsonify({'error': f'Processing failed: {str(e)}'}), 500
                
            except Exception as e:
                logger.error(f"=== UPLOAD REQUEST FAILED ===")
                logger.error(f"Error uploading document: {e}")
                logger.error(f"Exception type: {type(e).__name__}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/documents/<int:document_id>', methods=['GET'])
        def get_document(document_id):
            """Get document details"""
            try:
                # Get document info from database
                with self.db.db_path as conn:
                    cursor = conn.cursor()
                    cursor.execute('SELECT * FROM documents WHERE id = ?', (document_id,))
                    document = cursor.fetchone()
                
                if not document:
                    return jsonify({'error': 'Document not found'}), 404
                
                return jsonify({
                    'id': document[0],
                    'filename': document[2],  # original_filename
                    'status': document[6],
                    'total_transactions': document[7],
                    'extraction_confidence': document[8],
                    'created_at': document[9]
                })
                
            except Exception as e:
                logger.error(f"Error getting document {document_id}: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/documents/<int:document_id>/transactions', methods=['GET'])
        def get_document_transactions(document_id):
            """Get transactions for a document"""
            try:
                transactions = self.db.get_document_transactions(document_id)
                return jsonify(transactions)
                
            except Exception as e:
                logger.error(f"Error getting transactions for document {document_id}: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/categorize', methods=['POST'])
        def categorize_transaction():
            """Categorize a single transaction"""
            try:
                data = request.get_json()
                transaction = data.get('transaction', {})
                
                if not transaction:
                    return jsonify({'error': 'No transaction data provided'}), 400
                
                # Get user preferences
                user_preferences = self.learning_system.get_user_preferences()
                
                # Categorize with AI
                categorization = self.ai_categorizer.categorize_transaction(
                    transaction, user_preferences
                )
                
                # Apply learning system prediction
                final_category, final_confidence = self.learning_system.predict_category(
                    transaction,
                    categorization['category'],
                    categorization['confidence']
                )
                
                return jsonify({
                    'category': final_category,
                    'confidence': final_confidence,
                    'reasoning': categorization.get('reasoning', ''),
                    'ai_model': categorization.get('ai_model', '')
                })
                
            except Exception as e:
                logger.error(f"Error categorizing transaction: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/categorize/batch', methods=['POST'])
        def categorize_batch():
            """Categorize multiple transactions"""
            try:
                data = request.get_json()
                transactions = data.get('transactions', [])
                
                if not transactions:
                    return jsonify({'error': 'No transactions provided'}), 400
                
                # Get user preferences
                user_preferences = self.learning_system.get_user_preferences()
                
                # Categorize batch
                categorizations = self.ai_categorizer.categorize_batch(
                    transactions, user_preferences
                )
                
                # Apply learning system predictions
                results = []
                for i, transaction in enumerate(transactions):
                    categorization = categorizations[i] if i < len(categorizations) else {
                        'category': 'Uncategorized',
                        'confidence': 0.0
                    }
                    
                    final_category, final_confidence = self.learning_system.predict_category(
                        transaction,
                        categorization['category'],
                        categorization['confidence']
                    )
                    
                    results.append({
                        'transaction_index': i,
                        'category': final_category,
                        'confidence': final_confidence,
                        'reasoning': categorization.get('reasoning', '')
                    })
                
                return jsonify({'categorizations': results})
                
            except Exception as e:
                logger.error(f"Error in batch categorization: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/categorize/correct', methods=['PUT'])
        def correct_categorization():
            """Correct categorization and learn from it"""
            try:
                data = request.get_json()
                transaction_id = data.get('transaction_id')
                corrected_category = data.get('corrected_category')
                
                if not transaction_id or not corrected_category:
                    return jsonify({'error': 'Missing transaction_id or corrected_category'}), 400
                
                # Get transaction details
                with self.db.db_path as conn:
                    cursor = conn.cursor()
                    cursor.execute('SELECT * FROM transactions WHERE id = ?', (transaction_id,))
                    transaction = cursor.fetchone()
                
                if not transaction:
                    return jsonify({'error': 'Transaction not found'}), 404
                
                # Learn from correction
                learning_result = self.learning_system.learn_from_correction(
                    transaction={
                        'id': transaction[0],
                        'description': transaction[3],
                        'amount': transaction[4],
                        'ai_confidence': transaction[6]
                    },
                    original_category=transaction[5] or 'Uncategorized',
                    corrected_category=corrected_category
                )
                
                # Update transaction
                self.db.correct_transaction_category(transaction_id, corrected_category)
                
                return jsonify({
                    'message': 'Categorization corrected and learned',
                    'learning_impact': learning_result.get('impact_score', 0.0)
                })
                
            except Exception as e:
                logger.error(f"Error correcting categorization: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/preferences', methods=['GET'])
        def get_preferences():
            """Get user preferences"""
            try:
                preferences = self.learning_system.get_user_preferences()
                return jsonify(preferences)
                
            except Exception as e:
                logger.error(f"Error getting preferences: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/analytics/learning', methods=['GET'])
        def get_learning_analytics():
            """Get learning system analytics"""
            try:
                analytics = self.learning_system.get_learning_analytics()
                return jsonify(analytics)
                
            except Exception as e:
                logger.error(f"Error getting learning analytics: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/analytics/documents', methods=['GET'])
        def get_document_analytics():
            """Get document processing analytics"""
            try:
                stats = self.db.get_document_stats()
                return jsonify(stats)
                
            except Exception as e:
                logger.error(f"Error getting document analytics: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/ai-chat', methods=['POST'])
        def ai_chat():
            """AI Financial Coach Chat Endpoint"""
            try:
                data = request.get_json()
                prompt = data.get('prompt')
                user_context = data.get('user_context', {})
                personality = data.get('personality', 'encouraging')
                
                if not prompt:
                    return jsonify({'error': 'No prompt provided'}), 400
                
                # Generate AI response
                response = self.ai_chat.generate_response(prompt, user_context, personality)
                
                return jsonify(response)
                
            except Exception as e:
                logger.error(f"Error in AI chat: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/receipts/process', methods=['POST'])
        def process_receipt():
            """Process receipt image and extract transaction details"""
            try:
                if 'file' not in request.files:
                    return jsonify({'error': 'No file provided'}), 400
                
                file = request.files['file']
                if file.filename == '':
                    return jsonify({'error': 'No file selected'}), 400
                
                # Check file type
                if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                    return jsonify({'error': 'Only JPG and PNG images are supported'}), 400
                
                # Save file temporarily
                filename = secure_filename(file.filename)
                unique_filename = f"receipt_{uuid.uuid4()}_{filename}"
                file_path = os.path.join(self.app.config['UPLOAD_FOLDER'], unique_filename)
                file.save(file_path)
                
                # Process receipt
                from receipt_processor import ReceiptProcessor
                processor = ReceiptProcessor()
                result = processor.process_receipt_image(file_path)
                
                if result['success']:
                    # Save transaction to database
                    transaction = result['transaction']
                    transaction_id = self.db.save_single_transaction(
                        description=transaction['description'],
                        amount=transaction['amount'],
                        date=transaction['date'],
                        category=transaction['category'],
                        confidence=transaction['confidence'],
                        source='receipt_scan'
                    )
                    
                    # Clean up temporary file
                    os.remove(file_path)
                    
                    return jsonify({
                        'success': True,
                        'transaction_id': transaction_id,
                        'transaction': transaction,
                        'processing_time': result['processing_time']
                    })
                else:
                    return jsonify({
                        'success': False,
                        'error': result['error']
                    }), 400
                
            except Exception as e:
                logger.error(f"Error processing receipt: {e}")
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/analyze-ephemeral', methods=['POST'])
        def analyze_ephemeral():
            """Ephemeral document analysis endpoint - zero storage guarantee"""
            try:
                # Check for required headers
                processing_mode = request.headers.get('X-Processing-Mode')
                document_type = request.headers.get('X-Document-Type', 'financial_document')
                session_id = request.headers.get('X-Session-ID')
                
                if processing_mode != 'ephemeral-zero-storage':
                    return jsonify({'error': 'Invalid processing mode'}), 400
                
                if not session_id:
                    session_id = ephemeral_processor.generate_session_id()
                
                # Get file from request
                if 'file' not in request.files:
                    return jsonify({'error': 'No file provided'}), 400
                
                file = request.files['file']
                if file.filename == '':
                    return jsonify({'error': 'No file selected'}), 400
                
                # Read file data into memory
                file_data = file.read()
                filename = file.filename
                
                logger.info(f"🔒 [EPHEMERAL] Processing file: {filename} for session: {session_id}")
                
                # Process document ephemerally
                result = ephemeral_processor.process_document_ephemeral(
                    file_data=file_data,
                    filename=filename,
                    document_type=document_type,
                    session_id=session_id
                )
                
                logger.info(f"🔒 [EPHEMERAL] Processing completed for session: {session_id}")
                
                return jsonify(result)
                
            except Exception as e:
                logger.error(f"🔒 [EPHEMERAL] Processing error: {str(e)}")
                return jsonify({'error': 'Ephemeral processing failed', 'details': str(e)}), 500

        @self.app.route('/api/process-bank-statement-ephemeral', methods=['POST'])
        def process_bank_statement_ephemeral():
            """Process bank statement without storing ANY transaction data"""
            try:
                # Check for required headers
                session_id = request.headers.get('X-Session-ID')
                if not session_id:
                    session_id = ephemeral_bank_processor.generate_session_id()
                
                # Get file from request
                if 'file' not in request.files:
                    return jsonify({'error': 'No file provided'}), 400
                
                file = request.files['file']
                if file.filename == '':
                    return jsonify({'error': 'No file selected'}), 400
                
                logger.info(f"🔒 [EPHEMERAL_BANK] Processing bank statement: {file.filename} for session: {session_id}")
                
                # Process bank statement ephemerally
                result = ephemeral_bank_processor.process_bank_statement_ephemeral(
                    uploaded_file=file,
                    session_id=session_id
                )
                
                logger.info(f"🔒 [EPHEMERAL_BANK] Processing completed for session: {session_id}")
                
                return jsonify(result)
                
            except Exception as e:
                logger.error(f"🔒 [EPHEMERAL_BANK] Processing error: {str(e)}")
                return jsonify({'error': 'Ephemeral bank processing failed', 'details': str(e)}), 500

        @self.app.route('/api/process-credit-card-ephemeral', methods=['POST'])
        def process_credit_card_ephemeral():
            """Analyze credit card usage without storing personal details"""
            try:
                # Check for required headers
                session_id = request.headers.get('X-Session-ID')
                if not session_id:
                    session_id = ephemeral_credit_processor.generate_session_id()
                
                # Get file from request
                if 'file' not in request.files:
                    return jsonify({'error': 'No file provided'}), 400
                
                file = request.files['file']
                if file.filename == '':
                    return jsonify({'error': 'No file selected'}), 400
                
                logger.info(f"🔒 [EPHEMERAL_CREDIT] Processing credit card statement: {file.filename} for session: {session_id}")
                
                # Process credit card statement ephemerally
                result = ephemeral_credit_processor.process_credit_card_ephemeral(
                    uploaded_file=file,
                    session_id=session_id
                )
                
                logger.info(f"🔒 [EPHEMERAL_CREDIT] Processing completed for session: {session_id}")
                
                return jsonify(result)
                
            except Exception as e:
                logger.error(f"🔒 [EPHEMERAL_CREDIT] Processing error: {str(e)}")
                return jsonify({'error': 'Ephemeral credit processing failed', 'details': str(e)}), 500

        @self.app.route('/api/analyze-bank-statement-ephemeral', methods=['POST'])
        @ephemeral_middleware.ephemeral_middleware
        def analyze_bank_statement_ephemeral():
            """Unified bank statement analysis with ephemeral processing"""
            try:
                # Get file from request
                if 'file' not in request.files:
                    return jsonify({'error': 'No file provided'}), 400
                
                file = request.files['file']
                if file.filename == '':
                    return jsonify({'error': 'No file selected'}), 400
                
                # Get session ID from headers or generate new one
                session_id = request.headers.get('X-Session-ID')
                if not session_id:
                    session_id = unified_ephemeral_processor.generate_session_id()
                
                logger.info(f"🔒 [UNIFIED_BANK] Processing bank statement: {file.filename} for session: {session_id}")
                
                # Process using unified ephemeral processor
                result = unified_ephemeral_processor.process_bank_statement_ephemeral(
                    uploaded_file=file,
                    session_id=session_id
                )
                
                logger.info(f"🔒 [UNIFIED_BANK] Processing completed for session: {session_id}")
                
                return jsonify(result)
                
            except Exception as e:
                logger.error(f"🔒 [UNIFIED_BANK] Processing error: {str(e)}")
                return jsonify({'error': 'Unified bank processing failed', 'details': str(e)}), 500

        @self.app.route('/api/analyze-credit-card-ephemeral', methods=['POST'])
        @ephemeral_middleware.ephemeral_middleware
        def analyze_credit_card_ephemeral():
            """Unified credit card analysis with ephemeral processing"""
            try:
                # Get file from request
                if 'file' not in request.files:
                    return jsonify({'error': 'No file provided'}), 400
                
                file = request.files['file']
                if file.filename == '':
                    return jsonify({'error': 'No file selected'}), 400
                
                # Get session ID from headers or generate new one
                session_id = request.headers.get('X-Session-ID')
                if not session_id:
                    session_id = unified_ephemeral_processor.generate_session_id()
                
                logger.info(f"🔒 [UNIFIED_CREDIT] Processing credit card statement: {file.filename} for session: {session_id}")
                
                # Process using unified ephemeral processor
                result = unified_ephemeral_processor.process_credit_card_ephemeral(
                    uploaded_file=file,
                    session_id=session_id
                )
                
                logger.info(f"🔒 [UNIFIED_CREDIT] Processing completed for session: {session_id}")
                
                return jsonify(result)
                
            except Exception as e:
                logger.error(f"🔒 [UNIFIED_CREDIT] Processing error: {str(e)}")
                return jsonify({'error': 'Unified credit processing failed', 'details': str(e)}), 500

        @self.app.route('/api/analyze-investment-ephemeral', methods=['POST'])
        @ephemeral_middleware.ephemeral_middleware
        def analyze_investment_ephemeral():
            """Unified investment analysis with ephemeral processing"""
            try:
                # Get file from request
                if 'file' not in request.files:
                    return jsonify({'error': 'No file provided'}), 400
                
                file = request.files['file']
                if file.filename == '':
                    return jsonify({'error': 'No file selected'}), 400
                
                # Get session ID from headers or generate new one
                session_id = request.headers.get('X-Session-ID')
                if not session_id:
                    session_id = unified_ephemeral_processor.generate_session_id()
                
                logger.info(f"🔒 [UNIFIED_INVESTMENT] Processing investment statement: {file.filename} for session: {session_id}")
                
                # Process using unified ephemeral processor
                result = unified_ephemeral_processor.process_investment_ephemeral(
                    uploaded_file=file,
                    session_id=session_id
                )
                
                logger.info(f"🔒 [UNIFIED_INVESTMENT] Processing completed for session: {session_id}")
                
                return jsonify(result)
                
            except Exception as e:
                logger.error(f"🔒 [UNIFIED_INVESTMENT] Processing error: {str(e)}")
                return jsonify({'error': 'Unified investment processing failed', 'details': str(e)}), 500

        @self.app.route('/api/generate-insights', methods=['POST'])
        @ephemeral_middleware.ephemeral_middleware
        def generate_insights():
            """Generate AI insights from ephemeral data"""
            try:
                data = request.get_json()
                if not data:
                    return jsonify({'error': 'No data provided'}), 400
                
                session_id = request.headers.get('X-Session-ID')
                if not session_id:
                    return jsonify({'error': 'Session ID required'}), 400
                
                logger.info(f"🧠 [INSIGHTS] Generating insights for session: {session_id}")
                
                # Generate insights using AI insight generator
                result = ai_insight_generator.generate_insights_ephemeral(
                    session_data=data,
                    session_id=session_id
                )
                
                logger.info(f"🧠 [INSIGHTS] Insights generated for session: {session_id}")
                
                return jsonify(result)
                
            except Exception as e:
                logger.error(f"🧠 [INSIGHTS] Generation error: {str(e)}")
                return jsonify({'error': 'Insight generation failed', 'details': str(e)}), 500

        @self.app.route('/api/generate-disclaimers', methods=['POST'])
        @ephemeral_middleware.ephemeral_middleware
        def generate_disclaimers():
            """Generate legal disclaimers for ephemeral processing"""
            try:
                data = request.get_json()
                if not data:
                    return jsonify({'error': 'No data provided'}), 400
                
                session_id = request.headers.get('X-Session-ID')
                if not session_id:
                    return jsonify({'error': 'Session ID required'}), 400
                
                logger.info(f"⚖️ [DISCLAIMERS] Generating disclaimers for session: {session_id}")
                
                # Generate disclaimers using legal compliance system
                result = legal_compliance_system.generate_disclaimers_ephemeral(
                    session_data=data,
                    session_id=session_id
                )
                
                logger.info(f"⚖️ [DISCLAIMERS] Disclaimers generated for session: {session_id}")
                
                return jsonify(result)
                
            except Exception as e:
                logger.error(f"⚖️ [DISCLAIMERS] Generation error: {str(e)}")
                return jsonify({'error': 'Disclaimer generation failed', 'details': str(e)}), 500

        @self.app.route('/api/generate-consent-requirements', methods=['POST'])
        @ephemeral_middleware.ephemeral_middleware
        def generate_consent_requirements():
            """Generate consent requirements for ephemeral processing"""
            try:
                data = request.get_json()
                if not data:
                    return jsonify({'error': 'No data provided'}), 400
                
                session_id = request.headers.get('X-Session-ID')
                if not session_id:
                    return jsonify({'error': 'Session ID required'}), 400
                
                logger.info(f"⚖️ [CONSENT] Generating consent requirements for session: {session_id}")
                
                # Generate consent requirements using legal compliance system
                result = legal_compliance_system.generate_consent_requirements_ephemeral(
                    session_data=data,
                    session_id=session_id
                )
                
                logger.info(f"⚖️ [CONSENT] Consent requirements generated for session: {session_id}")
                
                return jsonify(result)
                
            except Exception as e:
                logger.error(f"⚖️ [CONSENT] Generation error: {str(e)}")
                return jsonify({'error': 'Consent requirements generation failed', 'details': str(e)}), 500

        @self.app.route('/api/record-user-consent', methods=['POST'])
        @ephemeral_middleware.ephemeral_middleware
        def record_user_consent():
            """Record user consent for ephemeral processing"""
            try:
                data = request.get_json()
                if not data:
                    return jsonify({'error': 'No data provided'}), 400
                
                session_id = request.headers.get('X-Session-ID')
                if not session_id:
                    return jsonify({'error': 'Session ID required'}), 400
                
                logger.info(f"⚖️ [CONSENT] Recording user consent for session: {session_id}")
                
                # Record user consent using legal compliance system
                result = legal_compliance_system.record_user_consent_ephemeral(
                    consent_data=data,
                    session_id=session_id
                )
                
                logger.info(f"⚖️ [CONSENT] User consent recorded for session: {session_id}")
                
                return jsonify(result)
                
            except Exception as e:
                logger.error(f"⚖️ [CONSENT] Recording error: {str(e)}")
                return jsonify({'error': 'Consent recording failed', 'details': str(e)}), 500

        @self.app.route('/api/generate-compliance-report', methods=['POST'])
        @ephemeral_middleware.ephemeral_middleware
        def generate_compliance_report():
            """Generate compliance report for ephemeral processing"""
            try:
                data = request.get_json()
                if not data:
                    return jsonify({'error': 'No data provided'}), 400
                
                session_id = request.headers.get('X-Session-ID')
                if not session_id:
                    return jsonify({'error': 'Session ID required'}), 400
                
                logger.info(f"⚖️ [COMPLIANCE] Generating compliance report for session: {session_id}")
                
                # Generate compliance report using legal compliance system
                result = legal_compliance_system.generate_compliance_report_ephemeral(
                    session_data=data,
                    session_id=session_id
                )
                
                logger.info(f"⚖️ [COMPLIANCE] Compliance report generated for session: {session_id}")
                
                return jsonify(result)
                
            except Exception as e:
                logger.error(f"⚖️ [COMPLIANCE] Report generation error: {str(e)}")
                return jsonify({'error': 'Compliance report generation failed', 'details': str(e)}), 500

        @self.app.route('/api/compliance-stats', methods=['GET'])
        def get_compliance_stats():
            """Get compliance statistics"""
            try:
                stats = legal_compliance_system.get_compliance_stats()
                return jsonify(stats)
            except Exception as e:
                logger.error(f"⚖️ [COMPLIANCE] Stats error: {str(e)}")
                return jsonify({'error': 'Failed to get compliance stats'}), 500

        @self.app.route('/api/ephemeral-stats', methods=['GET'])
        def get_ephemeral_stats():
            """Get ephemeral processing statistics"""
            try:
                stats = ephemeral_processor.get_processing_stats()
                return jsonify(stats)
            except Exception as e:
                logger.error(f"🔒 [EPHEMERAL] Stats error: {str(e)}")
                return jsonify({'error': 'Failed to get ephemeral stats'}), 500

        @self.app.route('/api/verify-privacy', methods=['GET'])
        def verify_privacy():
            """Verify privacy guarantees are in place"""
            try:
                privacy_status = ephemeral_processor.verify_privacy_guarantees()
                return jsonify(privacy_status)
            except Exception as e:
                logger.error(f"🔒 [PRIVACY] Verification error: {str(e)}")
                return jsonify({'error': 'Privacy verification failed'}), 500

    def allowed_file(self, filename):
        """Check if file extension is allowed"""
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in self.app.config['ALLOWED_EXTENSIONS']

    def get_file_extension(self, filename):
        """Get file extension"""
        return filename.rsplit('.', 1)[1].lower() if '.' in filename else ''

    def run(self, host='0.0.0.0', port=5000, debug=True):
        """Run the Flask application"""
        logger.info(f"🚀 Starting XspensesAI API Server on {host}:{port}")
        self.app.run(host=host, port=port, debug=debug)


if __name__ == '__main__':
    server = XspensesAPIServer()
    server.run() 