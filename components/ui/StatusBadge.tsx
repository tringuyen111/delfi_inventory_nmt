
import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { t } = useLanguage();
  const statusStyles: Record<string, string> = {
    // General Statuses
    'Active': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'Inactive': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    
    // Goods Receipt Statuses
    'Draft': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    'New': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'Receiving': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    'Submitted': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'Completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', // for reports
    'Rejected': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    'Cancelled': 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 line-through',
    
    // Goods Issue/Transfer Statuses
    'Picking': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    'AdjustmentRequested': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    'Created': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    'Exporting': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    // FIX: Removed duplicate 'Receiving' key that was causing a compile error.

    // Inventory Count Statuses
    'Counting': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    'Review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',

    // Onhand Detail Statuses
    'Available': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'Allocated': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'Reserved': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'In QC': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',

    // Tracking Types
    'None': 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200',
    'Serial': 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'Lot': 'bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    
    // Default
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };

  const style = statusStyles[status] || statusStyles.default;
  const translationKey = `statuses.${status.replace(/\s+/g, '')}`;

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full inline-block ${style}`}>
      {t(translationKey)}
    </span>
  );
};
