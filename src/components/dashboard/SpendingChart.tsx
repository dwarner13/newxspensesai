import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { Transaction } from '../../types/database.types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface SpendingChartProps {
  transactions: Transaction[];
  type?: 'bar' | 'pie';
}

const SpendingChart = ({ transactions, type = 'bar' }: SpendingChartProps) => {
  const chartData = useMemo(() => {
    const categoryTotals = transactions.reduce((acc, transaction) => {
      if (transaction.category === 'Income') return acc;
      
      const amount = transaction.type === 'Debit' ? transaction.amount : 0;
      acc[transaction.category] = (acc[transaction.category] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);

    const sortedCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const labels = sortedCategories.map(([category]) => category);
    const data = sortedCategories.map(([, amount]) => amount);

    const colors = [
      'rgba(49, 130, 206, 0.8)', // Primary blue
      'rgba(72, 187, 120, 0.8)', // Primary green
      'rgba(237, 137, 54, 0.8)', // Primary orange
      'rgba(128, 90, 213, 0.8)', // Primary purple
      'rgba(245, 101, 101, 0.8)', // Red
    ];

    return {
      labels,
      datasets: [
        {
          label: 'Spending by Category',
          data,
          backgroundColor: colors,
          borderColor: colors.map(color => color.replace('0.8', '1')),
          borderWidth: 1,
        },
      ],
    };
  }, [transactions]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: {
            family: 'Montserrat',
            size: 12,
          },
          color: '#2D3748',
        },
      },
              title: {
          display: true,
          text: 'Top 5 Spending Categories',
          font: {
            family: 'Montserrat',
            size: 16,
            weight: 600,
          },
          color: '#2D3748',
        },
    },
    ...(type === 'bar' && {
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              family: 'Montserrat',
              size: 12,
            },
            color: '#718096',
            callback: (value: number) => {
              return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(value);
            },
          },
          grid: {
            color: '#E2E8F0',
          },
        },
        x: {
          ticks: {
            font: {
              family: 'Montserrat',
              size: 12,
            },
            color: '#718096',
          },
          grid: {
            color: '#E2E8F0',
          },
        },
      },
    }),
  };

  return (
    <div className="stat-card" style={{ height: '400px', width: '100%' }}>
      {type === 'bar' ? (
        <Bar data={chartData} options={options} />
      ) : (
        <Pie data={chartData} options={options} />
      )}
    </div>
  );
};

export default SpendingChart;
