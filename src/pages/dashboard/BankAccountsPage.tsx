/**
 * Bank Accounts Management Page
 * 
 * Displays connected bank accounts, balances, and transaction sync
 * Allows users to connect new accounts and manage existing ones
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield
} from 'lucide-react';
import MobilePageTitle from '../../components/ui/MobilePageTitle';
import PlaidLinkButton from '../../components/banking/PlaidLinkButton';
import { BankAccount, BankTransaction, plaidService } from '../../services/plaidService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface BankConnection {
  id: string;
  accessToken: string;
  itemId: string;
  institutionName: string;
  accounts: BankAccount[];
  connectedAt: string;
  lastSync: string;
  status: 'active' | 'error' | 'syncing';
}

const BankAccountsPage: React.FC = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBalances, setShowBalances] = useState(true);
  const [syncingConnection, setSyncingConnection] = useState<string | null>(null);

  // Mock data for demonstration
  useEffect(() => {
    const loadConnections = async () => {
      setIsLoading(true);
      
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock bank connections data
      const mockConnections: BankConnection[] = [
        {
          id: '1',
          accessToken: 'mock-token-1',
          itemId: 'mock-item-1',
          institutionName: 'Chase Bank',
          connectedAt: '2024-01-15T10:30:00Z',
          lastSync: '2024-01-20T14:22:00Z',
          status: 'active',
          accounts: [
            {
              accountId: 'chase-checking',
              name: 'Chase Total Checking',
              type: 'depository',
              subtype: 'checking',
              balance: {
                available: 2450.75,
                current: 2450.75,
                limit: null
              },
              institution: {
                name: 'Chase Bank',
                institutionId: 'chase'
              },
              lastUpdated: '2024-01-20T14:22:00Z'
            },
            {
              accountId: 'chase-savings',
              name: 'Chase Savings',
              type: 'depository',
              subtype: 'savings',
              balance: {
                available: 15000.00,
                current: 15000.00,
                limit: null
              },
              institution: {
                name: 'Chase Bank',
                institutionId: 'chase'
              },
              lastUpdated: '2024-01-20T14:22:00Z'
            }
          ]
        },
        {
          id: '2',
          accessToken: 'mock-token-2',
          itemId: 'mock-item-2',
          institutionName: 'American Express',
          connectedAt: '2024-01-10T09:15:00Z',
          lastSync: '2024-01-20T12:45:00Z',
          status: 'active',
          accounts: [
            {
              accountId: 'amex-gold',
              name: 'American Express Gold Card',
              type: 'credit',
              subtype: 'credit card',
              balance: {
                available: 5000.00,
                current: 1250.50,
                limit: 5000.00
              },
              institution: {
                name: 'American Express',
                institutionId: 'amex'
              },
              lastUpdated: '2024-01-20T12:45:00Z'
            }
          ]
        }
      ];
      
      setConnections(mockConnections);
      setIsLoading(false);
    };

    loadConnections();
  }, []);

  const handleBankConnectionSuccess = (result: any) => {
    console.log('Bank connection successful:', result);
    toast.success(`Connected to ${result.metadata.institution.name} successfully!`);
    
    // Refresh connections list
    // In a real app, you'd reload from the database
  };

  const handleBankConnectionError = (error: string) => {
    console.error('Bank connection error:', error);
    toast.error(`Failed to connect bank account: ${error}`);
  };

  const syncAccount = async (connectionId: string) => {
    setSyncingConnection(connectionId);
    
    try {
      // Simulate sync delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update last sync time
      setConnections(prev => prev.map(conn => 
        conn.id === connectionId 
          ? { ...conn, lastSync: new Date().toISOString() }
          : conn
      ));
      
      toast.success('Account synced successfully!');
    } catch (error) {
      toast.error('Failed to sync account');
    } finally {
      setSyncingConnection(null);
    }
  };

  const removeConnection = async (connectionId: string) => {
    if (window.confirm('Are you sure you want to remove this bank connection?')) {
      try {
        setConnections(prev => prev.filter(conn => conn.id !== connectionId));
        toast.success('Bank connection removed');
      } catch (error) {
        toast.error('Failed to remove bank connection');
      }
    }
  };

  const formatCurrency = (amount: number | null): string => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getAccountIcon = (type: string, subtype: string) => {
    if (type === 'credit') return <CreditCard className="w-5 h-5" />;
    if (subtype === 'checking') return <Building2 className="w-5 h-5" />;
    if (subtype === 'savings') return <TrendingUp className="w-5 h-5" />;
    return <Building2 className="w-5 h-5" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'syncing':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="w-full pt-20 px-4 sm:px-6 lg:px-8">
        <MobilePageTitle 
          title="Bank Accounts" 
          subtitle="Connect and manage your bank accounts"
        />
        
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-white/70">Loading bank accounts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pt-20 px-4 sm:px-6 lg:px-8">
      <MobilePageTitle 
        title="Bank Accounts" 
        subtitle="Connect and manage your bank accounts"
      />

      {/* Header with balance toggle */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">
            Connected Accounts
          </h2>
          <p className="text-white/60 text-sm">
            {connections.length} bank connection{connections.length !== 1 ? 's' : ''} • 
            {connections.reduce((total, conn) => total + conn.accounts.length, 0)} account{connections.reduce((total, conn) => total + conn.accounts.length, 0) !== 1 ? 's' : ''}
          </p>
        </div>
        
        <button
          onClick={() => setShowBalances(!showBalances)}
          className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          {showBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="text-sm">{showBalances ? 'Hide' : 'Show'} Balances</span>
        </button>
      </div>

      {/* Connect new account */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Connect New Bank Account</h3>
              <p className="text-white/70 text-sm">Securely link your bank accounts to sync transactions</p>
            </div>
          </div>
          
          <PlaidLinkButton
            onSuccess={handleBankConnectionSuccess}
            onError={handleBankConnectionError}
            variant="primary"
            size="md"
          />
        </div>
      </motion.div>

      {/* Bank connections */}
      <div className="space-y-4">
        {connections.map((connection, index) => (
          <motion.div
            key={connection.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
          >
            {/* Connection header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{connection.institutionName}</h3>
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    {getStatusIcon(connection.status)}
                    <span>Connected {new Date(connection.connectedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => syncAccount(connection.id)}
                  disabled={syncingConnection === connection.id}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncingConnection === connection.id ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => removeConnection(connection.id)}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Accounts */}
            <div className="space-y-3">
              {connection.accounts.map((account) => (
                <div
                  key={account.accountId}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-blue-400">
                      {getAccountIcon(account.type, account.subtype)}
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{account.name}</h4>
                      <p className="text-sm text-white/70 capitalize">
                        {account.subtype} • {account.type}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {showBalances ? (
                      <div>
                        <p className="font-semibold text-white">
                          {formatCurrency(account.balance.current)}
                        </p>
                        {account.balance.limit && (
                          <p className="text-sm text-white/70">
                            Limit: {formatCurrency(account.balance.limit)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <div className="w-8 h-2 bg-white/20 rounded"></div>
                        <div className="w-8 h-2 bg-white/20 rounded"></div>
                        <div className="w-8 h-2 bg-white/20 rounded"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Last sync info */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>Bank-level security</span>
                </div>
                <span>Last synced: {new Date(connection.lastSync).toLocaleString()}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty state */}
      {connections.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white/50" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Bank Accounts Connected</h3>
          <p className="text-white/70 mb-6">Connect your bank accounts to start tracking transactions automatically</p>
          
          <PlaidLinkButton
            onSuccess={handleBankConnectionSuccess}
            onError={handleBankConnectionError}
            variant="primary"
            size="lg"
          />
        </motion.div>
      )}
    </div>
  );
};

export default BankAccountsPage;
