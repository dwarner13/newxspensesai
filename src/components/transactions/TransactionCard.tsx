import React from 'react';
import { FileText, DollarSign, Brain } from 'lucide-react';
import type { Transaction } from '../../types/transactions';

interface TransactionCardProps {
  transaction: Transaction;
  isSelected?: boolean;
}

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, isSelected = false }) => {
  return (
    <div
      className={`bg-white/5 backdrop-blur-sm rounded-xl p-6 hover:bg-white/10 transition-all duration-200 cursor-pointer group ${
        isSelected 
          ? 'ring-2 ring-purple-500 border-2 border-purple-500/60 bg-gradient-to-br from-purple-500/10 to-pink-500/5 shadow-lg shadow-purple-500/20' 
          : 'border border-white/10'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Document Indicator */}
          <div className="flex-shrink-0">
            {transaction.receipt_url ? (
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white/50" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-white text-lg">{transaction.description}</h3>
              {transaction.receipt_url && (
                <div className="flex items-center gap-1 bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
                  <FileText className="w-3 h-3" />
                  Document
                </div>
              )}
              {transaction.confidence && (
                <div className="flex items-center gap-1 bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded-full">
                  <Brain className="w-3 h-3" />
                  AI Processed
                </div>
              )}
            </div>
            <p className="text-sm text-white/70 mb-1">{transaction.category}</p>
            {transaction.merchant && (
              <p className="text-xs text-white/50">{transaction.merchant}</p>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <p className={`font-bold text-xl ${
            transaction.type === 'income' ? 'text-green-400' : 'text-red-400'
          }`}>
            {transaction.type === 'income' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
          </p>
          <p className="text-sm text-white/70">{transaction.date}</p>
          {transaction.receipt_url && (
            <p className="text-xs text-blue-400 mt-1 group-hover:text-blue-300">
              Click to view document →
            </p>
          )}
        </div>
      </div>

      {/* AI Insights for this transaction */}
      {transaction.aiInsights && transaction.aiInsights.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-400">AI Insights</span>
          </div>
          <div className="space-y-1">
            {transaction.aiInsights.map((insight, idx) => (
              <p key={idx} className="text-xs text-white/70">{insight}</p>
            ))}
          </div>
        </div>
      )}
      
      {/* Confidence Score */}
      {transaction.confidence && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 bg-white/10 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${transaction.confidence * 100}%` }}
            />
          </div>
          <span className="text-xs text-white/70">
            {Math.round(transaction.confidence * 100)}% confidence
          </span>
        </div>
      )}
    </div>
  );
};

export default TransactionCard;

