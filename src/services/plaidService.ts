/**
 * Plaid Bank Integration Service
 * 
 * Connects to real bank accounts for live transaction data
 * Handles account linking, transaction sync, and balance updates
 */

import { Configuration, PlaidApi, PlaidEnvironments, TransactionsGetRequest, AccountsGetRequest } from 'plaid';

export interface PlaidConfig {
  clientId: string;
  secret: string;
  environment: 'sandbox' | 'development' | 'production';
}

export interface BankAccount {
  accountId: string;
  name: string;
  type: 'depository' | 'credit' | 'loan' | 'investment';
  subtype: string;
  balance: {
    available: number | null;
    current: number | null;
    limit: number | null;
  };
  institution: {
    name: string;
    institutionId: string;
  };
  lastUpdated: string;
}

export interface BankTransaction {
  transactionId: string;
  accountId: string;
  amount: number;
  date: string;
  name: string;
  merchantName?: string;
  category: string[];
  subcategory?: string[];
  pending: boolean;
  accountOwner?: string;
  location?: {
    address?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface PlaidLinkResult {
  publicToken: string;
  metadata: {
    institution: {
      name: string;
      institutionId: string;
    };
    accounts: Array<{
      id: string;
      name: string;
      type: string;
      subtype: string;
    }>;
  };
}

class PlaidService {
  private client: PlaidApi;
  private config: PlaidConfig;

  constructor() {
    this.config = {
      clientId: process.env.REACT_APP_PLAID_CLIENT_ID || '',
      secret: process.env.REACT_APP_PLAID_SECRET || '',
      environment: (process.env.REACT_APP_PLAID_ENVIRONMENT as 'sandbox' | 'development' | 'production') || 'sandbox'
    };

    const configuration = new Configuration({
      basePath: this.getEnvironmentUrl(this.config.environment),
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': this.config.clientId,
          'PLAID-SECRET': this.config.secret,
        },
      },
    });

    this.client = new PlaidApi(configuration);
  }

  private getEnvironmentUrl(environment: string): string {
    switch (environment) {
      case 'sandbox':
        return PlaidEnvironments.sandbox;
      case 'development':
        return PlaidEnvironments.development;
      case 'production':
        return PlaidEnvironments.production;
      default:
        return PlaidEnvironments.sandbox;
    }
  }

  /**
   * Exchange public token for access token
   */
  async exchangePublicToken(publicToken: string): Promise<{ accessToken: string; itemId: string }> {
    try {
      const response = await this.client.itemPublicTokenExchange({
        public_token: publicToken,
      });

      return {
        accessToken: response.data.access_token,
        itemId: response.data.item_id,
      };
    } catch (error) {
      console.error('Error exchanging public token:', error);
      throw new Error('Failed to exchange public token');
    }
  }

  /**
   * Get all accounts for a user
   */
  async getAccounts(accessToken: string): Promise<BankAccount[]> {
    try {
      const request: AccountsGetRequest = {
        access_token: accessToken,
      };

      const response = await this.client.accountsGet(request);
      
      return response.data.accounts.map(account => ({
        accountId: account.account_id,
        name: account.name,
        type: account.type as any,
        subtype: account.subtype || '',
        balance: {
          available: account.balances.available,
          current: account.balances.current,
          limit: account.balances.limit,
        },
        institution: {
          name: account.name,
          institutionId: '', // Will be filled from institution data
        },
        lastUpdated: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw new Error('Failed to fetch bank accounts');
    }
  }

  /**
   * Get transactions for a specific account
   */
  async getTransactions(
    accessToken: string,
    startDate: string,
    endDate: string,
    accountIds?: string[]
  ): Promise<BankTransaction[]> {
    try {
      const request: TransactionsGetRequest = {
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        account_ids: accountIds,
        count: 500, // Maximum transactions per request
      };

      const response = await this.client.transactionsGet(request);
      
      return response.data.transactions.map(transaction => ({
        transactionId: transaction.transaction_id,
        accountId: transaction.account_id,
        amount: transaction.amount,
        date: transaction.date,
        name: transaction.name,
        merchantName: transaction.merchant_name,
        category: transaction.category || [],
        subcategory: transaction.subcategory,
        pending: transaction.pending,
        accountOwner: transaction.account_owner,
        location: transaction.location ? {
          address: transaction.location.address,
          city: transaction.location.city,
          region: transaction.location.region,
          postalCode: transaction.location.postal_code,
          country: transaction.location.country,
        } : undefined,
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new Error('Failed to fetch transactions');
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accessToken: string, accountId: string): Promise<number> {
    try {
      const accounts = await this.getAccounts(accessToken);
      const account = accounts.find(acc => acc.accountId === accountId);
      
      if (!account) {
        throw new Error('Account not found');
      }

      return account.balance.current || account.balance.available || 0;
    } catch (error) {
      console.error('Error fetching account balance:', error);
      throw new Error('Failed to fetch account balance');
    }
  }

  /**
   * Create link token for Plaid Link
   */
  async createLinkToken(userId: string): Promise<string> {
    try {
      const response = await this.client.linkTokenCreate({
        user: {
          client_user_id: userId,
        },
        client_name: 'Xspenses AI',
        products: ['transactions', 'auth'],
        country_codes: ['US'],
        language: 'en',
        webhook: `${window.location.origin}/api/plaid/webhook`,
      });

      return response.data.link_token;
    } catch (error) {
      console.error('Error creating link token:', error);
      throw new Error('Failed to create link token');
    }
  }

  /**
   * Update webhook for real-time updates
   */
  async updateWebhook(accessToken: string, webhookUrl: string): Promise<void> {
    try {
      await this.client.itemWebhookUpdate({
        access_token: accessToken,
        webhook: webhookUrl,
      });
    } catch (error) {
      console.error('Error updating webhook:', error);
      throw new Error('Failed to update webhook');
    }
  }

  /**
   * Get institution information
   */
  async getInstitution(institutionId: string): Promise<{ name: string; logo?: string }> {
    try {
      const response = await this.client.institutionsGetById({
        institution_id: institutionId,
        country_codes: ['US'],
      });

      return {
        name: response.data.institution.name,
        logo: response.data.institution.logo,
      };
    } catch (error) {
      console.error('Error fetching institution:', error);
      return { name: 'Unknown Bank' };
    }
  }

  /**
   * Remove item (disconnect bank account)
   */
  async removeItem(accessToken: string): Promise<void> {
    try {
      await this.client.itemRemove({
        access_token: accessToken,
      });
    } catch (error) {
      console.error('Error removing item:', error);
      throw new Error('Failed to remove bank connection');
    }
  }

  /**
   * Check if Plaid is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.clientId && this.config.secret);
  }

  /**
   * Get configuration info
   */
  getConfig(): PlaidConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const plaidService = new PlaidService();

// Export convenience functions
export const createPlaidLinkToken = (userId: string): Promise<string> => {
  return plaidService.createLinkToken(userId);
};

export const exchangePlaidToken = (publicToken: string): Promise<{ accessToken: string; itemId: string }> => {
  return plaidService.exchangePublicToken(publicToken);
};

export const fetchBankAccounts = (accessToken: string): Promise<BankAccount[]> => {
  return plaidService.getAccounts(accessToken);
};

export const fetchBankTransactions = (
  accessToken: string,
  startDate: string,
  endDate: string,
  accountIds?: string[]
): Promise<BankTransaction[]> => {
  return plaidService.getTransactions(accessToken, startDate, endDate, accountIds);
};
