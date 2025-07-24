import React, { useState } from 'react';
import TransactionList from './TransactionList';

const TransactionListTest = () => {
    const [transactions, setTransactions] = useState([
        {
            id: 1,
            description: 'STARBUCKS COFFEE',
            amount: -5.50,
            date: '2024-01-15',
            category: 'Food & Dining',
            confidence: 0.99
        },
        {
            id: 2,
            description: 'UBER RIDE',
            amount: -25.00,
            date: '2024-01-15',
            category: 'Transportation',
            confidence: 0.95
        },
        {
            id: 3,
            description: 'AMAZON PURCHASE',
            amount: -45.99,
            date: '2024-01-15',
            category: 'Shopping',
            confidence: 0.70
        },
        {
            id: 4,
            description: 'SALARY DEPOSIT',
            amount: 2500.00,
            date: '2024-01-16',
            category: 'Income',
            confidence: 0.98
        },
        {
            id: 5,
            description: 'GROCERY STORE',
            amount: -78.45,
            date: '2024-01-16',
            category: 'Food & Dining',
            confidence: 0.95
        }
    ]);

    const handleCategoryCorrection = (transactionId, newCategory) => {
        setTransactions(prev => prev.map(t => 
            t.id === transactionId
                ? { ...t, category: newCategory, corrected: true }
                : t
        ));
        console.log(`Category corrected for transaction ${transactionId} to ${newCategory}`);
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
                🧪 TransactionList Component Test
            </h2>
            
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-800 text-sm">
                    💡 <strong>Test Instructions:</strong> Click on any category to edit it. 
                    This demonstrates the interactive categorization feature.
                </p>
            </div>

            <TransactionList 
                transactions={transactions}
                onCategoryCorrection={handleCategoryCorrection}
            />

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">📊 Sample Data Used:</h3>
                <p className="text-gray-600 text-sm">
                    This test uses 5 sample transactions with AI categorization. 
                    Try clicking on categories to see the editing interface in action!
                </p>
            </div>
        </div>
    );
};

export default TransactionListTest; 