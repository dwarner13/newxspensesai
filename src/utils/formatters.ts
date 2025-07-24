import { format, parseISO } from 'date-fns';

/**
 * Formats a date string to a readable format
 */
export const formatDate = (dateString: string): string => {
  try {
    // Handle different date formats
    const date = parseISO(dateString);
    return format(date, 'MMM dd, yyyy');
  } catch (error) {
    // Fallback if date parsing fails
    return dateString;
  }
};

/**
 * Formats a currency amount
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Truncates text with ellipsis if it exceeds maxLength
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};