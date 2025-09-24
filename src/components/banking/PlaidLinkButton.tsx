/**
 * Plaid Link Button Component
 * 
 * Handles bank account connection using Plaid Link
 * Provides secure OAuth flow for bank authentication
 */

import React, { useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { motion } from 'framer-motion';
import { Building2, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { plaidService, PlaidLinkResult } from '../../services/plaidService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface PlaidLinkButtonProps {
  onSuccess?: (result: PlaidLinkResult) => void;
  onError?: (error: string) => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const PlaidLinkButton: React.FC<PlaidLinkButtonProps> = ({
  onSuccess,
  onError,
  className = '',
  variant = 'primary',
  size = 'md'
}) => {
  const { user } = useAuth();
  const [linkToken, setLinkToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Generate link token when component mounts
  useEffect(() => {
    const generateLinkToken = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        const token = await plaidService.createLinkToken(user.id);
        setLinkToken(token);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize bank connection';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    generateLinkToken();
  }, [user?.id, onError]);

  // Plaid Link configuration
  const config = {
    token: linkToken,
    onSuccess: async (publicToken: string, metadata: any) => {
      try {
        setIsLoading(true);
        
        // Exchange public token for access token
        const { accessToken, itemId } = await plaidService.exchangePublicToken(publicToken);
        
        // Get account information
        const accounts = await plaidService.getAccounts(accessToken);
        
        const result: PlaidLinkResult = {
          publicToken,
          metadata: {
            institution: metadata.institution,
            accounts: accounts.map(account => ({
              id: account.accountId,
              name: account.name,
              type: account.type,
              subtype: account.subtype,
            }))
          }
        };

        // Save to database (you'll need to implement this)
        await saveBankConnection(accessToken, itemId, accounts);
        
        toast.success(`Connected to ${metadata.institution.name} successfully!`);
        onSuccess?.(result);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect bank account';
        setError(errorMessage);
        onError?.(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    onExit: (err: any, metadata: any) => {
      if (err) {
        const errorMessage = err.error_message || 'Bank connection cancelled';
        setError(errorMessage);
        onError?.(errorMessage);
      }
    },
    onEvent: (eventName: string, metadata: any) => {
      console.log('Plaid Link Event:', eventName, metadata);
    },
  };

  const { open, ready } = usePlaidLink(config);

  // Save bank connection to database
  const saveBankConnection = async (accessToken: string, itemId: string, accounts: any[]) => {
    // This would typically save to your Supabase database
    // For now, we'll just log the data
    console.log('Saving bank connection:', {
      accessToken,
      itemId,
      accounts,
      userId: user?.id
    });
    
    // TODO: Implement Supabase save
    // await supabase.from('bank_connections').insert({
    //   user_id: user.id,
    //   access_token: accessToken,
    //   item_id: itemId,
    //   accounts: accounts,
    //   institution_name: accounts[0]?.institution?.name,
    //   connected_at: new Date().toISOString()
    // });
  };

  // Button styling based on variant and size
  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const variantClasses = {
      primary: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white focus:ring-blue-500',
      secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 focus:ring-gray-500',
      outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500'
    };
    
    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-base',
      lg: 'px-6 py-4 text-lg'
    };
    
    return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  };

  const handleClick = () => {
    if (ready && !isLoading) {
      open();
    }
  };

  if (!plaidService.isConfigured()) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-800">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Plaid not configured</span>
        </div>
        <p className="text-sm text-yellow-700 mt-1">
          Please add your Plaid API credentials to connect bank accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <motion.button
        onClick={handleClick}
        disabled={!ready || isLoading}
        className={getButtonClasses()}
        whileHover={{ scale: ready && !isLoading ? 1.02 : 1 }}
        whileTap={{ scale: ready && !isLoading ? 0.98 : 1 }}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Building2 className="w-5 h-5 mr-2" />
            Connect Bank Account
          </>
        )}
      </motion.button>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-red-600 text-sm"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </motion.div>
      )}

      {/* Security notice */}
      <div className="flex items-start gap-2 text-xs text-gray-600">
        <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Bank-level security</p>
          <p>Your credentials are encrypted and never stored. We use Plaid for secure bank connections.</p>
        </div>
      </div>
    </div>
  );
};

export default PlaidLinkButton;
