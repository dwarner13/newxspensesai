import { useMemo } from 'react';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Transaction } from '../../types/database.types';

interface MonthlyBreakdownProps {
  transactions: Transaction[];
  categories: string[];
}

interface MonthlyData {
  [key: string]: {
    [category: string]: number;
    total: number;
  };
}

const MonthlyBreakdown = ({ transactions, categories }: MonthlyBreakdownProps) => {
  const monthlyData = useMemo(() => {
    const data: MonthlyData = {};
    
    transactions.forEach(transaction => {
      const monthKey = format(new Date(transaction.date), 'yyyy-MM');
      if (!data[monthKey]) {
        data[monthKey] = {
          total: 0,
          ...categories.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {})
        };
      }
      
      const amount = transaction.type === 'Debit' ? -transaction.amount : transaction.amount;
      data[monthKey][transaction.category] += amount;
      data[monthKey].total += amount;
    });
    
    return Object.entries(data)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12);
  }, [transactions, categories]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="stat-card">
      <h3 className="card-title">Monthly Breakdown</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#F7FAFC' }}>
              <th style={{ 
                padding: '12px 24px', 
                textAlign: 'left', 
                fontSize: '0.75rem', 
                fontWeight: '500', 
                color: '#718096', 
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid #E2E8F0'
              }}>
                Month
              </th>
              {categories.map(category => (
                <th key={category} style={{ 
                  padding: '12px 24px', 
                  textAlign: 'left', 
                  fontSize: '0.75rem', 
                  fontWeight: '500', 
                  color: '#718096', 
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '1px solid #E2E8F0'
                }}>
                  {category}
                </th>
              ))}
              <th style={{ 
                padding: '12px 24px', 
                textAlign: 'left', 
                fontSize: '0.75rem', 
                fontWeight: '500', 
                color: '#718096', 
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid #E2E8F0'
              }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map(([month, data]) => (
              <tr key={month} style={{ 
                borderBottom: '1px solid #E2E8F0',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F7FAFC'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <td style={{ 
                  padding: '16px 24px', 
                  whiteSpace: 'nowrap', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#2D3748' 
                }}>
                  {format(new Date(month), 'MMMM yyyy')}
                </td>
                {categories.map(category => (
                  <td key={category} style={{ 
                    padding: '16px 24px', 
                    whiteSpace: 'nowrap', 
                    fontSize: '0.875rem', 
                    color: '#718096' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {data[category] > 0 ? (
                        <ArrowUp size={16} style={{ color: '#48BB78', marginRight: '4px' }} />
                      ) : data[category] < 0 ? (
                        <ArrowDown size={16} style={{ color: '#F56565', marginRight: '4px' }} />
                      ) : null}
                      {formatCurrency(Math.abs(data[category]))}
                    </div>
                  </td>
                ))}
                <td style={{ 
                  padding: '16px 24px', 
                  whiteSpace: 'nowrap', 
                  fontSize: '0.875rem', 
                  fontWeight: '600',
                  color: data.total >= 0 ? '#48BB78' : '#F56565'
                }}>
                  {formatCurrency(data.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MonthlyBreakdown;
