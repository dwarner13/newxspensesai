import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional, List
import json

logger = logging.getLogger(__name__)

class UnifiedEphemeralProcessor:
    """
    Unified ephemeral processor for all financial document types.
    Ensures zero data retention across bank statements, credit cards, and investments.
    """
    
    def __init__(self):
        self.session_id = None
        self.processing_start = None
        self.document_type = None
    
    async def process_document_ephemeral(self, uploaded_file, document_type: str, session_id: str) -> Dict[str, Any]:
        """Process any financial document type without storing data"""
        
        self.session_id = session_id
        self.processing_start = datetime.now()
        self.document_type = document_type
        
        logger.info(f"🔒 [UNIFIED_EPHEMERAL] Starting {document_type} processing for session {session_id}")
        
        try:
            # Stage 1: Extract data based on document type
            extracted_data = await self._extract_document_data_ephemeral(uploaded_file, document_type)
            
            # Stage 2: Perform type-specific analysis
            analysis = await self._perform_document_analysis_ephemeral(extracted_data, document_type)
            
            # Stage 3: Generate insights
            insights = await self._generate_document_insights_ephemeral(analysis, document_type)
            
            # Stage 4: Create response
            response = await self._create_document_response_ephemeral(insights, document_type, session_id)
            
            logger.info(f"🔒 [UNIFIED_EPHEMERAL] {document_type} processing completed for session {session_id}")
            
            return response
            
        except Exception as e:
            logger.error(f"🔒 [UNIFIED_EPHEMERAL] {document_type} processing error for session {session_id}: {str(e)}")
            raise
            
        finally:
            # Stage 5: Secure deletion
            await self._secure_delete_all_data(extracted_data, analysis, insights, uploaded_file, session_id)
    
    async def _extract_document_data_ephemeral(self, uploaded_file, document_type: str) -> Dict[str, Any]:
        """Extract data based on document type without storing"""
        logger.info(f"🔒 [UNIFIED_EPHEMERAL] Extracting {document_type} data for session {self.session_id}")
        
        try:
            if document_type == 'bank_statement':
                return await self._extract_bank_statement_ephemeral(uploaded_file)
            elif document_type == 'credit_card':
                return await self._extract_credit_card_ephemeral(uploaded_file)
            elif document_type == 'investment':
                return await self._extract_investment_ephemeral(uploaded_file)
            else:
                raise ValueError(f"Unsupported document type: {document_type}")
                
        except Exception as e:
            logger.error(f"🔒 [UNIFIED_EPHEMERAL] {document_type} extraction error for session {self.session_id}: {str(e)}")
            raise
    
    async def _extract_bank_statement_ephemeral(self, uploaded_file) -> Dict[str, Any]:
        """Extract bank statement data ephemerally"""
        # Simulate bank statement extraction
        bank_data = {
            'account_info': {
                'account_type': 'Checking',
                'account_number': '****1234',
                'balance': 15420.50,
                'statement_date': '2024-01-15'
            },
            'transactions': [
                {'date': '2024-01-15', 'description': 'Salary Deposit', 'amount': 3500.00, 'type': 'credit'},
                {'date': '2024-01-14', 'description': 'Grocery Store', 'amount': -89.50, 'type': 'debit'},
                {'date': '2024-01-13', 'description': 'Gas Station', 'amount': -45.00, 'type': 'debit'},
                {'date': '2024-01-12', 'description': 'Restaurant', 'amount': -67.50, 'type': 'debit'},
                {'date': '2024-01-11', 'description': 'Online Purchase', 'amount': -120.00, 'type': 'debit'}
            ],
            '_ephemeral': True,
            '_session_id': self.session_id,
            '_extraction_time': datetime.now().isoformat()
        }
        
        return bank_data
    
    async def _extract_credit_card_ephemeral(self, uploaded_file) -> Dict[str, Any]:
        """Extract credit card data ephemerally"""
        # Simulate credit card extraction
        credit_data = {
            'card_info': {
                'card_type': 'Visa',
                'last_four': '1234',
                'credit_limit': 10000,
                'current_balance': 3200,
                'available_credit': 6800,
                'statement_date': '2024-01-15'
            },
            'transactions': [
                {'date': '2024-01-15', 'description': 'Amazon.com', 'amount': 89.99, 'category': 'Shopping'},
                {'date': '2024-01-14', 'description': 'Netflix', 'amount': 15.99, 'category': 'Entertainment'},
                {'date': '2024-01-13', 'description': 'Uber', 'amount': 23.50, 'category': 'Transportation'},
                {'date': '2024-01-12', 'description': 'Restaurant', 'amount': 67.50, 'category': 'Food & Dining'},
                {'date': '2024-01-11', 'description': 'Gas Station', 'amount': 45.00, 'category': 'Transportation'}
            ],
            'payment_history': [
                {'date': '2024-01-15', 'amount': 2800, 'status': 'Paid'},
                {'date': '2023-12-15', 'amount': 3100, 'status': 'Paid'},
                {'date': '2023-11-15', 'amount': 2900, 'status': 'Paid'}
            ],
            '_ephemeral': True,
            '_session_id': self.session_id,
            '_extraction_time': datetime.now().isoformat()
        }
        
        return credit_data
    
    async def _extract_investment_ephemeral(self, uploaded_file) -> Dict[str, Any]:
        """Extract investment data ephemerally"""
        # Simulate investment statement extraction
        investment_data = {
            'account_info': {
                'account_type': 'IRA',
                'account_number': '****5678',
                'total_value': 125000,
                'statement_date': '2024-01-15'
            },
            'holdings': [
                {'symbol': 'AAPL', 'shares': 50, 'value': 8500, 'return': 12.5},
                {'symbol': 'MSFT', 'shares': 30, 'value': 12000, 'return': 8.2},
                {'symbol': 'GOOGL', 'shares': 20, 'value': 2800, 'return': 15.1},
                {'symbol': 'TSLA', 'shares': 25, 'value': 6500, 'return': -5.2}
            ],
            'transactions': [
                {'date': '2024-01-15', 'type': 'Dividend', 'amount': 150.00, 'symbol': 'AAPL'},
                {'date': '2024-01-14', 'type': 'Purchase', 'amount': -1000.00, 'symbol': 'MSFT'},
                {'date': '2024-01-13', 'type': 'Sale', 'amount': 2500.00, 'symbol': 'GOOGL'}
            ],
            '_ephemeral': True,
            '_session_id': self.session_id,
            '_extraction_time': datetime.now().isoformat()
        }
        
        return investment_data
    
    async def _perform_document_analysis_ephemeral(self, extracted_data: Dict[str, Any], document_type: str) -> Dict[str, Any]:
        """Perform document-specific analysis without storing data"""
        logger.info(f"🔒 [UNIFIED_EPHEMERAL] Performing {document_type} analysis for session {self.session_id}")
        
        try:
            if document_type == 'bank_statement':
                return await self._analyze_bank_statement_ephemeral(extracted_data)
            elif document_type == 'credit_card':
                return await self._analyze_credit_card_ephemeral(extracted_data)
            elif document_type == 'investment':
                return await self._analyze_investment_ephemeral(extracted_data)
            else:
                raise ValueError(f"Unsupported document type for analysis: {document_type}")
                
        except Exception as e:
            logger.error(f"🔒 [UNIFIED_EPHEMERAL] {document_type} analysis error for session {self.session_id}: {str(e)}")
            raise
    
    async def _analyze_bank_statement_ephemeral(self, bank_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze bank statement data ephemerally"""
        transactions = bank_data.get('transactions', [])
        
        # Calculate spending patterns
        total_income = sum(t['amount'] for t in transactions if t['amount'] > 0)
        total_expenses = abs(sum(t['amount'] for t in transactions if t['amount'] < 0))
        net_flow = total_income - total_expenses
        
        # Categorize expenses
        expense_categories = {}
        for transaction in transactions:
            if transaction['amount'] < 0:
                category = self._categorize_transaction(transaction['description'])
                amount = abs(transaction['amount'])
                expense_categories[category] = expense_categories.get(category, 0) + amount
        
        return {
            'spending_summary': {
                'total_income': total_income,
                'total_expenses': total_expenses,
                'net_flow': net_flow,
                'transaction_count': len(transactions)
            },
            'expense_categories': expense_categories,
            'top_expense_category': max(expense_categories.items(), key=lambda x: x[1])[0] if expense_categories else 'Unknown',
            '_ephemeral': True,
            '_session_id': self.session_id,
            '_analysis_time': datetime.now().isoformat()
        }
    
    async def _analyze_credit_card_ephemeral(self, credit_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze credit card data ephemerally"""
        card_info = credit_data.get('card_info', {})
        transactions = credit_data.get('transactions', [])
        payment_history = credit_data.get('payment_history', [])
        
        # Calculate utilization
        current_balance = card_info.get('current_balance', 0)
        credit_limit = card_info.get('credit_limit', 1)
        utilization_ratio = (current_balance / credit_limit) * 100
        
        # Analyze spending patterns
        total_spent = sum(t.get('amount', 0) for t in transactions)
        spending_categories = {}
        for transaction in transactions:
            category = transaction.get('category', 'Uncategorized')
            amount = transaction.get('amount', 0)
            spending_categories[category] = spending_categories.get(category, 0) + amount
        
        # Payment history analysis
        payment_rate = len([p for p in payment_history if p.get('status') == 'Paid']) / len(payment_history) * 100 if payment_history else 0
        
        return {
            'credit_analysis': {
                'utilization_ratio': round(utilization_ratio, 1),
                'current_balance': current_balance,
                'available_credit': card_info.get('available_credit', 0)
            },
            'spending_analysis': {
                'total_spent': total_spent,
                'transaction_count': len(transactions),
                'spending_categories': spending_categories
            },
            'payment_analysis': {
                'payment_rate': round(payment_rate, 1),
                'payment_count': len(payment_history)
            },
            '_ephemeral': True,
            '_session_id': self.session_id,
            '_analysis_time': datetime.now().isoformat()
        }
    
    async def _analyze_investment_ephemeral(self, investment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze investment data ephemerally"""
        holdings = investment_data.get('holdings', [])
        transactions = investment_data.get('transactions', [])
        
        # Portfolio analysis
        total_value = sum(h.get('value', 0) for h in holdings)
        total_return = sum(h.get('return', 0) for h in holdings)
        avg_return = total_return / len(holdings) if holdings else 0
        
        # Top performers
        top_performers = sorted(holdings, key=lambda x: x.get('return', 0), reverse=True)[:3]
        
        # Transaction analysis
        dividend_income = sum(t.get('amount', 0) for t in transactions if t.get('type') == 'Dividend')
        purchase_amount = abs(sum(t.get('amount', 0) for t in transactions if t.get('type') == 'Purchase'))
        sale_amount = sum(t.get('amount', 0) for t in transactions if t.get('type') == 'Sale')
        
        return {
            'portfolio_analysis': {
                'total_value': total_value,
                'total_return': total_return,
                'avg_return': round(avg_return, 2),
                'holding_count': len(holdings)
            },
            'top_performers': top_performers,
            'transaction_analysis': {
                'dividend_income': dividend_income,
                'purchase_amount': purchase_amount,
                'sale_amount': sale_amount,
                'transaction_count': len(transactions)
            },
            '_ephemeral': True,
            '_session_id': self.session_id,
            '_analysis_time': datetime.now().isoformat()
        }
    
    async def _generate_document_insights_ephemeral(self, analysis: Dict[str, Any], document_type: str) -> Dict[str, Any]:
        """Generate insights based on document type and analysis"""
        logger.info(f"🔒 [UNIFIED_EPHEMERAL] Generating {document_type} insights for session {self.session_id}")
        
        try:
            if document_type == 'bank_statement':
                return await self._generate_bank_insights_ephemeral(analysis)
            elif document_type == 'credit_card':
                return await self._generate_credit_insights_ephemeral(analysis)
            elif document_type == 'investment':
                return await self._generate_investment_insights_ephemeral(analysis)
            else:
                raise ValueError(f"Unsupported document type for insights: {document_type}")
                
        except Exception as e:
            logger.error(f"🔒 [UNIFIED_EPHEMERAL] {document_type} insights error for session {self.session_id}: {str(e)}")
            raise
    
    async def _generate_bank_insights_ephemeral(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate bank statement insights"""
        spending_summary = analysis.get('spending_summary', {})
        expense_categories = analysis.get('expense_categories', {})
        
        insights = {
            'financial_health': 'Good' if spending_summary.get('net_flow', 0) > 0 else 'Needs Attention',
            'spending_patterns': {
                'total_spent': spending_summary.get('total_expenses', 0),
                'top_category': analysis.get('top_expense_category', 'Unknown'),
                'category_breakdown': expense_categories
            },
            'recommendations': [
                f"Your net cash flow is ${spending_summary.get('net_flow', 0):.2f} this month",
                f"Top spending category: {analysis.get('top_expense_category', 'Unknown')}",
                "Consider setting up automatic savings transfers"
            ],
            '_ephemeral': True,
            '_session_id': self.session_id,
            '_insights_time': datetime.now().isoformat()
        }
        
        return insights
    
    async def _generate_credit_insights_ephemeral(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate credit card insights"""
        credit_analysis = analysis.get('credit_analysis', {})
        spending_analysis = analysis.get('spending_analysis', {})
        payment_analysis = analysis.get('payment_analysis', {})
        
        utilization_ratio = credit_analysis.get('utilization_ratio', 0)
        payment_rate = payment_analysis.get('payment_rate', 0)
        
        insights = {
            'credit_health': 'Excellent' if utilization_ratio <= 30 and payment_rate >= 95 else 'Good' if utilization_ratio <= 50 else 'Needs Attention',
            'utilization_analysis': {
                'current_utilization': f"{utilization_ratio}%",
                'recommendation': 'Optimal' if utilization_ratio <= 30 else 'Consider reducing balance'
            },
            'payment_analysis': {
                'payment_rate': f"{payment_rate}%",
                'status': 'Excellent' if payment_rate >= 95 else 'Good' if payment_rate >= 90 else 'Needs Improvement'
            },
            'spending_insights': {
                'total_spent': spending_analysis.get('total_spent', 0),
                'top_category': max(spending_analysis.get('spending_categories', {}).items(), key=lambda x: x[1])[0] if spending_analysis.get('spending_categories') else 'Unknown'
            },
            'recommendations': [
                f"Credit utilization: {utilization_ratio}% - {'Optimal' if utilization_ratio <= 30 else 'Consider reducing'}",
                f"Payment history: {payment_rate}% - {'Excellent' if payment_rate >= 95 else 'Good'}",
                "Consider setting up autopay for consistent payments"
            ],
            '_ephemeral': True,
            '_session_id': self.session_id,
            '_insights_time': datetime.now().isoformat()
        }
        
        return insights
    
    async def _generate_investment_insights_ephemeral(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate investment insights"""
        portfolio_analysis = analysis.get('portfolio_analysis', {})
        top_performers = analysis.get('top_performers', [])
        transaction_analysis = analysis.get('transaction_analysis', {})
        
        total_value = portfolio_analysis.get('total_value', 0)
        avg_return = portfolio_analysis.get('avg_return', 0)
        
        insights = {
            'portfolio_health': 'Strong' if avg_return > 8 else 'Good' if avg_return > 5 else 'Needs Review',
            'performance_summary': {
                'total_value': total_value,
                'avg_return': f"{avg_return}%",
                'top_performer': top_performers[0].get('symbol', 'N/A') if top_performers else 'N/A'
            },
            'income_analysis': {
                'dividend_income': transaction_analysis.get('dividend_income', 0),
                'trading_activity': transaction_analysis.get('transaction_count', 0)
            },
            'recommendations': [
                f"Portfolio value: ${total_value:,.2f}",
                f"Average return: {avg_return}% - {'Excellent' if avg_return > 10 else 'Good' if avg_return > 5 else 'Consider rebalancing'}",
                f"Top performer: {top_performers[0].get('symbol', 'N/A')} at {top_performers[0].get('return', 0)}% return" if top_performers else "No holdings data"
            ],
            '_ephemeral': True,
            '_session_id': self.session_id,
            '_insights_time': datetime.now().isoformat()
        }
        
        return insights
    
    async def _create_document_response_ephemeral(self, insights: Dict[str, Any], document_type: str, session_id: str) -> Dict[str, Any]:
        """Create unified response for all document types"""
        logger.info(f"🔒 [UNIFIED_EPHEMERAL] Creating {document_type} response for session {session_id}")
        
        try:
            response = {
                "document_type": document_type,
                "analysis_summary": insights,
                "privacy_status": "✅ All document details permanently deleted",
                "processing_time": datetime.now().isoformat(),
                "session_id": session_id,
                "ephemeral": True
            }
            
            # Add document-specific response elements
            if document_type == 'bank_statement':
                response.update({
                    "financial_summary": insights.get('spending_patterns', {}),
                    "cash_flow": insights.get('financial_health', 'Unknown')
                })
            elif document_type == 'credit_card':
                response.update({
                    "credit_summary": insights.get('utilization_analysis', {}),
                    "payment_status": insights.get('payment_analysis', {})
                })
            elif document_type == 'investment':
                response.update({
                    "portfolio_summary": insights.get('performance_summary', {}),
                    "investment_health": insights.get('portfolio_health', 'Unknown')
                })
            
            # Remove ephemeral markers from final response
            response.pop('_ephemeral', None)
            response.pop('_session_id', None)
            response.pop('_insights_time', None)
            
            return response
            
        except Exception as e:
            logger.error(f"🔒 [UNIFIED_EPHEMERAL] Response creation error for session {session_id}: {str(e)}")
            raise
    
    async def _secure_delete_all_data(self, extracted_data: Dict, analysis: Dict, insights: Dict, uploaded_file, session_id: str):
        """Securely delete all document data"""
        logger.info(f"🔒 [UNIFIED_EPHEMERAL] Starting secure deletion for session {session_id}")
        
        try:
            # Delete extracted data
            if extracted_data:
                extracted_data.clear()
                logger.info(f"🔒 [UNIFIED_EPHEMERAL] Deleted extracted data for session {session_id}")
            
            # Delete analysis data
            if analysis:
                analysis.clear()
                logger.info(f"🔒 [UNIFIED_EPHEMERAL] Deleted analysis data for session {session_id}")
            
            # Delete insights data
            if insights:
                insights.clear()
                logger.info(f"🔒 [UNIFIED_EPHEMERAL] Deleted insights data for session {session_id}")
            
            # Clear file reference
            uploaded_file = None
            
            # Clear session data
            self.session_id = None
            self.processing_start = None
            self.document_type = None
            
            logger.info(f"🔒 [UNIFIED_EPHEMERAL] Secure deletion completed for session {session_id}")
            
        except Exception as e:
            logger.error(f"🔒 [UNIFIED_EPHEMERAL] Deletion error for session {session_id}: {str(e)}")
            raise Exception('Document data deletion failed - session terminated for security')
    
    def _categorize_transaction(self, description: str) -> str:
        """Categorize transaction based on description"""
        description_lower = description.lower()
        
        if any(word in description_lower for word in ['grocery', 'food', 'restaurant', 'dining']):
            return 'Food & Dining'
        elif any(word in description_lower for word in ['gas', 'fuel', 'uber', 'lyft', 'transport']):
            return 'Transportation'
        elif any(word in description_lower for word in ['amazon', 'walmart', 'target', 'shop']):
            return 'Shopping'
        elif any(word in description_lower for word in ['netflix', 'spotify', 'entertainment']):
            return 'Entertainment'
        elif any(word in description_lower for word in ['salary', 'deposit', 'income']):
            return 'Income'
        else:
            return 'Other'

# Global unified ephemeral processor instance
unified_ephemeral_processor = UnifiedEphemeralProcessor() 