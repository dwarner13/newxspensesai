#!/usr/bin/env python3
"""
AI Chat Module for Financial Coaching
Handles conversations with users about their finances
"""

import openai
import os
from typing import Dict, List, Optional
import json
from datetime import datetime

class AIChatService:
    def __init__(self):
        self.client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
    def generate_response(self, prompt: str, user_context: Dict, personality: str = 'encouraging') -> Dict:
        """
        Generate AI response for financial coaching
        """
        try:
            # Build the system message based on personality
            personality_prompts = {
                'encouraging': "You are an encouraging and supportive AI financial coach. Be positive and motivating.",
                'analytical': "You are an analytical AI financial coach. Focus on data and insights.",
                'casual': "You are a casual and friendly AI financial coach. Be conversational and relaxed.",
                'professional': "You are a professional AI financial coach. Be formal and business-like."
            }
            
            system_message = personality_prompts.get(personality, personality_prompts['encouraging'])
            
            # Create the full prompt with context
            full_prompt = f"""
            {system_message}
            
            USER'S FINANCIAL CONTEXT:
            {json.dumps(user_context, indent=2)}
            
            USER'S QUESTION:
            {prompt}
            
            Respond as a helpful financial coach. Be specific, actionable, and encouraging.
            Keep responses under 150 words. Use emojis appropriately.
            """
            
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": full_prompt}
                ],
                max_tokens=300,
                temperature=0.7
            )
            
            ai_response = response.choices[0].message.content.strip()
            
            # Generate suggestions based on the response
            suggestions = self._generate_suggestions(user_context, prompt)
            
            # Detect mood/emotion from the response
            detected_mood = self._detect_mood(ai_response)
            
            return {
                "response": ai_response,
                "detected_mood": detected_mood,
                "suggestions": suggestions,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"AI Chat Error: {e}")
            return {
                "response": "I'm having trouble right now. Please try again in a moment! 🤖",
                "detected_mood": "apologetic",
                "suggestions": ["Try again", "Upload bank statement", "Ask about spending"],
                "timestamp": datetime.now().isoformat()
            }
    
    def _generate_suggestions(self, user_context: Dict, user_input: str) -> List[str]:
        """
        Generate contextual suggestions based on user input and financial context
        """
        suggestions = []
        
        # Default suggestions
        default_suggestions = [
            "Analyze my spending patterns",
            "Help me save money",
            "What's my biggest expense?",
            "Create a budget for me"
        ]
        
        # Context-specific suggestions
        if user_context.get('status') == 'no_data':
            suggestions = [
                "Upload a bank statement",
                "How does AI categorization work?",
                "What can you help me with?"
            ]
        elif user_context.get('total_spent', 0) > 0:
            suggestions = [
                f"Analyze my ${user_context['total_spent']:.0f} in spending",
                f"Help me save on {user_context.get('top_category', 'expenses')}",
                "Show me spending trends",
                "Create a savings plan"
            ]
        
        # Add suggestions based on user input keywords
        input_lower = user_input.lower()
        if any(word in input_lower for word in ['spend', 'spending', 'money']):
            suggestions.extend(["Break down my expenses", "Find savings opportunities"])
        elif any(word in input_lower for word in ['save', 'saving']):
            suggestions.extend(["Set savings goals", "Reduce monthly expenses"])
        elif any(word in input_lower for word in ['budget', 'budgeting']):
            suggestions.extend(["Create monthly budget", "Track budget progress"])
        
        # Remove duplicates and limit to 3 suggestions
        unique_suggestions = list(dict.fromkeys(suggestions + default_suggestions))
        return unique_suggestions[:3]
    
    def _detect_mood(self, response: str) -> str:
        """
        Detect the mood/emotion of the AI response
        """
        response_lower = response.lower()
        
        if any(word in response_lower for word in ['great', 'excellent', 'amazing', 'fantastic']):
            return 'excited'
        elif any(word in response_lower for word in ['sorry', 'apologize', 'trouble']):
            return 'apologetic'
        elif any(word in response_lower for word in ['worry', 'concern', 'careful']):
            return 'concerned'
        elif any(word in response_lower for word in ['congratulations', 'well done', 'good job']):
            return 'proud'
        else:
            return 'helpful'
    
    def analyze_financial_insights(self, transactions: List[Dict]) -> Dict:
        """
        Generate financial insights from transaction data
        """
        if not transactions:
            return {"status": "no_data", "message": "No transactions to analyze"}
        
        total_spent = sum(abs(t.get('amount', 0)) for t in transactions if t.get('amount', 0) < 0)
        total_income = sum(t.get('amount', 0) for t in transactions if t.get('amount', 0) > 0)
        
        # Category analysis
        categories = {}
        for t in transactions:
            category = t.get('category', 'Uncategorized')
            amount = abs(t.get('amount', 0))
            categories[category] = categories.get(category, 0) + amount
        
        top_category = max(categories.items(), key=lambda x: x[1]) if categories else None
        
        # Spending patterns
        spending_patterns = {
            "total_spent": total_spent,
            "total_income": total_income,
            "net_change": total_income - total_spent,
            "top_category": top_category[0] if top_category else "Unknown",
            "top_category_amount": top_category[1] if top_category else 0,
            "transaction_count": len(transactions),
            "categories": categories
        }
        
        return spending_patterns 