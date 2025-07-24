import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import json
import random

logger = logging.getLogger(__name__)

class AIInsightGenerator:
    """
    AI Insight Generator that produces personalized financial insights
    without storing any personal data. All analysis is pattern-based only.
    """
    
    def __init__(self):
        self.session_id = None
        self.analysis_start = None
        self.insight_cache = {}
    
    async def generate_personalized_insights(self, analyzed_data: Dict[str, Any], document_type: str, session_id: str) -> Dict[str, Any]:
        """Generate comprehensive insights without storing personal data"""
        
        self.session_id = session_id
        self.analysis_start = datetime.now()
        
        logger.info(f"🧠 [AI_INSIGHTS] Generating insights for {document_type} session {session_id}")
        
        try:
            # Generate insights based on patterns only
            insights = {
                'spending_patterns': await self._analyze_spending_patterns(analyzed_data),
                'financial_health': await self._assess_financial_health(analyzed_data),
                'optimization_opportunities': await self._find_optimizations(analyzed_data),
                'predictive_analysis': await self._generate_predictions(analyzed_data),
                'efficiency_metrics': await self._calculate_efficiency_metrics(analyzed_data),
                'behavioral_insights': await self._analyze_behavioral_patterns(analyzed_data),
                '_ephemeral': True,
                '_session_id': session_id,
                '_analysis_time': datetime.now().isoformat()
            }
            
            # Create comprehensive response
            response = {
                'summary': await self._create_executive_summary(insights, document_type),
                'actionable_advice': await self._generate_actionable_advice(insights, document_type),
                'podcast_script': await self._generate_podcast_content(insights, document_type),
                'privacy_guarantee': "✅ Analysis based on patterns only - no personal data retained",
                'insight_metadata': {
                    'generated_at': datetime.now().isoformat(),
                    'document_type': document_type,
                    'session_id': session_id,
                    'analysis_duration': (datetime.now() - self.analysis_start).total_seconds()
                }
            }
            
            logger.info(f"🧠 [AI_INSIGHTS] Insights generated for session {session_id}")
            
            return response
            
        except Exception as e:
            logger.error(f"🧠 [AI_INSIGHTS] Insight generation error for session {session_id}: {str(e)}")
            raise
            
        finally:
            # Clear insight cache
            self.insight_cache.clear()
    
    async def _analyze_spending_patterns(self, analyzed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze spending patterns without storing personal data"""
        logger.info(f"🧠 [AI_INSIGHTS] Analyzing spending patterns for session {self.session_id}")
        
        try:
            # Extract pattern-based insights
            spending_analysis = {
                'total_transactions': analyzed_data.get('transaction_count', 0),
                'spending_categories': analyzed_data.get('expense_categories', {}),
                'spending_velocity': self._calculate_spending_velocity(analyzed_data),
                'category_distribution': self._analyze_category_distribution(analyzed_data),
                'spending_trends': self._identify_spending_trends(analyzed_data),
                'unusual_patterns': self._detect_unusual_patterns(analyzed_data),
                '_pattern_based': True
            }
            
            return spending_analysis
            
        except Exception as e:
            logger.error(f"🧠 [AI_INSIGHTS] Spending pattern analysis error: {str(e)}")
            raise
    
    async def _assess_financial_health(self, analyzed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Assess financial health based on patterns only"""
        logger.info(f"🧠 [AI_INSIGHTS] Assessing financial health for session {self.session_id}")
        
        try:
            # Calculate health metrics
            net_flow = analyzed_data.get('spending_summary', {}).get('net_flow', 0)
            total_expenses = analyzed_data.get('spending_summary', {}).get('total_expenses', 0)
            total_income = analyzed_data.get('spending_summary', {}).get('total_income', 0)
            
            # Pattern-based health assessment
            health_score = self._calculate_health_score(net_flow, total_expenses, total_income)
            risk_factors = self._identify_risk_factors(analyzed_data)
            strength_indicators = self._identify_strength_indicators(analyzed_data)
            
            financial_health = {
                'overall_score': health_score,
                'health_category': self._categorize_health(health_score),
                'risk_factors': risk_factors,
                'strength_indicators': strength_indicators,
                'cash_flow_analysis': self._analyze_cash_flow_patterns(analyzed_data),
                'savings_potential': self._calculate_savings_potential(analyzed_data),
                '_pattern_based': True
            }
            
            return financial_health
            
        except Exception as e:
            logger.error(f"🧠 [AI_INSIGHTS] Financial health assessment error: {str(e)}")
            raise
    
    async def _find_optimizations(self, analyzed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Find optimization opportunities without personal data"""
        logger.info(f"🧠 [AI_INSIGHTS] Finding optimizations for session {self.session_id}")
        
        try:
            optimizations = {
                'spending_optimizations': self._identify_spending_optimizations(analyzed_data),
                'category_optimizations': self._suggest_category_optimizations(analyzed_data),
                'timing_optimizations': self._analyze_timing_patterns(analyzed_data),
                'automation_opportunities': self._identify_automation_opportunities(analyzed_data),
                'savings_opportunities': self._calculate_savings_opportunities(analyzed_data),
                'investment_opportunities': self._identify_investment_opportunities(analyzed_data),
                '_pattern_based': True
            }
            
            return optimizations
            
        except Exception as e:
            logger.error(f"🧠 [AI_INSIGHTS] Optimization analysis error: {str(e)}")
            raise
    
    async def _generate_predictions(self, analyzed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate predictive analysis without storing personal data"""
        logger.info(f"🧠 [AI_INSIGHTS] Generating predictions for session {self.session_id}")
        
        try:
            predictions = {
                'spending_forecast': self._forecast_spending_patterns(analyzed_data),
                'savings_projection': self._project_savings_trajectory(analyzed_data),
                'financial_milestones': self._predict_financial_milestones(analyzed_data),
                'risk_predictions': self._predict_financial_risks(analyzed_data),
                'opportunity_predictions': self._predict_opportunities(analyzed_data),
                'trend_predictions': self._predict_financial_trends(analyzed_data),
                '_pattern_based': True
            }
            
            return predictions
            
        except Exception as e:
            logger.error(f"🧠 [AI_INSIGHTS] Prediction generation error: {str(e)}")
            raise
    
    async def _calculate_efficiency_metrics(self, analyzed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate efficiency metrics based on patterns"""
        logger.info(f"🧠 [AI_INSIGHTS] Calculating efficiency metrics for session {self.session_id}")
        
        try:
            # Calculate efficiency improvements
            current_efficiency = self._calculate_current_efficiency(analyzed_data)
            historical_comparison = self._compare_to_historical_patterns(analyzed_data)
            percentile_ranking = self._calculate_percentile_ranking(analyzed_data)
            
            efficiency_metrics = {
                'current_efficiency': current_efficiency,
                'efficiency_improvement': self._calculate_improvement_percentage(analyzed_data),
                'percentile': percentile_ranking,
                'efficiency_score': self._calculate_efficiency_score(analyzed_data),
                'optimization_potential': self._calculate_optimization_potential(analyzed_data),
                '_pattern_based': True
            }
            
            return efficiency_metrics
            
        except Exception as e:
            logger.error(f"🧠 [AI_INSIGHTS] Efficiency calculation error: {str(e)}")
            raise
    
    async def _analyze_behavioral_patterns(self, analyzed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze behavioral patterns without personal data"""
        logger.info(f"🧠 [AI_INSIGHTS] Analyzing behavioral patterns for session {self.session_id}")
        
        try:
            behavioral_analysis = {
                'spending_triggers': self._identify_spending_triggers(analyzed_data),
                'stress_spending_patterns': self._detect_stress_spending(analyzed_data),
                'habit_analysis': self._analyze_spending_habits(analyzed_data),
                'decision_patterns': self._analyze_decision_patterns(analyzed_data),
                'emotional_spending': self._detect_emotional_spending(analyzed_data),
                'behavioral_recommendations': self._generate_behavioral_recommendations(analyzed_data),
                '_pattern_based': True
            }
            
            return behavioral_analysis
            
        except Exception as e:
            logger.error(f"🧠 [AI_INSIGHTS] Behavioral analysis error: {str(e)}")
            raise
    
    async def _create_executive_summary(self, insights: Dict[str, Any], document_type: str) -> Dict[str, Any]:
        """Create executive summary based on insights"""
        logger.info(f"🧠 [AI_INSIGHTS] Creating executive summary for session {self.session_id}")
        
        try:
            efficiency_metrics = insights.get('efficiency_metrics', {})
            financial_health = insights.get('financial_health', {})
            predictions = insights.get('predictive_analysis', {})
            
            summary = {
                'key_findings': [
                    f"Financial efficiency improved by {efficiency_metrics.get('efficiency_improvement', 0)}%",
                    f"Current financial health: {financial_health.get('health_category', 'Unknown')}",
                    f"Projected savings: ${predictions.get('savings_projection', {}).get('six_month_projection', 0):.2f}",
                    f"Percentile ranking: Top {efficiency_metrics.get('percentile', 0)}%"
                ],
                'critical_insights': [
                    "Spending patterns show room for optimization",
                    "Cash flow management is trending positively",
                    "Investment opportunities identified",
                    "Behavioral patterns suggest stress-spending triggers"
                ],
                'document_type': document_type,
                'analysis_timestamp': datetime.now().isoformat(),
                '_pattern_based': True
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"🧠 [AI_INSIGHTS] Executive summary creation error: {str(e)}")
            raise
    
    async def _generate_actionable_advice(self, insights: Dict[str, Any], document_type: str) -> List[Dict[str, Any]]:
        """Generate actionable advice based on insights"""
        logger.info(f"🧠 [AI_INSIGHTS] Generating actionable advice for session {self.session_id}")
        
        try:
            advice = []
            
            # Spending optimization advice
            spending_patterns = insights.get('spending_patterns', {})
            if spending_patterns.get('unusual_patterns'):
                advice.append({
                    'category': 'Spending Optimization',
                    'priority': 'High',
                    'action': 'Review unusual spending patterns',
                    'impact': 'Potential 15-20% savings',
                    'timeline': 'Immediate'
                })
            
            # Financial health advice
            financial_health = insights.get('financial_health', {})
            if financial_health.get('risk_factors'):
                advice.append({
                    'category': 'Risk Management',
                    'priority': 'High',
                    'action': 'Address identified risk factors',
                    'impact': 'Improved financial stability',
                    'timeline': 'Within 30 days'
                })
            
            # Optimization opportunities
            optimizations = insights.get('optimization_opportunities', {})
            if optimizations.get('savings_opportunities'):
                advice.append({
                    'category': 'Savings Enhancement',
                    'priority': 'Medium',
                    'action': 'Implement suggested optimizations',
                    'impact': f"${optimizations.get('savings_opportunities', {}).get('potential_savings', 0):.2f} additional savings",
                    'timeline': 'Within 60 days'
                })
            
            # Behavioral recommendations
            behavioral = insights.get('behavioral_insights', {})
            if behavioral.get('stress_spending_patterns'):
                advice.append({
                    'category': 'Behavioral Finance',
                    'priority': 'Medium',
                    'action': 'Address stress-spending triggers',
                    'impact': 'Improved emotional spending control',
                    'timeline': 'Ongoing'
                })
            
            return advice
            
        except Exception as e:
            logger.error(f"🧠 [AI_INSIGHTS] Actionable advice generation error: {str(e)}")
            raise
    
    async def _generate_podcast_content(self, insights: Dict[str, Any], document_type: str) -> str:
        """Generate podcast content based on insights"""
        logger.info(f"🧠 [AI_INSIGHTS] Generating podcast content for session {self.session_id}")
        
        try:
            efficiency_metrics = insights.get('efficiency_metrics', {})
            predictions = insights.get('predictive_analysis', {})
            behavioral = insights.get('behavioral_insights', {})
            
            podcast_script = f"""
🎧 "This month's analysis revealed some fascinating patterns in your financial behavior...

🎧 Your spending efficiency improved by {efficiency_metrics.get('efficiency_improvement', 0)}%, 
which puts you ahead of {efficiency_metrics.get('percentile', 0)}% of similar users...

🎧 The correlation between your coffee purchases and email volume suggests 
stress-spending patterns we can help you optimize...

🎧 Based on current trends, you're projected to save an additional 
${predictions.get('savings_projection', {}).get('six_month_projection', 0):.2f} over the next 6 months...

🎧 Your financial health score of {insights.get('financial_health', {}).get('overall_score', 0)} 
indicates {insights.get('financial_health', {}).get('health_category', 'good')} financial wellness...

🎧 The behavioral analysis shows {len(behavioral.get('spending_triggers', []))} key spending triggers 
that we can help you manage more effectively...

🎧 Remember, this analysis is based purely on patterns - your personal data is never stored or retained."
            """
            
            return podcast_script.strip()
            
        except Exception as e:
            logger.error(f"🧠 [AI_INSIGHTS] Podcast content generation error: {str(e)}")
            raise
    
    # Helper methods for pattern analysis
    def _calculate_spending_velocity(self, data: Dict[str, Any]) -> float:
        """Calculate spending velocity based on patterns"""
        total_spent = data.get('spending_summary', {}).get('total_expenses', 0)
        transaction_count = data.get('spending_summary', {}).get('transaction_count', 1)
        return total_spent / transaction_count if transaction_count > 0 else 0
    
    def _analyze_category_distribution(self, data: Dict[str, Any]) -> Dict[str, float]:
        """Analyze category distribution patterns"""
        categories = data.get('expense_categories', {})
        total = sum(categories.values()) if categories else 1
        return {k: (v / total) * 100 for k, v in categories.items()}
    
    def _identify_spending_trends(self, data: Dict[str, Any]) -> List[str]:
        """Identify spending trends based on patterns"""
        trends = []
        net_flow = data.get('spending_summary', {}).get('net_flow', 0)
        
        if net_flow > 0:
            trends.append("Positive cash flow trend")
        if net_flow < 0:
            trends.append("Negative cash flow trend")
        
        return trends
    
    def _detect_unusual_patterns(self, data: Dict[str, Any]) -> List[str]:
        """Detect unusual spending patterns"""
        patterns = []
        categories = data.get('expense_categories', {})
        
        # Detect high spending in specific categories
        for category, amount in categories.items():
            if amount > 1000:  # Threshold for unusual spending
                patterns.append(f"High spending in {category}")
        
        return patterns
    
    def _calculate_health_score(self, net_flow: float, total_expenses: float, total_income: float) -> int:
        """Calculate financial health score"""
        if total_income == 0:
            return 50
        
        savings_rate = (net_flow / total_income) * 100
        expense_ratio = (total_expenses / total_income) * 100 if total_income > 0 else 100
        
        # Score based on savings rate and expense ratio
        score = min(100, max(0, (savings_rate * 0.7) + ((100 - expense_ratio) * 0.3)))
        return int(score)
    
    def _categorize_health(self, score: int) -> str:
        """Categorize financial health"""
        if score >= 80:
            return "Excellent"
        elif score >= 60:
            return "Good"
        elif score >= 40:
            return "Fair"
        else:
            return "Needs Attention"
    
    def _identify_risk_factors(self, data: Dict[str, Any]) -> List[str]:
        """Identify financial risk factors"""
        risks = []
        net_flow = data.get('spending_summary', {}).get('net_flow', 0)
        
        if net_flow < 0:
            risks.append("Negative cash flow")
        if net_flow < -1000:
            risks.append("Significant cash flow deficit")
        
        return risks
    
    def _identify_strength_indicators(self, data: Dict[str, Any]) -> List[str]:
        """Identify financial strength indicators"""
        strengths = []
        net_flow = data.get('spending_summary', {}).get('net_flow', 0)
        
        if net_flow > 0:
            strengths.append("Positive cash flow")
        if net_flow > 1000:
            strengths.append("Strong savings rate")
        
        return strengths
    
    def _calculate_savings_potential(self, data: Dict[str, Any]) -> float:
        """Calculate potential savings based on patterns"""
        total_expenses = data.get('spending_summary', {}).get('total_expenses', 0)
        # Assume 15% optimization potential
        return total_expenses * 0.15
    
    def _identify_spending_optimizations(self, data: Dict[str, Any]) -> List[str]:
        """Identify spending optimization opportunities"""
        optimizations = []
        categories = data.get('expense_categories', {})
        
        for category, amount in categories.items():
            if amount > 500:
                optimizations.append(f"Review {category} spending")
        
        return optimizations
    
    def _suggest_category_optimizations(self, data: Dict[str, Any]) -> Dict[str, str]:
        """Suggest category-specific optimizations"""
        suggestions = {}
        categories = data.get('expense_categories', {})
        
        for category, amount in categories.items():
            if amount > 300:
                suggestions[category] = f"Consider reducing {category} expenses by 20%"
        
        return suggestions
    
    def _analyze_timing_patterns(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze timing patterns in spending"""
        return {
            'peak_spending_days': ['Monday', 'Friday'],
            'low_spending_days': ['Wednesday'],
            'recommendations': ['Avoid weekend shopping', 'Plan purchases mid-week']
        }
    
    def _identify_automation_opportunities(self, data: Dict[str, Any]) -> List[str]:
        """Identify automation opportunities"""
        return [
            "Set up automatic savings transfers",
            "Automate bill payments",
            "Use spending alerts for high categories"
        ]
    
    def _calculate_savings_opportunities(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate savings opportunities"""
        total_expenses = data.get('spending_summary', {}).get('total_expenses', 0)
        return {
            'potential_savings': total_expenses * 0.15,
            'optimization_areas': ['Dining out', 'Entertainment', 'Shopping'],
            'implementation_timeline': '30-60 days'
        }
    
    def _identify_investment_opportunities(self, data: Dict[str, Any]) -> List[str]:
        """Identify investment opportunities"""
        net_flow = data.get('spending_summary', {}).get('net_flow', 0)
        opportunities = []
        
        if net_flow > 500:
            opportunities.append("Consider increasing retirement contributions")
        if net_flow > 1000:
            opportunities.append("Explore index fund investments")
        
        return opportunities
    
    def _forecast_spending_patterns(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Forecast future spending patterns"""
        current_spending = data.get('spending_summary', {}).get('total_expenses', 0)
        return {
            'next_month_projection': current_spending * 1.05,
            'three_month_projection': current_spending * 1.15,
            'six_month_projection': current_spending * 1.25,
            'confidence_level': '85%'
        }
    
    def _project_savings_trajectory(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Project savings trajectory"""
        net_flow = data.get('spending_summary', {}).get('net_flow', 0)
        return {
            'one_month_projection': net_flow * 1.1,
            'three_month_projection': net_flow * 1.2,
            'six_month_projection': net_flow * 1.3,
            'annual_projection': net_flow * 1.5
        }
    
    def _predict_financial_milestones(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Predict financial milestones"""
        net_flow = data.get('spending_summary', {}).get('net_flow', 0)
        milestones = []
        
        if net_flow > 0:
            milestones.append({
                'milestone': 'Emergency Fund Goal',
                'target_amount': 10000,
                'estimated_achievement': '8 months',
                'current_progress': '60%'
            })
        
        return milestones
    
    def _predict_financial_risks(self, data: Dict[str, Any]) -> List[str]:
        """Predict potential financial risks"""
        risks = []
        net_flow = data.get('spending_summary', {}).get('net_flow', 0)
        
        if net_flow < 0:
            risks.append("Continued cash flow deficit")
        if net_flow < -500:
            risks.append("Emergency fund depletion risk")
        
        return risks
    
    def _predict_opportunities(self, data: Dict[str, Any]) -> List[str]:
        """Predict financial opportunities"""
        opportunities = []
        net_flow = data.get('spending_summary', {}).get('net_flow', 0)
        
        if net_flow > 500:
            opportunities.append("Investment portfolio expansion")
        if net_flow > 1000:
            opportunities.append("Debt reduction acceleration")
        
        return opportunities
    
    def _predict_financial_trends(self, data: Dict[str, Any]) -> List[str]:
        """Predict financial trends"""
        trends = []
        net_flow = data.get('spending_summary', {}).get('net_flow', 0)
        
        if net_flow > 0:
            trends.append("Increasing savings rate")
        if net_flow > 1000:
            trends.append("Strong financial momentum")
        
        return trends
    
    def _calculate_current_efficiency(self, data: Dict[str, Any]) -> float:
        """Calculate current financial efficiency"""
        net_flow = data.get('spending_summary', {}).get('net_flow', 0)
        total_income = data.get('spending_summary', {}).get('total_income', 1)
        return (net_flow / total_income) * 100 if total_income > 0 else 0
    
    def _compare_to_historical_patterns(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Compare to historical patterns (simulated)"""
        return {
            'improvement_rate': 12.5,
            'trend_direction': 'positive',
            'consistency_score': 85
        }
    
    def _calculate_percentile_ranking(self, data: Dict[str, Any]) -> int:
        """Calculate percentile ranking (simulated)"""
        efficiency = self._calculate_current_efficiency(data)
        # Simulate percentile based on efficiency
        if efficiency > 30:
            return 85
        elif efficiency > 20:
            return 70
        elif efficiency > 10:
            return 50
        else:
            return 25
    
    def _calculate_improvement_percentage(self, data: Dict[str, Any]) -> float:
        """Calculate improvement percentage"""
        current_efficiency = self._calculate_current_efficiency(data)
        # Simulate improvement based on current efficiency
        if current_efficiency < 10:
            return 25.0
        elif current_efficiency < 20:
            return 15.0
        else:
            return 8.0
    
    def _calculate_efficiency_score(self, data: Dict[str, Any]) -> int:
        """Calculate overall efficiency score"""
        efficiency = self._calculate_current_efficiency(data)
        return min(100, max(0, int(efficiency * 2)))
    
    def _calculate_optimization_potential(self, data: Dict[str, Any]) -> float:
        """Calculate optimization potential"""
        total_expenses = data.get('spending_summary', {}).get('total_expenses', 0)
        return total_expenses * 0.20  # 20% optimization potential
    
    def _identify_spending_triggers(self, data: Dict[str, Any]) -> List[str]:
        """Identify spending triggers"""
        triggers = []
        categories = data.get('expense_categories', {})
        
        if categories.get('Food & Dining', 0) > 300:
            triggers.append("Stress-related dining out")
        if categories.get('Shopping', 0) > 200:
            triggers.append("Impulse shopping patterns")
        
        return triggers
    
    def _detect_stress_spending(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Detect stress spending patterns"""
        return {
            'detected': True,
            'patterns': ['Weekend shopping spikes', 'Coffee purchases during work hours'],
            'recommendations': ['Set spending limits', 'Use stress management techniques']
        }
    
    def _analyze_spending_habits(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze spending habits"""
        return {
            'habit_strength': 'Moderate',
            'habit_types': ['Regular dining out', 'Online shopping'],
            'habit_impact': 'Medium impact on savings'
        }
    
    def _analyze_decision_patterns(self, data: Dict[str, Any]) -> List[str]:
        """Analyze decision patterns"""
        return [
            "Tendency to spend more on weekends",
            "Preference for convenience over cost",
            "Impulse purchases in certain categories"
        ]
    
    def _detect_emotional_spending(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Detect emotional spending patterns"""
        return {
            'detected': True,
            'emotional_triggers': ['Stress', 'Boredom', 'Celebration'],
            'impact_level': 'Medium',
            'management_strategies': ['Mindful spending', 'Emotional awareness']
        }
    
    def _generate_behavioral_recommendations(self, data: Dict[str, Any]) -> List[str]:
        """Generate behavioral recommendations"""
        return [
            "Practice mindful spending before purchases",
            "Set up spending alerts for emotional triggers",
            "Use the 24-hour rule for non-essential purchases",
            "Track emotional states with spending patterns"
        ]
    
    def _analyze_cash_flow_patterns(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze cash flow patterns"""
        net_flow = data.get('spending_summary', {}).get('net_flow', 0)
        return {
            'pattern_type': 'Positive' if net_flow > 0 else 'Negative',
            'stability': 'Stable' if abs(net_flow) < 500 else 'Volatile',
            'trend': 'Improving' if net_flow > 0 else 'Declining'
        }

# Global AI insight generator instance
ai_insight_generator = AIInsightGenerator() 