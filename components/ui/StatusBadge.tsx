
import React from 'react';

interface StatusBadgeProps {
  status: string;
}

const statusColorMap: Record<string, { bg: string; text: string }> = {
    // Generic
    Active: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-300' },
    Inactive: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300' },
    
    // Goods Receipt & Goods Issue
    Draft: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300' },
    New: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-300' },
    Picking: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-300' },
    AdjustmentRequested: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-800 dark:text-purple-300' },
    Receiving: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-300' },
    Submitted: { bg: 'bg-indigo-100 dark:bg-indigo-900', text: 'text-indigo-800 dark:text-indigo-300' },
    Completed: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-300' },
    Rejected: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-300' },
    Cancelled: { bg: 'bg-pink-100 dark:bg-pink-900', text: 'text-pink-800 dark:text-pink-300' },
    
    // Default
    default: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { bg, text } = statusColorMap[status] || statusColorMap.default;

  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full inline-block ${bg} ${text}`}
    >
      {status}
    </span>
  );
};
