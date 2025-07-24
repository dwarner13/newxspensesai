"""
Smart Document Reader - Reads ANY bank statement format (PDF, CSV, images)
"""

import os
import re
import pandas as pd
import pdfplumber
import PyPDF2
from PIL import Image
import pytesseract
from typing import List, Dict, Any, Optional
from datetime import datetime
import chardet
from loguru import logger
import logging

# Configure detailed logging for document reader
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/document_reader.log'),
        logging.StreamHandler()
    ]
)


class DocumentReader:
    """Smart document reader for bank statements and financial documents"""
    
    def __init__(self):
        logger.info("Initializing DocumentReader...")
        self.supported_formats = {
            'pdf': self._read_pdf,
            'csv': self._read_csv,
            'xlsx': self._read_excel,
            'xls': self._read_excel,
            'jpg': self._read_image,
            'jpeg': self._read_image,
            'png': self._read_image
        }
        
        # Common bank statement patterns
        self.transaction_patterns = [
            # Date Description Amount pattern
            r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+([^$]+?)\s+([$]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',
            # Amount Date Description pattern  
            r'([$]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+([^$]+)',
            # Description Amount Date pattern
            r'([^$]+?)\s+([$]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
        ]
        logger.info("DocumentReader initialized successfully")
    
    def read_document(self, file_path: str) -> Dict[str, Any]:
        """Read any document and extract transactions"""
        logger.info(f"=== STARTING DOCUMENT READING: {file_path} ===")
        
        try:
            file_extension = self._get_file_extension(file_path)
            logger.info(f"File extension detected: {file_extension}")
            
            if file_extension not in self.supported_formats:
                logger.error(f"Unsupported file type: {file_extension}")
                raise ValueError(f"Unsupported file type: {file_extension}")
            
            logger.info(f"Reading document: {file_path}")
            
            # Read the document
            reader_func = self.supported_formats[file_extension]
            logger.info(f"Using reader function: {reader_func.__name__}")
            
            transactions = reader_func(file_path)
            logger.info(f"Extracted {len(transactions)} transactions from document")
            
            # Calculate extraction confidence
            confidence = self._calculate_extraction_confidence(transactions)
            logger.info(f"Extraction confidence: {confidence}")
            
            result = {
                "transactions": transactions,
                "total_transactions": len(transactions),
                "extraction_confidence": confidence,
                "file_type": file_extension,
                "processing_method": f"{file_extension}_reader"
            }
            
            logger.info(f"=== DOCUMENT READING COMPLETE ===")
            logger.info(f"Result: {result}")
            
            return result
            
        except Exception as e:
            logger.error(f"=== DOCUMENT READING FAILED ===")
            logger.error(f"Error reading document {file_path}: {e}")
            logger.error(f"Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    def _read_pdf(self, file_path: str) -> List[Dict[str, Any]]:
        """Read PDF bank statements"""
        logger.info(f"=== READING PDF: {file_path} ===")
        transactions = []
        
        try:
            # Try pdfplumber first (better for tables)
            logger.info("Attempting to read PDF with pdfplumber...")
            with pdfplumber.open(file_path) as pdf:
                logger.info(f"PDF opened successfully. Pages: {len(pdf.pages)}")
                
                for page_num, page in enumerate(pdf.pages):
                    logger.info(f"Processing PDF page {page_num + 1}")
                    
                    # Extract text
                    logger.info("Extracting text from page...")
                    text = page.extract_text()
                    logger.info(f"Text extracted: {len(text) if text else 0} characters")
                    
                    if text:
                        logger.info("Processing text for transactions...")
                        text_transactions = self._extract_from_text(text)
                        logger.info(f"Found {len(text_transactions)} transactions in text")
                        transactions.extend(text_transactions)
                    
                    # Extract tables
                    logger.info("Extracting tables from page...")
                    tables = page.extract_tables()
                    logger.info(f"Found {len(tables)} tables on page")
                    
                    for table_idx, table in enumerate(tables):
                        logger.info(f"Processing table {table_idx + 1}")
                        table_transactions = self._parse_table_data(table)
                        logger.info(f"Found {len(table_transactions)} transactions in table")
                        transactions.extend(table_transactions)
            
            # If pdfplumber didn't work well, try PyPDF2
            if not transactions:
                logger.info("No transactions found with pdfplumber, trying PyPDF2 as fallback...")
                with open(file_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    logger.info(f"PyPDF2 opened PDF with {len(pdf_reader.pages)} pages")
                    
                    for page_num, page in enumerate(pdf_reader.pages):
                        logger.info(f"Processing PyPDF2 page {page_num + 1}")
                        text = page.extract_text()
                        logger.info(f"PyPDF2 text extracted: {len(text) if text else 0} characters")
                        
                        if text:
                            text_transactions = self._extract_from_text(text)
                            logger.info(f"PyPDF2 found {len(text_transactions)} transactions")
                            transactions.extend(text_transactions)
            
            # Remove duplicates
            logger.info("Removing duplicate transactions...")
            original_count = len(transactions)
            transactions = self._deduplicate_transactions(transactions)
            logger.info(f"Removed {original_count - len(transactions)} duplicate transactions")
            
            logger.info(f"=== PDF READING COMPLETE: {len(transactions)} transactions ===")
            return transactions
            
        except Exception as e:
            logger.error(f"=== PDF READING FAILED ===")
            logger.error(f"Error reading PDF {file_path}: {e}")
            logger.error(f"Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    def _read_csv(self, file_path: str) -> List[Dict[str, Any]]:
        """Read CSV bank statements"""
        try:
            # Detect encoding
            with open(file_path, 'rb') as f:
                raw_data = f.read()
                detected = chardet.detect(raw_data)
                encoding = detected['encoding']
            
            # Read CSV
            df = pd.read_csv(file_path, encoding=encoding)
            
            # Parse the dataframe
            transactions = self._parse_dataframe(df)
            
            logger.info(f"Extracted {len(transactions)} transactions from CSV")
            return transactions
            
        except Exception as e:
            logger.error(f"Error reading CSV {file_path}: {e}")
            raise
    
    def _read_excel(self, file_path: str) -> List[Dict[str, Any]]:
        """Read Excel bank statements"""
        try:
            # Read Excel file
            df = pd.read_excel(file_path)
            
            # Parse the dataframe
            transactions = self._parse_dataframe(df)
            
            logger.info(f"Extracted {len(transactions)} transactions from Excel")
            return transactions
            
        except Exception as e:
            logger.error(f"Error reading Excel {file_path}: {e}")
            raise
    
    def _read_image(self, file_path: str) -> List[Dict[str, Any]]:
        """Read receipt images using OCR"""
        try:
            # Open image
            image = Image.open(file_path)
            
            # Extract text using OCR
            text = pytesseract.image_to_string(image)
            
            # Extract transactions from OCR text
            transactions = self._extract_from_text(text)
            
            logger.info(f"Extracted {len(transactions)} transactions from image")
            return transactions
            
        except Exception as e:
            logger.error(f"Error reading image {file_path}: {e}")
            raise
    
    def _parse_dataframe(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Parse pandas DataFrame to extract transactions"""
        transactions = []
        
        # Identify columns
        column_mapping = self._identify_columns(df.columns.tolist())
        
        for _, row in df.iterrows():
            transaction = self._create_transaction_from_row(row.tolist(), column_mapping)
            if transaction:
                transactions.append(transaction)
        
        return transactions
    
    def _parse_table_data(self, table: List[List[str]]) -> List[Dict[str, Any]]:
        """Parse table data to extract transactions"""
        transactions = []
        
        if not table or len(table) < 2:
            return transactions
        
        # Try to identify headers
        headers = table[0]
        data_rows = table[1:]
        
        # Map common column names
        column_mapping = self._identify_columns(headers)
        
        for row in data_rows:
            if len(row) < 3:  # Need at least date, description, amount
                continue
                
            transaction = self._create_transaction_from_row(row, column_mapping)
            if transaction:
                transactions.append(transaction)
        
        return transactions
    
    def _identify_columns(self, headers: List[str]) -> Dict[str, int]:
        """Identify transaction columns in headers"""
        column_mapping = {}
        
        for i, header in enumerate(headers):
            header_lower = str(header).lower()
            
            # Date columns
            if any(word in header_lower for word in ['date', 'transaction_date', 'posted_date', 'trans_date']):
                column_mapping['date'] = i
            
            # Description columns
            elif any(word in header_lower for word in ['description', 'memo', 'payee', 'merchant', 'details', 'transaction']):
                column_mapping['description'] = i
            
            # Amount columns
            elif any(word in header_lower for word in ['amount', 'debit', 'credit', 'balance', 'withdrawal', 'deposit']):
                column_mapping['amount'] = i
            
            # Reference columns
            elif any(word in header_lower for word in ['reference', 'ref', 'transaction_id', 'check_no']):
                column_mapping['reference'] = i
        
        return column_mapping
    
    def _create_transaction_from_row(self, row: List[str], column_mapping: Dict[str, int]) -> Optional[Dict[str, Any]]:
        """Create transaction dictionary from row data"""
        try:
            transaction = {}
            
            # Extract date
            if 'date' in column_mapping:
                date_str = str(row[column_mapping['date']])
                transaction['transaction_date'] = self._parse_date(date_str)
            
            # Extract description
            if 'description' in column_mapping:
                transaction['description'] = str(row[column_mapping['description']]).strip()
            
            # Extract amount
            if 'amount' in column_mapping:
                amount_str = str(row[column_mapping['amount']])
                transaction['amount'] = self._parse_amount(amount_str)
            
            # Extract reference
            if 'reference' in column_mapping:
                transaction['reference_number'] = str(row[column_mapping['reference']]).strip()
            
            # Validate required fields
            if not all(key in transaction for key in ['transaction_date', 'description', 'amount']):
                return None
            
            return transaction
            
        except Exception as e:
            logger.warning(f"Error creating transaction from row: {e}")
            return None
    
    def _extract_from_text(self, text: str) -> List[Dict[str, Any]]:
        """Extract transactions from text using regex patterns"""
        transactions = []
        
        for pattern in self.transaction_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE)
            for match in matches:
                try:
                    if len(match.groups()) == 3:
                        if '$' in match.group(1):
                            # Amount Date Description
                            amount = self._parse_amount(match.group(1))
                            date = self._parse_date(match.group(2))
                            description = match.group(3).strip()
                        elif '$' in match.group(2):
                            # Date Amount Description
                            date = self._parse_date(match.group(1))
                            amount = self._parse_amount(match.group(2))
                            description = match.group(3).strip()
                        else:
                            # Date Description Amount
                            date = self._parse_date(match.group(1))
                            description = match.group(2).strip()
                            amount = self._parse_amount(match.group(3))
                        
                        if date and description and amount is not None:
                            transactions.append({
                                'transaction_date': date,
                                'description': description,
                                'amount': amount
                            })
                except Exception as e:
                    logger.warning(f"Error parsing transaction match: {e}")
                    continue
        
        return transactions
    
    def _parse_date(self, date_str: str) -> Optional[str]:
        """Parse various date formats"""
        if not date_str:
            return None
        
        date_formats = [
            '%m/%d/%Y', '%m/%d/%y', '%m-%d-%Y', '%m-%d-%y',
            '%Y-%m-%d', '%d/%m/%Y', '%d/%m/%y', '%d-%m-%Y', '%d-%m-%y'
        ]
        
        cleaned_date = date_str.strip()
        
        for fmt in date_formats:
            try:
                parsed_date = datetime.strptime(cleaned_date, fmt)
                return parsed_date.strftime('%Y-%m-%d')
            except ValueError:
                continue
        
        return None
    
    def _parse_amount(self, amount_str: str) -> Optional[float]:
        """Parse amount string to float"""
        try:
            if not amount_str:
                return None
            
            # Remove currency symbols and commas
            cleaned = re.sub(r'[$,]', '', amount_str.strip())
            return float(cleaned)
        except (ValueError, TypeError):
            return None
    
    def _deduplicate_transactions(self, transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate transactions"""
        seen = set()
        unique_transactions = []
        
        for transaction in transactions:
            # Create a unique key for each transaction
            key = (
                transaction.get('transaction_date'),
                transaction.get('description', '').strip(),
                transaction.get('amount')
            )
            
            if key not in seen:
                seen.add(key)
                unique_transactions.append(transaction)
        
        return unique_transactions
    
    def _calculate_extraction_confidence(self, transactions: List[Dict[str, Any]]) -> float:
        """Calculate confidence score for extraction"""
        if not transactions:
            return 0.0
        
        # Simple confidence calculation based on data quality
        valid_transactions = 0
        total_score = 0.0
        
        for transaction in transactions:
            score = 0.0
            
            # Check required fields
            if transaction.get('transaction_date'):
                score += 0.4
            if transaction.get('description'):
                score += 0.3
            if transaction.get('amount') is not None:
                score += 0.3
            
            total_score += score
            if score > 0.8:
                valid_transactions += 1
        
        # Calculate overall confidence
        if len(transactions) > 0:
            confidence = total_score / len(transactions)
            # Boost confidence if most transactions are valid
            if valid_transactions / len(transactions) > 0.8:
                confidence = min(confidence * 1.2, 1.0)
            return confidence
        
        return 0.0
    
    def _get_file_extension(self, file_path: str) -> str:
        """Get file extension from path"""
        return os.path.splitext(file_path)[1].lower().lstrip('.') 