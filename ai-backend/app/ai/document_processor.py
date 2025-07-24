"""
Smart document processor for extracting transactions from various file formats
"""

import os
import re
import pandas as pd
import pdfplumber
import pytesseract
from PIL import Image
from typing import List, Dict, Any, Optional
from datetime import datetime
import chardet
from loguru import logger

from ..config import settings


class DocumentProcessor:
    """Smart document processor for extracting financial transactions"""
    
    def __init__(self):
        self.supported_formats = {
            'pdf': self._process_pdf,
            'csv': self._process_csv,
            'xlsx': self._process_excel',
            'xls': self._process_excel',
            'jpg': self._process_image,
            'jpeg': self._process_image,
            'png': self._process_image
        }
    
    async def process_document(self, file_path: str, file_type: str) -> Dict[str, Any]:
        """Process a document and extract transactions"""
        try:
            logger.info(f"Processing document: {file_path}")
            
            if file_type.lower() not in self.supported_formats:
                raise ValueError(f"Unsupported file type: {file_type}")
            
            # Process the document based on its type
            processor = self.supported_formats[file_type.lower()]
            transactions = await processor(file_path)
            
            # Calculate extraction confidence
            confidence = self._calculate_extraction_confidence(transactions)
            
            return {
                "transactions": transactions,
                "total_transactions": len(transactions),
                "extraction_confidence": confidence,
                "processing_method": file_type.lower(),
                "metadata": self._extract_metadata(file_path, file_type, transactions)
            }
            
        except Exception as e:
            logger.error(f"Error processing document {file_path}: {e}")
            raise
    
    async def _process_pdf(self, file_path: str) -> List[Dict[str, Any]]:
        """Extract transactions from PDF bank statements"""
        transactions = []
        
        try:
            with pdfplumber.open(file_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    logger.info(f"Processing PDF page {page_num + 1}")
                    
                    # Extract text from page
                    text = page.extract_text()
                    if not text:
                        continue
                    
                    # Try to extract tables
                    tables = page.extract_tables()
                    if tables:
                        for table in tables:
                            table_transactions = self._parse_table_data(table)
                            transactions.extend(table_transactions)
                    
                    # Also try to extract from text using regex patterns
                    text_transactions = self._extract_from_text(text)
                    transactions.extend(text_transactions)
            
            # Remove duplicates and validate
            transactions = self._deduplicate_transactions(transactions)
            return transactions
            
        except Exception as e:
            logger.error(f"Error processing PDF {file_path}: {e}")
            raise
    
    async def _process_csv(self, file_path: str) -> List[Dict[str, Any]]:
        """Extract transactions from CSV files"""
        try:
            # Detect encoding
            with open(file_path, 'rb') as f:
                raw_data = f.read()
                detected = chardet.detect(raw_data)
                encoding = detected['encoding']
            
            # Read CSV with detected encoding
            df = pd.read_csv(file_path, encoding=encoding)
            
            # Try to identify transaction columns
            transactions = self._parse_dataframe(df)
            return transactions
            
        except Exception as e:
            logger.error(f"Error processing CSV {file_path}: {e}")
            raise
    
    async def _process_excel(self, file_path: str) -> List[Dict[str, Any]]:
        """Extract transactions from Excel files"""
        try:
            # Read Excel file
            df = pd.read_excel(file_path)
            
            # Parse the dataframe
            transactions = self._parse_dataframe(df)
            return transactions
            
        except Exception as e:
            logger.error(f"Error processing Excel {file_path}: {e}")
            raise
    
    async def _process_image(self, file_path: str) -> List[Dict[str, Any]]:
        """Extract transactions from receipt images using OCR"""
        try:
            # Open image
            image = Image.open(file_path)
            
            # Extract text using OCR
            text = pytesseract.image_to_string(image)
            
            # Extract transactions from OCR text
            transactions = self._extract_from_text(text)
            return transactions
            
        except Exception as e:
            logger.error(f"Error processing image {file_path}: {e}")
            raise
    
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
    
    def _identify_columns(self, headers: List[str]) -> Dict[str, int]:
        """Identify transaction columns in headers"""
        column_mapping = {}
        
        for i, header in enumerate(headers):
            header_lower = str(header).lower()
            
            # Date columns
            if any(word in header_lower for word in ['date', 'transaction_date', 'posted_date']):
                column_mapping['date'] = i
            
            # Description columns
            elif any(word in header_lower for word in ['description', 'memo', 'payee', 'merchant', 'details']):
                column_mapping['description'] = i
            
            # Amount columns
            elif any(word in header_lower for word in ['amount', 'debit', 'credit', 'balance']):
                column_mapping['amount'] = i
            
            # Reference columns
            elif any(word in header_lower for word in ['reference', 'ref', 'transaction_id']):
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
        
        # Common transaction patterns
        patterns = [
            # Date Description Amount pattern
            r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+([^$]+?)\s+([$]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',
            # Amount Date Description pattern
            r'([$]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+([^$]+)',
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE)
            for match in matches:
                try:
                    if len(match.groups()) == 3:
                        if '$' in match.group(1):
                            # Amount Date Description
                            amount = self._parse_amount(match.group(1))
                            date = self._parse_date(match.group(2))
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
    
    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse various date formats"""
        date_formats = [
            '%m/%d/%Y', '%m/%d/%y', '%m-%d-%Y', '%m-%d-%y',
            '%Y-%m-%d', '%d/%m/%Y', '%d/%m/%y', '%d-%m-%Y', '%d-%m-%y'
        ]
        
        for fmt in date_formats:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue
        
        return None
    
    def _parse_amount(self, amount_str: str) -> Optional[float]:
        """Parse amount string to float"""
        try:
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
    
    def _extract_metadata(self, file_path: str, file_type: str, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract metadata from the document"""
        metadata = {
            'file_type': file_type,
            'file_size': os.path.getsize(file_path),
            'total_transactions': len(transactions)
        }
        
        if transactions:
            # Extract date range
            dates = [t.get('transaction_date') for t in transactions if t.get('transaction_date')]
            if dates:
                metadata['date_range'] = {
                    'start': min(dates).isoformat(),
                    'end': max(dates).isoformat()
                }
            
            # Extract amount statistics
            amounts = [t.get('amount') for t in transactions if t.get('amount') is not None]
            if amounts:
                metadata['amount_stats'] = {
                    'total': sum(amounts),
                    'average': sum(amounts) / len(amounts),
                    'min': min(amounts),
                    'max': max(amounts)
                }
        
        return metadata 