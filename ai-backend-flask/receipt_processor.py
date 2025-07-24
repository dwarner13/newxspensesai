#!/usr/bin/env python3
"""
Receipt Processing Module
Handles receipt image analysis and transaction extraction
"""

import cv2
import numpy as np
import pytesseract
from PIL import Image
import re
import json
from datetime import datetime
from typing import Dict, List, Optional
import os

class ReceiptProcessor:
    def __init__(self):
        # Configure pytesseract path for Windows
        if os.name == 'nt':  # Windows
            pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        
        self.merchant_patterns = [
            r'([A-Z][A-Z\s&]+(?:STORE|MARKET|SHOP|RESTAURANT|CAFE|PIZZA|BURGER|GAS|STATION))',
            r'([A-Z][A-Z\s&]+(?:WALMART|TARGET|COSTCO|SAFEWAY|KROGER|ALBERTSONS))',
            r'([A-Z][A-Z\s&]+(?:MCDONALDS|BURGER KING|WENDYS|SUBWAY|STARBUCKS))',
            r'([A-Z][A-Z\s&]+(?:SHELL|EXXON|CHEVRON|BP|MARATHON))',
        ]
        
        self.amount_patterns = [
            r'TOTAL[\s:]*\$?(\d+\.\d{2})',
            r'AMOUNT[\s:]*\$?(\d+\.\d{2})',
            r'BALANCE[\s:]*\$?(\d+\.\d{2})',
            r'DUE[\s:]*\$?(\d+\.\d{2})',
            r'GRAND TOTAL[\s:]*\$?(\d+\.\d{2})',
            r'SUBTOTAL[\s:]*\$?(\d+\.\d{2})',
        ]
        
        self.date_patterns = [
            r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})',
            r'(\d{4})-(\d{1,2})-(\d{1,2})',
            r'(\w{3})\s+(\d{1,2}),?\s+(\d{4})',
        ]
    
    def process_receipt_image(self, image_path: str) -> Dict:
        """
        Process a receipt image and extract transaction details
        """
        try:
            # Load and preprocess image
            image = self._load_and_preprocess_image(image_path)
            
            # Extract text from image
            text = self._extract_text(image)
            
            # Parse receipt data
            receipt_data = self._parse_receipt_text(text)
            
            # Create transaction object
            transaction = self._create_transaction(receipt_data)
            
            return {
                'success': True,
                'transaction': transaction,
                'raw_text': text,
                'confidence': self._calculate_confidence(receipt_data),
                'processing_time': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'processing_time': datetime.now().isoformat()
            }
    
    def _load_and_preprocess_image(self, image_path: str) -> np.ndarray:
        """
        Load and preprocess image for better OCR
        """
        # Load image
        image = cv2.imread(image_path)
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply noise reduction
        denoised = cv2.fastNlMeansDenoising(gray)
        
        # Apply threshold to get binary image
        _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Apply morphological operations to clean up
        kernel = np.ones((1, 1), np.uint8)
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        
        return cleaned
    
    def _extract_text(self, image: np.ndarray) -> str:
        """
        Extract text from preprocessed image using OCR
        """
        # Configure OCR parameters
        custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz\s\.\,\$\-\/\(\)'
        
        # Extract text
        text = pytesseract.image_to_string(image, config=custom_config)
        
        return text.upper()
    
    def _parse_receipt_text(self, text: str) -> Dict:
        """
        Parse extracted text to find receipt details
        """
        receipt_data = {
            'merchant': None,
            'amount': None,
            'date': None,
            'items': [],
            'tax': None,
            'subtotal': None
        }
        
        lines = text.split('\n')
        
        # Find merchant name
        receipt_data['merchant'] = self._extract_merchant(lines)
        
        # Find total amount
        receipt_data['amount'] = self._extract_amount(text)
        
        # Find date
        receipt_data['date'] = self._extract_date(text)
        
        # Find items
        receipt_data['items'] = self._extract_items(lines)
        
        # Find tax and subtotal
        receipt_data['tax'] = self._extract_tax(text)
        receipt_data['subtotal'] = self._extract_subtotal(text)
        
        return receipt_data
    
    def _extract_merchant(self, lines: List[str]) -> Optional[str]:
        """
        Extract merchant name from receipt lines
        """
        # Look for merchant in first few lines
        for i, line in enumerate(lines[:5]):
            line = line.strip()
            if len(line) > 3 and len(line) < 50:
                # Check if line matches merchant patterns
                for pattern in self.merchant_patterns:
                    match = re.search(pattern, line)
                    if match:
                        return match.group(1).strip()
                
                # If no pattern match, use first substantial line
                if not any(char.isdigit() for char in line) and line.isupper():
                    return line
        
        return "UNKNOWN MERCHANT"
    
    def _extract_amount(self, text: str) -> Optional[float]:
        """
        Extract total amount from receipt text
        """
        # Look for total amount patterns
        for pattern in self.amount_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    continue
        
        # Look for any dollar amount at the end of lines
        dollar_pattern = r'\$(\d+\.\d{2})'
        matches = re.findall(dollar_pattern, text)
        
        if matches:
            # Return the largest amount (likely the total)
            amounts = [float(match) for match in matches]
            return max(amounts)
        
        return None
    
    def _extract_date(self, text: str) -> Optional[str]:
        """
        Extract date from receipt text
        """
        for pattern in self.date_patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    if len(match.groups()) == 3:
                        if len(match.group(3)) == 2:  # YY format
                            year = f"20{match.group(3)}"
                        else:
                            year = match.group(3)
                        
                        month = match.group(2).zfill(2)
                        day = match.group(1).zfill(2)
                        
                        return f"{year}-{month}-{day}"
                except (ValueError, IndexError):
                    continue
        
        return None
    
    def _extract_items(self, lines: List[str]) -> List[Dict]:
        """
        Extract individual items from receipt
        """
        items = []
        
        for line in lines:
            line = line.strip()
            
            # Look for item patterns (description followed by price)
            item_pattern = r'^(.+?)\s+\$?(\d+\.\d{2})$'
            match = re.search(item_pattern, line)
            
            if match and len(match.group(1)) > 2:
                items.append({
                    'description': match.group(1).strip(),
                    'amount': float(match.group(2))
                })
        
        return items
    
    def _extract_tax(self, text: str) -> Optional[float]:
        """
        Extract tax amount from receipt
        """
        tax_patterns = [
            r'TAX[\s:]*\$?(\d+\.\d{2})',
            r'SALES TAX[\s:]*\$?(\d+\.\d{2})',
        ]
        
        for pattern in tax_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    continue
        
        return None
    
    def _extract_subtotal(self, text: str) -> Optional[float]:
        """
        Extract subtotal from receipt
        """
        subtotal_patterns = [
            r'SUBTOTAL[\s:]*\$?(\d+\.\d{2})',
            r'SUB TOTAL[\s:]*\$?(\d+\.\d{2})',
        ]
        
        for pattern in subtotal_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    continue
        
        return None
    
    def _create_transaction(self, receipt_data: Dict) -> Dict:
        """
        Create transaction object from parsed receipt data
        """
        # Determine category based on merchant
        category = self._categorize_merchant(receipt_data['merchant'])
        
        # Create description
        if receipt_data['items']:
            description = f"{receipt_data['merchant']} - {receipt_data['items'][0]['description']}"
        else:
            description = receipt_data['merchant']
        
        transaction = {
            'id': None,  # Will be set by database
            'description': description,
            'amount': -receipt_data['amount'] if receipt_data['amount'] else 0,
            'date': receipt_data['date'] or datetime.now().strftime('%Y-%m-%d'),
            'category': category,
            'confidence': 0.85,  # Base confidence for receipt scanning
            'source': 'receipt_scan',
            'merchant': receipt_data['merchant'],
            'items': receipt_data['items'],
            'tax': receipt_data['tax'],
            'subtotal': receipt_data['subtotal']
        }
        
        return transaction
    
    def _categorize_merchant(self, merchant: str) -> str:
        """
        Categorize merchant based on name patterns
        """
        merchant_upper = merchant.upper()
        
        # Grocery stores
        grocery_keywords = ['WALMART', 'TARGET', 'COSTCO', 'SAFEWAY', 'KROGER', 'ALBERTSONS', 'MARKET', 'FOOD', 'GROCERY']
        if any(keyword in merchant_upper for keyword in grocery_keywords):
            return 'Food & Dining'
        
        # Restaurants
        restaurant_keywords = ['MCDONALDS', 'BURGER', 'PIZZA', 'RESTAURANT', 'CAFE', 'STARBUCKS', 'SUBWAY', 'WENDYS']
        if any(keyword in merchant_upper for keyword in restaurant_keywords):
            return 'Food & Dining'
        
        # Gas stations
        gas_keywords = ['SHELL', 'EXXON', 'CHEVRON', 'BP', 'MARATHON', 'GAS', 'STATION']
        if any(keyword in merchant_upper for keyword in gas_keywords):
            return 'Transportation'
        
        # Default category
        return 'Shopping'
    
    def _calculate_confidence(self, receipt_data: Dict) -> float:
        """
        Calculate confidence score based on extracted data quality
        """
        confidence = 0.0
        
        # Base confidence
        if receipt_data['merchant']:
            confidence += 0.3
        
        if receipt_data['amount']:
            confidence += 0.3
        
        if receipt_data['date']:
            confidence += 0.2
        
        if receipt_data['items']:
            confidence += 0.2
        
        return min(confidence, 0.95)  # Cap at 95% 