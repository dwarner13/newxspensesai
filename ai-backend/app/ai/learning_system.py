"""
AI Learning System for improving categorization based on user feedback
"""

import re
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
from loguru import logger

from ..config import settings


class LearningSystem:
    """AI Learning System that improves categorization based on user feedback"""
    
    def __init__(self):
        self.min_confidence_threshold = settings.MIN_CONFIDENCE_THRESHOLD
        self.max_learning_examples = settings.MAX_LEARNING_EXAMPLES
        self.learning_decay_factor = settings.LEARNING_DECAY_FACTOR
        
        # Learning patterns cache
        self.pattern_cache = {}
        self.merchant_patterns = defaultdict(list)
        
    async def learn_from_correction(self, 
                                   transaction: Dict[str, Any], 
                                   original_category: str, 
                                   corrected_category: str,
                                   user_id: int) -> Dict[str, Any]:
        """Learn from user correction and update preferences"""
        try:
            # Extract merchant pattern
            merchant_pattern = self._extract_merchant_pattern(transaction.get('description', ''))
            
            # Create learning entry
            learning_entry = {
                'user_id': user_id,
                'merchant_pattern': merchant_pattern,
                'original_category': original_category,
                'preferred_category': corrected_category,
                'confidence_score': transaction.get('ai_confidence', 0.0),
                'amount': transaction.get('amount', 0),
                'transaction_date': transaction.get('transaction_date'),
                'context_data': self._extract_context_data(transaction)
            }
            
            # Update learning patterns
            await self._update_learning_patterns(learning_entry)
            
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
    
    async def get_user_preferences(self, user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        """Get user's learning preferences for AI context"""
        try:
            # This would typically query the database
            # For now, return cached patterns for the user
            user_patterns = self.merchant_patterns.get(user_id, [])
            
            # Sort by learning weight and recency
            sorted_patterns = sorted(
                user_patterns,
                key=lambda x: (x.get('learning_weight', 0), x.get('last_corrected_at', datetime.min)),
                reverse=True
            )
            
            return sorted_patterns[:limit]
            
        except Exception as e:
            logger.error(f"Error getting user preferences: {e}")
            return []
    
    async def predict_category(self, 
                             transaction: Dict[str, Any], 
                             user_id: int,
                             ai_category: str,
                             ai_confidence: float) -> Tuple[str, float]:
        """Predict category using learned patterns"""
        try:
            merchant_pattern = self._extract_merchant_pattern(transaction.get('description', ''))
            
            # Get user preferences for this merchant
            user_preferences = await self.get_user_preferences(user_id)
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
    
    async def get_learning_analytics(self, user_id: int) -> Dict[str, Any]:
        """Get learning analytics for a user"""
        try:
            user_patterns = self.merchant_patterns.get(user_id, [])
            
            if not user_patterns:
                return {
                    'total_corrections': 0,
                    'accuracy_improvement': 0.0,
                    'most_corrected_merchants': [],
                    'learning_progress': 0.0
                }
            
            # Calculate analytics
            total_corrections = len(user_patterns)
            accuracy_improvement = self._calculate_accuracy_improvement(user_patterns)
            most_corrected = self._get_most_corrected_merchants(user_patterns)
            learning_progress = self._calculate_learning_progress(user_patterns)
            
            return {
                'total_corrections': total_corrections,
                'accuracy_improvement': accuracy_improvement,
                'most_corrected_merchants': most_corrected,
                'learning_progress': learning_progress,
                'patterns_count': len(user_patterns)
            }
            
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
            context['day_of_week'] = date.weekday()
            
            # Time of day (if available)
            hour = date.hour
            if 6 <= hour < 12:
                context['time_of_day'] = 'morning'
            elif 12 <= hour < 17:
                context['time_of_day'] = 'afternoon'
            elif 17 <= hour < 22:
                context['time_of_day'] = 'evening'
            else:
                context['time_of_day'] = 'night'
        
        return context
    
    async def _update_learning_patterns(self, learning_entry: Dict[str, Any]) -> None:
        """Update learning patterns with new correction"""
        user_id = learning_entry['user_id']
        merchant_pattern = learning_entry['merchant_pattern']
        
        # Find existing pattern
        existing_pattern = None
        for pattern in self.merchant_patterns[user_id]:
            if pattern.get('merchant_pattern') == merchant_pattern:
                existing_pattern = pattern
                break
        
        if existing_pattern:
            # Update existing pattern
            existing_pattern['correction_count'] += 1
            existing_pattern['last_corrected_at'] = datetime.now()
            existing_pattern['learning_weight'] = min(
                existing_pattern['learning_weight'] * 1.1,  # Increase weight
                2.0  # Cap at 2.0
            )
            
            # Update context data
            existing_pattern['context_data'] = self._merge_context_data(
                existing_pattern.get('context_data', {}),
                learning_entry['context_data']
            )
        else:
            # Create new pattern
            new_pattern = {
                'merchant_pattern': merchant_pattern,
                'preferred_category': learning_entry['preferred_category'],
                'correction_count': 1,
                'learning_weight': 1.0,
                'last_corrected_at': datetime.now(),
                'context_data': learning_entry['context_data']
            }
            
            self.merchant_patterns[user_id].append(new_pattern)
        
        # Limit patterns per user
        if len(self.merchant_patterns[user_id]) > self.max_learning_examples:
            # Remove oldest patterns
            sorted_patterns = sorted(
                self.merchant_patterns[user_id],
                key=lambda x: x.get('last_corrected_at', datetime.min)
            )
            self.merchant_patterns[user_id] = sorted_patterns[-self.max_learning_examples:]
    
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
    
    def _calculate_weighted_prediction(self, 
                                     preferences: List[Dict[str, Any]], 
                                     transaction: Dict[str, Any],
                                     ai_category: str,
                                     ai_confidence: float) -> Tuple[str, float]:
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
            if transaction_date and transaction_date.weekday() == context_data['day_of_week']:
                match_score += 1.0
            total_factors += 1
        
        # Time of day match
        if 'time_of_day' in context_data:
            transaction_date = transaction.get('transaction_date')
            if transaction_date:
                hour = transaction_date.hour
                pref_time = context_data['time_of_day']
                
                if self._time_matches(hour, pref_time):
                    match_score += 1.0
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
    
    def _merge_context_data(self, existing: Dict[str, Any], new: Dict[str, Any]) -> Dict[str, Any]:
        """Merge context data from multiple corrections"""
        merged = existing.copy()
        
        for key, value in new.items():
            if key not in merged:
                merged[key] = value
            elif isinstance(value, list) and isinstance(merged[key], list):
                merged[key].extend(value)
            elif isinstance(value, dict) and isinstance(merged[key], dict):
                merged[key] = self._merge_context_data(merged[key], value)
        
        return merged
    
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
    
    def _calculate_accuracy_improvement(self, patterns: List[Dict[str, Any]]) -> float:
        """Calculate accuracy improvement based on learning patterns"""
        if not patterns:
            return 0.0
        
        total_corrections = sum(p.get('correction_count', 1) for p in patterns)
        recent_corrections = sum(
            1 for p in patterns 
            if p.get('last_corrected_at', datetime.min) > datetime.now() - timedelta(days=30)
        )
        
        # Simple improvement metric
        improvement = (recent_corrections / total_corrections) * 100 if total_corrections > 0 else 0
        return min(improvement, 100.0)
    
    def _get_most_corrected_merchants(self, patterns: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Get most frequently corrected merchants"""
        merchant_counts = defaultdict(int)
        
        for pattern in patterns:
            merchant = pattern.get('merchant_pattern', '')
            count = pattern.get('correction_count', 1)
            merchant_counts[merchant] += count
        
        # Sort by correction count
        sorted_merchants = sorted(merchant_counts.items(), key=lambda x: x[1], reverse=True)
        
        return [
            {'merchant': merchant, 'corrections': count}
            for merchant, count in sorted_merchants[:5]
        ]
    
    def _calculate_learning_progress(self, patterns: List[Dict[str, Any]]) -> float:
        """Calculate overall learning progress"""
        if not patterns:
            return 0.0
        
        total_patterns = len(patterns)
        recent_patterns = sum(
            1 for p in patterns 
            if p.get('last_corrected_at', datetime.min) > datetime.now() - timedelta(days=7)
        )
        
        # Progress based on recent activity
        progress = (recent_patterns / total_patterns) * 100 if total_patterns > 0 else 0
        
        # Boost progress based on learning weight
        avg_weight = sum(p.get('learning_weight', 1.0) for p in patterns) / total_patterns
        progress *= min(avg_weight, 2.0) / 2.0
        
        return min(progress, 100.0) 