"""
AI-powered expense categorizer using OpenAI
"""

import json
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from openai import AsyncOpenAI
from loguru import logger

from ..config import settings


class ExpenseCategorizer:
    """AI-powered expense categorizer using OpenAI"""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL
        self.max_tokens = settings.OPENAI_MAX_TOKENS
        self.temperature = settings.OPENAI_TEMPERATURE
        
        # Standard expense categories
        self.categories = [
            "Food & Dining", "Transportation", "Shopping", "Entertainment",
            "Healthcare", "Utilities", "Housing", "Education", "Travel",
            "Business", "Personal Care", "Insurance", "Investments",
            "Gifts & Donations", "Subscriptions", "Fees & Charges"
        ]
        
        # Category keywords for better context
        self.category_keywords = {
            "Food & Dining": ["restaurant", "cafe", "food", "dining", "meal", "lunch", "dinner", "breakfast", "coffee", "pizza", "burger", "sushi", "mcdonalds", "starbucks", "uber eats", "doordash"],
            "Transportation": ["uber", "lyft", "taxi", "gas", "fuel", "parking", "toll", "bus", "train", "subway", "metro", "car", "auto", "transport"],
            "Shopping": ["amazon", "walmart", "target", "costco", "shop", "store", "mall", "clothing", "shoes", "electronics", "home", "furniture"],
            "Entertainment": ["netflix", "spotify", "movie", "theater", "concert", "game", "sport", "gym", "fitness", "entertainment", "fun"],
            "Healthcare": ["doctor", "hospital", "pharmacy", "medical", "health", "dental", "vision", "insurance", "prescription", "clinic"],
            "Utilities": ["electric", "gas", "water", "internet", "phone", "cable", "utility", "bill", "service"],
            "Housing": ["rent", "mortgage", "home", "house", "apartment", "property", "maintenance", "repair"],
            "Education": ["school", "college", "university", "course", "book", "tuition", "education", "learning", "training"],
            "Travel": ["hotel", "flight", "airline", "vacation", "trip", "travel", "booking", "reservation"],
            "Business": ["office", "supplies", "equipment", "software", "service", "consulting", "business", "work"],
            "Personal Care": ["salon", "spa", "beauty", "hair", "nail", "personal", "care", "grooming"],
            "Insurance": ["insurance", "policy", "premium", "coverage", "protection"],
            "Investments": ["investment", "stock", "fund", "portfolio", "trading", "broker", "financial"],
            "Gifts & Donations": ["gift", "donation", "charity", "nonprofit", "foundation", "giving"],
            "Subscriptions": ["subscription", "monthly", "recurring", "service", "membership"],
            "Fees & Charges": ["fee", "charge", "penalty", "late", "overdraft", "service charge"]
        }
    
    async def categorize_transaction(self, transaction: Dict[str, Any], user_preferences: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Categorize a single transaction using AI"""
        try:
            # Prepare context for AI
            context = self._prepare_context(transaction, user_preferences)
            
            # Create prompt for OpenAI
            prompt = self._create_categorization_prompt(transaction, context)
            
            # Get AI response
            response = await self._get_ai_response(prompt)
            
            # Parse response
            result = self._parse_ai_response(response, transaction)
            
            logger.info(f"Categorized transaction: {transaction.get('description', 'Unknown')} -> {result.get('category', 'Unknown')} (confidence: {result.get('confidence', 0)})")
            
            return result
            
        except Exception as e:
            logger.error(f"Error categorizing transaction: {e}")
            return {
                "category": "Uncategorized",
                "confidence": 0.0,
                "reasoning": f"Error during categorization: {str(e)}",
                "transaction_id": transaction.get('id')
            }
    
    async def categorize_batch(self, transactions: List[Dict[str, Any]], user_preferences: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        """Categorize multiple transactions efficiently"""
        try:
            if not transactions:
                return []
            
            # Prepare batch context
            context = self._prepare_batch_context(transactions, user_preferences)
            
            # Create batch prompt
            prompt = self._create_batch_prompt(transactions, context)
            
            # Get AI response
            response = await self._get_ai_response(prompt)
            
            # Parse batch response
            results = self._parse_batch_response(response, transactions)
            
            logger.info(f"Categorized {len(results)} transactions in batch")
            
            return results
            
        except Exception as e:
            logger.error(f"Error in batch categorization: {e}")
            # Fallback to individual categorization
            return await self._fallback_batch_categorization(transactions, user_preferences)
    
    def _prepare_context(self, transaction: Dict[str, Any], user_preferences: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Prepare context for AI categorization"""
        context = {
            "categories": self.categories,
            "category_keywords": self.category_keywords,
            "transaction_info": {
                "description": transaction.get('description', ''),
                "amount": transaction.get('amount', 0),
                "date": transaction.get('transaction_date'),
                "merchant": transaction.get('merchant_name', ''),
                "type": transaction.get('transaction_type', '')
            }
        }
        
        # Add user preferences if available
        if user_preferences:
            context["user_preferences"] = self._format_user_preferences(user_preferences)
        
        return context
    
    def _prepare_batch_context(self, transactions: List[Dict[str, Any]], user_preferences: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Prepare context for batch categorization"""
        context = {
            "categories": self.categories,
            "category_keywords": self.category_keywords,
            "batch_size": len(transactions),
            "transaction_summary": self._create_transaction_summary(transactions)
        }
        
        if user_preferences:
            context["user_preferences"] = self._format_user_preferences(user_preferences)
        
        return context
    
    def _format_user_preferences(self, preferences: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format user preferences for AI context"""
        formatted = []
        for pref in preferences:
            formatted.append({
                "merchant": pref.get('merchant_pattern', ''),
                "preferred_category": pref.get('preferred_category', ''),
                "confidence": pref.get('learning_weight', 1.0),
                "correction_count": pref.get('correction_count', 1)
            })
        return formatted
    
    def _create_transaction_summary(self, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create summary of transactions for batch processing"""
        if not transactions:
            return {}
        
        descriptions = [t.get('description', '') for t in transactions]
        amounts = [t.get('amount', 0) for t in transactions if t.get('amount')]
        
        return {
            "total_transactions": len(transactions),
            "common_merchants": self._find_common_merchants(descriptions),
            "amount_range": {
                "min": min(amounts) if amounts else 0,
                "max": max(amounts) if amounts else 0,
                "average": sum(amounts) / len(amounts) if amounts else 0
            }
        }
    
    def _find_common_merchants(self, descriptions: List[str]) -> List[str]:
        """Find common merchant patterns in descriptions"""
        merchant_patterns = {}
        
        for desc in descriptions:
            # Extract potential merchant names (first few words)
            words = desc.split()[:3]
            merchant = ' '.join(words).upper()
            
            if len(merchant) > 2:
                merchant_patterns[merchant] = merchant_patterns.get(merchant, 0) + 1
        
        # Return most common merchants
        sorted_merchants = sorted(merchant_patterns.items(), key=lambda x: x[1], reverse=True)
        return [merchant for merchant, count in sorted_merchants[:5] if count > 1]
    
    def _create_categorization_prompt(self, transaction: Dict[str, Any], context: Dict[str, Any]) -> str:
        """Create prompt for single transaction categorization"""
        description = transaction.get('description', '')
        amount = transaction.get('amount', 0)
        date = transaction.get('transaction_date')
        
        prompt = f"""
You are an AI assistant that categorizes financial transactions. Analyze the following transaction and assign it to the most appropriate category.

Available Categories: {', '.join(context['categories'])}

Transaction Details:
- Description: {description}
- Amount: ${amount:.2f}
- Date: {date}

User Preferences (if any):
{self._format_preferences_for_prompt(context.get('user_preferences', []))}

Instructions:
1. Analyze the transaction description and amount
2. Consider user preferences for similar merchants
3. Choose the most appropriate category from the list
4. Provide a confidence score (0.0 to 1.0)
5. Give a brief reasoning for your choice

Respond in JSON format:
{{
    "category": "Category Name",
    "confidence": 0.85,
    "reasoning": "Brief explanation of categorization decision"
}}
"""
        return prompt
    
    def _create_batch_prompt(self, transactions: List[Dict[str, Any]], context: Dict[str, Any]) -> str:
        """Create prompt for batch transaction categorization"""
        transactions_text = ""
        for i, transaction in enumerate(transactions, 1):
            desc = transaction.get('description', '')
            amount = transaction.get('amount', 0)
            transactions_text += f"{i}. {desc} - ${amount:.2f}\n"
        
        prompt = f"""
You are an AI assistant that categorizes financial transactions. Analyze the following batch of transactions and assign each to the most appropriate category.

Available Categories: {', '.join(context['categories'])}

Transactions:
{transactions_text}

User Preferences (if any):
{self._format_preferences_for_prompt(context.get('user_preferences', []))}

Instructions:
1. Analyze each transaction description and amount
2. Consider user preferences for similar merchants
3. Choose the most appropriate category for each transaction
4. Provide a confidence score (0.0 to 1.0) for each
5. Give brief reasoning for each categorization

Respond in JSON format:
{{
    "categorizations": [
        {{
            "transaction_index": 1,
            "category": "Category Name",
            "confidence": 0.85,
            "reasoning": "Brief explanation"
        }}
    ]
}}
"""
        return prompt
    
    def _format_preferences_for_prompt(self, preferences: List[Dict[str, Any]]) -> str:
        """Format user preferences for prompt inclusion"""
        if not preferences:
            return "No specific user preferences available."
        
        formatted = "User has previously categorized:\n"
        for pref in preferences[:5]:  # Limit to top 5 preferences
            formatted += f"- {pref.get('merchant', '')} → {pref.get('preferred_category', '')}\n"
        
        return formatted
    
    async def _get_ai_response(self, prompt: str) -> str:
        """Get response from OpenAI"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a financial transaction categorization expert. Always respond with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error getting AI response: {e}")
            raise
    
    def _parse_ai_response(self, response: str, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """Parse AI response for single transaction"""
        try:
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if not json_match:
                raise ValueError("No JSON found in response")
            
            data = json.loads(json_match.group())
            
            return {
                "category": data.get("category", "Uncategorized"),
                "confidence": float(data.get("confidence", 0.0)),
                "reasoning": data.get("reasoning", "No reasoning provided"),
                "transaction_id": transaction.get('id'),
                "ai_model": self.model
            }
            
        except Exception as e:
            logger.error(f"Error parsing AI response: {e}")
            return {
                "category": "Uncategorized",
                "confidence": 0.0,
                "reasoning": f"Error parsing response: {str(e)}",
                "transaction_id": transaction.get('id')
            }
    
    def _parse_batch_response(self, response: str, transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Parse AI response for batch transactions"""
        try:
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if not json_match:
                raise ValueError("No JSON found in response")
            
            data = json.loads(json_match.group())
            categorizations = data.get("categorizations", [])
            
            results = []
            for cat in categorizations:
                index = cat.get("transaction_index", 1) - 1
                if 0 <= index < len(transactions):
                    transaction = transactions[index]
                    results.append({
                        "category": cat.get("category", "Uncategorized"),
                        "confidence": float(cat.get("confidence", 0.0)),
                        "reasoning": cat.get("reasoning", "No reasoning provided"),
                        "transaction_id": transaction.get('id'),
                        "ai_model": self.model
                    })
            
            return results
            
        except Exception as e:
            logger.error(f"Error parsing batch AI response: {e}")
            return await self._fallback_batch_categorization(transactions)
    
    async def _fallback_batch_categorization(self, transactions: List[Dict[str, Any]], user_preferences: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        """Fallback to individual categorization if batch fails"""
        logger.warning("Falling back to individual transaction categorization")
        
        results = []
        for transaction in transactions:
            result = await self.categorize_transaction(transaction, user_preferences)
            results.append(result)
        
        return results 