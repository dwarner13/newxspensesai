"""
AI Expense Categorizer - Uses OpenAI to intelligently categorize transactions
"""

import json
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from openai import OpenAI
from loguru import logger
import os
import logging

# Configure detailed logging for AI categorizer
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/ai_categorizer.log'),
        logging.StreamHandler()
    ]
)


class AICategorizer:
    """AI-powered expense categorizer using OpenAI"""
    
    def __init__(self):
        logger.info("Initializing AICategorizer...")
        
        # Check OpenAI API key
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key or api_key == 'sk-test-placeholder-key-for-debugging':
            logger.warning("OPENAI_API_KEY not found or is placeholder - using fallback categorization")
            self.client = None
            self.use_fallback = True
        else:
            logger.info("OpenAI API key found")
            self.client = OpenAI(api_key=api_key)
            self.use_fallback = False
        
        self.model = os.getenv('OPENAI_MODEL', 'gpt-4')
        self.max_tokens = int(os.getenv('OPENAI_MAX_TOKENS', '2000'))
        self.temperature = float(os.getenv('OPENAI_TEMPERATURE', '0.1'))
        
        logger.info(f"AI Categorizer configured - Model: {self.model}, Max tokens: {self.max_tokens}, Temperature: {self.temperature}")
        
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
        
        logger.info("AICategorizer initialized successfully")
    
    def categorize_transaction(self, transaction: Dict[str, Any], user_preferences: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Categorize a single transaction using AI"""
        logger.info(f"=== CATEGORIZING TRANSACTION ===")
        logger.info(f"Transaction: {transaction.get('description', 'Unknown')} - Amount: {transaction.get('amount', 'Unknown')}")
        
        try:
            # Use fallback categorization if OpenAI is not available
            if self.use_fallback:
                logger.info("Using fallback keyword-based categorization")
                return self._fallback_categorize_transaction(transaction)
            
            # Prepare context for AI
            logger.info("Preparing context for AI...")
            context = self._prepare_context(transaction, user_preferences)
            logger.info(f"Context prepared with {len(context.get('user_preferences', []))} user preferences")
            
            # Create prompt for OpenAI
            logger.info("Creating categorization prompt...")
            prompt = self._create_categorization_prompt(transaction, context)
            logger.info(f"Prompt created: {len(prompt)} characters")
            
            # Get AI response
            logger.info("Calling OpenAI API...")
            response = self._get_ai_response(prompt)
            logger.info(f"OpenAI response received: {len(response)} characters")
            
            # Parse response
            logger.info("Parsing AI response...")
            result = self._parse_ai_response(response, transaction)
            logger.info(f"Response parsed: {result.get('category', 'Unknown')} (confidence: {result.get('confidence', 0)})")
            
            logger.info(f"=== TRANSACTION CATEGORIZED SUCCESSFULLY ===")
            return result
            
        except Exception as e:
            logger.error(f"=== TRANSACTION CATEGORIZATION FAILED ===")
            logger.error(f"Error categorizing transaction: {e}")
            logger.error(f"Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Fallback to keyword-based categorization
            logger.info("Falling back to keyword-based categorization")
            return self._fallback_categorize_transaction(transaction)
    
    def categorize_batch(self, transactions: List[Dict[str, Any]], user_preferences: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        """Categorize multiple transactions efficiently"""
        logger.info(f"=== CATEGORIZING BATCH: {len(transactions)} transactions ===")
        
        try:
            if not transactions:
                logger.info("No transactions to categorize")
                return []
            
            # Prepare batch context
            logger.info("Preparing batch context...")
            context = self._prepare_batch_context(transactions, user_preferences)
            logger.info(f"Batch context prepared")
            
            # Create batch prompt
            logger.info("Creating batch prompt...")
            prompt = self._create_batch_prompt(transactions, context)
            logger.info(f"Batch prompt created: {len(prompt)} characters")
            
            # Get AI response
            logger.info("Calling OpenAI API for batch categorization...")
            response = self._get_ai_response(prompt)
            logger.info(f"OpenAI batch response received: {len(response)} characters")
            
            # Parse batch response
            logger.info("Parsing batch response...")
            results = self._parse_batch_response(response, transactions)
            logger.info(f"Batch response parsed: {len(results)} results")
            
            logger.info(f"=== BATCH CATEGORIZATION COMPLETE: {len(results)} transactions ===")
            return results
            
        except Exception as e:
            logger.error(f"=== BATCH CATEGORIZATION FAILED ===")
            logger.error(f"Error in batch categorization: {e}")
            logger.error(f"Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Fallback to individual categorization
            logger.info("Falling back to individual categorization...")
            return self._fallback_batch_categorization(transactions, user_preferences)
    
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
    
    def _get_ai_response(self, prompt: str) -> str:
        """Get response from OpenAI"""
        logger.info("=== CALLING OPENAI API ===")
        logger.info(f"Model: {self.model}")
        logger.info(f"Max tokens: {self.max_tokens}")
        logger.info(f"Temperature: {self.temperature}")
        logger.info(f"Prompt length: {len(prompt)} characters")
        
        try:
            logger.info("Sending request to OpenAI...")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a financial transaction categorization expert. Always respond with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            logger.info("OpenAI API call successful")
            logger.info(f"Response usage - Prompt tokens: {response.usage.prompt_tokens}, Completion tokens: {response.usage.completion_tokens}, Total tokens: {response.usage.total_tokens}")
            
            content = response.choices[0].message.content.strip()
            logger.info(f"Response content length: {len(content)} characters")
            logger.info(f"Response preview: {content[:200]}...")
            
            return content
            
        except Exception as e:
            logger.error(f"=== OPENAI API CALL FAILED ===")
            logger.error(f"Error getting AI response: {e}")
            logger.error(f"Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
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
            return self._fallback_batch_categorization(transactions)
    
    def _fallback_batch_categorization(self, transactions: List[Dict[str, Any]], user_preferences: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        """Fallback to individual categorization if batch fails"""
        logger.warning("Falling back to individual transaction categorization")
        
        results = []
        for transaction in transactions:
            result = self.categorize_transaction(transaction, user_preferences)
            results.append(result)
        
        return results 

    def _fallback_categorize_transaction(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback categorization using keyword matching"""
        description = transaction.get('description', '').lower()
        amount = transaction.get('amount', 0)
        
        logger.info(f"Fallback categorization for: {description}")
        
        # Find the best matching category based on keywords
        best_category = "Uncategorized"
        best_score = 0
        
        for category, keywords in self.category_keywords.items():
            score = 0
            for keyword in keywords:
                if keyword.lower() in description:
                    score += 1
            
            if score > best_score:
                best_score = score
                best_category = category
        
        # Calculate confidence based on keyword matches
        confidence = min(0.8, best_score * 0.2) if best_score > 0 else 0.1
        
        logger.info(f"Fallback result: {best_category} (confidence: {confidence})")
        
        return {
            "category": best_category,
            "confidence": confidence,
            "reasoning": f"Keyword-based categorization: {best_score} keyword matches found",
            "transaction_id": transaction.get('id'),
            "ai_model": "fallback_keyword_matcher"
        } 