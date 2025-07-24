"""
Learning System - Remembers user preferences and gets smarter over time
"""

import re
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
from loguru import logger


class LearningSystem:
    """Learning system that improves categorization based on user feedback"""
    
    def __init__(self, database):
        self.db = database
        self.min_confidence_threshold = 0.7
        self.max_learning_examples = 1000
        self.learning_decay_factor = 0.95
        
        # Learning patterns cache
        self.pattern_cache = {}
        self.merchant_patterns = defaultdict(list)
        
    def learn_from_correction(self, transaction: Dict[str, Any], 
                             original_category: str, 
                             corrected_category: str) -> Dict[str, Any]:
        """Learn from user correction and update preferences"""
        try:
            # Extract merchant pattern
            merchant_pattern = self._extract_merchant_pattern(transaction.get('description', ''))
            
            # Create learning entry
            learning_entry = {
                'merchant_pattern': merchant_pattern,
                'original_category': original_category,
                'preferred_category': corrected_category,
                'confidence_score': transaction.get('ai_confidence', 0.0),
                'amount': transaction.get('amount', 0),
                'transaction_date': transaction.get('transaction_date'),
                'context_data': self._extract_context_data(transaction)
            }
            
            # Save to database
            self.db.save_user_preference(
                merchant_pattern=merchant_pattern,
                original_category=original_category,
                preferred_category=corrected_category,
                confidence_score=transaction.get('ai_confidence', 0.0),
                context_data=learning_entry['context_data']
            )
            
            # Calculate learning impact
            impact_score = self._calculate_learning_impact(learning_entry)
            
            logger.info(f"Learned from correction: {merchant_pattern} -> {corrected_category} (impact: {impact_score:.2f})")
            
            return {
                'learning_entry': learning_entry,
                'impact_score': impact_score,
                'pattern_updated': True
            }
            
        except Exception as e:
            logger.error(f"Error learning from correction: {e}")
            return {
                'learning_entry': None,
                'impact_score': 0.0,
                'pattern_updated': False,
                'error': str(e)
            }
    
    def get_user_preferences(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get user's learning preferences for AI context"""
        try:
            return self.db.get_user_preferences(limit)
        except Exception as e:
            logger.error(f"Error getting user preferences: {e}")
            return []
    
    def predict_category(self, transaction: Dict[str, Any], 
                        ai_category: str, ai_confidence: float) -> Tuple[str, float]:
        """Predict category using learned patterns"""
        try:
            merchant_pattern = self._extract_merchant_pattern(transaction.get('description', ''))
            
            # Get user preferences for this merchant
            user_preferences = self.get_user_preferences()
            relevant_preferences = [
                pref for pref in user_preferences 
                if self._patterns_match(merchant_pattern, pref.get('merchant_pattern', ''))
            ]
            
            if not relevant_preferences:
                return ai_category, ai_confidence
            
            # Calculate weighted prediction
            prediction = self._calculate_weighted_prediction(
                relevant_preferences, 
                transaction, 
                ai_category, 
                ai_confidence
            )
            
            return prediction
            
        except Exception as e:
            logger.error(f"Error predicting category: {e}")
            return ai_category, ai_confidence
    
    def get_learning_analytics(self) -> Dict[str, Any]:
        """Get learning analytics"""
        try:
            return self.db.get_learning_analytics()
        except Exception as e:
            logger.error(f"Error getting learning analytics: {e}")
            return {}
    
    def _extract_merchant_pattern(self, description: str) -> str:
        """Extract merchant pattern from transaction description"""
        if not description:
            return ""
        
        # Clean description
        cleaned = re.sub(r'\s+', ' ', description.strip().upper())
        
        # Extract first few words as merchant pattern
        words = cleaned.split()[:3]
        pattern = ' '.join(words)
        
        # Remove common prefixes/suffixes
        pattern = re.sub(r'^(POS|PURCHASE|PAYMENT|DEBIT|CREDIT)\s+', '', pattern)
        pattern = re.sub(r'\s+(LLC|INC|CORP|CO|LTD)$', '', pattern)
        
        return pattern.strip()
    
    def _extract_context_data(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """Extract context data from transaction"""
        context = {}
        
        # Amount range
        amount = transaction.get('amount', 0)
        if amount <= 50:
            context['amount_range'] = '0-50'
        elif amount <= 100:
            context['amount_range'] = '50-100'
        elif amount <= 500:
            context['amount_range'] = '100-500'
        else:
            context['amount_range'] = '500+'
        
        # Day of week
        date = transaction.get('transaction_date')
        if date:
            try:
                if isinstance(date, str):
                    parsed_date = datetime.strptime(date, '%Y-%m-%d')
                else:
                    parsed_date = date
                context['day_of_week'] = parsed_date.weekday()
                
                # Time of day (if available)
                hour = parsed_date.hour
                if 6 <= hour < 12:
                    context['time_of_day'] = 'morning'
                elif 12 <= hour < 17:
                    context['time_of_day'] = 'afternoon'
                elif 17 <= hour < 22:
                    context['time_of_day'] = 'evening'
                else:
                    context['time_of_day'] = 'night'
            except:
                pass
        
        return context
    
    def _patterns_match(self, pattern1: str, pattern2: str) -> bool:
        """Check if two merchant patterns match"""
        if not pattern1 or not pattern2:
            return False
        
        # Exact match
        if pattern1 == pattern2:
            return True
        
        # Partial match (one pattern contains the other)
        if pattern1 in pattern2 or pattern2 in pattern1:
            return True
        
        # Fuzzy match using word overlap
        words1 = set(pattern1.split())
        words2 = set(pattern2.split())
        
        if len(words1) > 0 and len(words2) > 0:
            overlap = len(words1.intersection(words2))
            min_length = min(len(words1), len(words2))
            similarity = overlap / min_length
            
            return similarity >= 0.5  # 50% word overlap
        
        return False
    
    def _calculate_weighted_prediction(self, preferences: List[Dict[str, Any]], 
                                     transaction: Dict[str, Any],
                                     ai_category: str, ai_confidence: float) -> Tuple[str, float]:
        """Calculate weighted prediction based on user preferences"""
        if not preferences:
            return ai_category, ai_confidence
        
        # Calculate preference weights
        preference_scores = {}
        total_weight = 0
        
        for pref in preferences:
            weight = pref.get('learning_weight', 1.0)
            category = pref.get('preferred_category', '')
            
            # Apply context matching
            context_match = self._calculate_context_match(
                transaction, 
                pref.get('context_data', {})
            )
            
            adjusted_weight = weight * context_match
            preference_scores[category] = preference_scores.get(category, 0) + adjusted_weight
            total_weight += adjusted_weight
        
        if total_weight == 0:
            return ai_category, ai_confidence
        
        # Find highest scoring category
        best_category = max(preference_scores.items(), key=lambda x: x[1])[0]
        preference_confidence = preference_scores[best_category] / total_weight
        
        # Blend AI confidence with preference confidence
        if best_category == ai_category:
            # Same category, boost confidence
            final_confidence = min(ai_confidence + (preference_confidence * 0.3), 1.0)
        else:
            # Different category, use preference if it's strong enough
            if preference_confidence > 0.7:
                final_confidence = preference_confidence
                best_category = best_category
            else:
                final_confidence = ai_confidence
                best_category = ai_category
        
        return best_category, final_confidence
    
    def _calculate_context_match(self, transaction: Dict[str, Any], context_data: Dict[str, Any]) -> float:
        """Calculate how well transaction context matches preference context"""
        if not context_data:
            return 1.0
        
        match_score = 0.0
        total_factors = 0
        
        # Amount range match
        if 'amount_range' in context_data:
            transaction_amount = transaction.get('amount', 0)
            pref_amount_range = context_data['amount_range']
            
            if self._amount_in_range(transaction_amount, pref_amount_range):
                match_score += 1.0
            total_factors += 1
        
        # Day of week match
        if 'day_of_week' in context_data:
            transaction_date = transaction.get('transaction_date')
            if transaction_date:
                try:
                    if isinstance(transaction_date, str):
                        parsed_date = datetime.strptime(transaction_date, '%Y-%m-%d')
                    else:
                        parsed_date = transaction_date
                    
                    if parsed_date.weekday() == context_data['day_of_week']:
                        match_score += 1.0
                except:
                    pass
            total_factors += 1
        
        # Time of day match
        if 'time_of_day' in context_data:
            transaction_date = transaction.get('transaction_date')
            if transaction_date:
                try:
                    if isinstance(transaction_date, str):
                        parsed_date = datetime.strptime(transaction_date, '%Y-%m-%d')
                    else:
                        parsed_date = transaction_date
                    
                    hour = parsed_date.hour
                    pref_time = context_data['time_of_day']
                    
                    if self._time_matches(hour, pref_time):
                        match_score += 1.0
                except:
                    pass
            total_factors += 1
        
        return match_score / total_factors if total_factors > 0 else 1.0
    
    def _amount_in_range(self, amount: float, amount_range: str) -> bool:
        """Check if amount falls within specified range"""
        try:
            if amount_range == '0-50':
                return 0 <= amount <= 50
            elif amount_range == '50-100':
                return 50 < amount <= 100
            elif amount_range == '100-500':
                return 100 < amount <= 500
            elif amount_range == '500+':
                return amount > 500
        except:
            pass
        return False
    
    def _time_matches(self, hour: int, time_of_day: str) -> bool:
        """Check if hour matches time of day"""
        if time_of_day == 'morning':
            return 6 <= hour < 12
        elif time_of_day == 'afternoon':
            return 12 <= hour < 17
        elif time_of_day == 'evening':
            return 17 <= hour < 22
        elif time_of_day == 'night':
            return hour >= 22 or hour < 6
        return False
    
    def _calculate_learning_impact(self, learning_entry: Dict[str, Any]) -> float:
        """Calculate the impact of a learning correction"""
        base_impact = 1.0
        
        # Higher impact for low confidence corrections
        confidence = learning_entry.get('confidence_score', 0.0)
        if confidence < 0.5:
            base_impact *= 1.5
        elif confidence > 0.8:
            base_impact *= 0.8
        
        # Higher impact for frequent merchants
        merchant_pattern = learning_entry.get('merchant_pattern', '')
        if len(merchant_pattern) > 0:
            # This would typically check frequency in user's transactions
            base_impact *= 1.2
        
        return min(base_impact, 2.0) 