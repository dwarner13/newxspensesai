import MD5 from 'crypto-js/md5';

/**
 * Generates a unique hash ID for a transaction based on its properties
 * to prevent duplicate entries
 */
export const generateTransactionHash = (transaction: {
  date?: string; 
  description?: string; 
  amount?: number;
  type?: string;
}) => {
  const { date, description, amount, type } = transaction;
  const hashString = `${date || ''}-${description || ''}-${amount || 0}-${type || ''}`;
  return MD5(hashString).toString();
};