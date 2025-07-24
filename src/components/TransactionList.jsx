import React, { useState } from 'react';
import { AIService } from '../services/AIService';

const TransactionList = ({ transactions, onCategoryCorrection }) => {
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [newCategory, setNewCategory] = useState('');
    const [updating, setUpdating] = useState(false);

    const handleCategoryEdit = (transaction) => {
        setEditingTransaction(transaction.id);
        setNewCategory(transaction.category || '');
    };

    const handleCategoryUpdate = async (transaction) => {
        if (!newCategory.trim()) return;
        
        setUpdating(true);
        try {
            await AIService.correctCategory(transaction.id, {
                category: newCategory,
                subcategory: newCategory
            });

            // Update local state
            onCategoryCorrection(transaction.id, newCategory);
            setEditingTransaction(null);
            
        } catch (error) {
            console.error('Category correction failed:', error);
        } finally {
            setUpdating(false);
        }
    };

    const getCategoryEmoji = (category) => {
        const emojiMap = {
            'Food & Dining': '🍔',
            'Transportation': '🚗',
            'Shopping': '🛍️',
            'Entertainment': '🎬',
            'Bills & Utilities': '💡',
            'Income': '💰',
            'Healthcare': '🏥',
            'Travel': '✈️',
            'Education': '📚',
            'Utilities': '💡',
            'Uncategorized': '❓',
            'Other': '📦'
        };
        return emojiMap[category] || '📦';
    };

    const getCategoryColor = (category) => {
        const colors = {
            'Food & Dining': 'bg-orange-100 text-orange-800',
            'Transportation': 'bg-blue-100 text-blue-800',
            'Shopping': 'bg-purple-100 text-purple-800',
            'Entertainment': 'bg-pink-100 text-pink-800',
            'Bills & Utilities': 'bg-gray-100 text-gray-800',
            'Income': 'bg-green-100 text-green-800',
            'Healthcare': 'bg-red-100 text-red-800',
            'Travel': 'bg-indigo-100 text-indigo-800',
            'Education': 'bg-yellow-100 text-yellow-800',
            'Utilities': 'bg-gray-100 text-gray-800',
            'Uncategorized': 'bg-yellow-100 text-yellow-800',
            'Other': 'bg-gray-100 text-gray-800'
        };
        return colors[category] || colors['Other'];
    };

    const categoryOptions = [
        'Food & Dining',
        'Transportation', 
        'Shopping',
        'Entertainment',
        'Bills & Utilities',
        'Income',
        'Healthcare',
        'Travel',
        'Education',
        'Utilities',
        'Other'
    ];

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
                🤖 AI Categorized Transactions ({transactions.length})
            </h3>
            
            <div className="space-y-3">
                {transactions.map((transaction) => (
                    <div key={transaction.id || transaction.description} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex-1">
                                <div className="font-semibold text-gray-900">
                                    {transaction.description}
                                </div>
                                <div className="text-sm text-gray-600">
                                    {new Date(transaction.date).toLocaleDateString()}
                                </div>
                            </div>
                            
                            <div className="text-right">
                                <span className={`font-bold text-lg ${
                                    transaction.amount < 0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                    {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                {editingTransaction === (transaction.id || transaction.description) ? (
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={newCategory}
                                            onChange={(e) => setNewCategory(e.target.value)}
                                            className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="">Select Category</option>
                                            {categoryOptions.map(category => (
                                                <option key={category} value={category}>
                                                    {getCategoryEmoji(category)} {category}
                                                </option>
                                            ))}
                                        </select>
                                        <button 
                                            onClick={() => handleCategoryUpdate(transaction)}
                                            disabled={updating || !newCategory.trim()}
                                            className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 disabled:opacity-50 transition-colors"
                                        >
                                            {updating ? '⏳' : '✅'}
                                        </button>
                                        <button 
                                            onClick={() => setEditingTransaction(null)}
                                            className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
                                        >
                                            ❌
                                        </button>
                                    </div>
                                ) : (
                                    <div 
                                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors ${getCategoryColor(transaction.category)}`}
                                        onClick={() => handleCategoryEdit(transaction)}
                                    >
                                        <span>{getCategoryEmoji(transaction.category)}</span>
                                        <span>{transaction.category || 'Uncategorized'}</span>
                                        <span className="text-xs opacity-60">✏️</span>
                                    </div>
                                )}
                            </div>
                            
                            {transaction.confidence && (
                                <div className="text-xs text-gray-500">
                                    AI: {Math.round(transaction.confidence * 100)}%
                                </div>
                            )}
                        </div>
                        
                        {transaction.corrected && (
                            <div className="mt-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                ✅ Corrected by user - AI will learn from this!
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            {transactions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📄</div>
                    <p>No transactions to display</p>
                    <p className="text-sm">Upload a bank statement to see AI categorization in action!</p>
                </div>
            )}
        </div>
    );
};

export default TransactionList; 